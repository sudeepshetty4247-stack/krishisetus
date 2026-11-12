"""Direct-horizon forecasting. No random split, interpolation or future features."""
import hashlib
import json
import uuid
from datetime import timedelta
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from statsmodels.tsa.arima.model import ARIMA
from xgboost import XGBRegressor
from data_engine.storage import utcnow

LAGS=(1,3,7,14,30,90)

def features(series,origin):
    """origin is the first unknown day: all prices are strictly before origin."""
    if origin<90: raise ValueError('90 observed history days required')
    past=np.asarray(series.iloc[:origin],dtype=float)
    timestamp=series.index[origin-1]+pd.Timedelta(days=1)
    values=[past[-lag] for lag in LAGS]
    for window in (7,14,30):
        values.extend([float(np.mean(past[-window:])),float(np.median(past[-window:])),float(np.std(past[-window:]))])
    values.extend([timestamp.month,int(timestamp.isocalendar().week),timestamp.dayofweek,np.sin(2*np.pi*timestamp.month/12),np.cos(2*np.pi*timestamp.month/12)])
    return np.asarray(values,dtype=float)

FEATURE_NAMES=[f'lag_{lag}' for lag in LAGS]+[f'{stat}_{w}' for w in (7,14,30) for stat in ('mean','median','std')]+['month','week','weekday','month_sin','month_cos']

def supervised(series,horizon):
    origins=np.arange(90,len(series)-horizon+1)
    x=np.asarray([features(series,int(i)) for i in origins])
    y=np.asarray([series.iloc[int(i)+horizon-1] for i in origins],dtype=float)
    targets=np.asarray([int(i)+horizon-1 for i in origins])
    return x,y,origins,targets

def metrics(actual,predicted):
    a,p=np.asarray(actual),np.asarray(predicted)
    smape=float(np.mean(200*np.abs(p-a)/np.maximum(np.abs(a)+np.abs(p),1e-8)))
    return {'MAE':float(mean_absolute_error(a,p)),'RMSE':float(np.sqrt(mean_squared_error(a,p))),'sMAPE':smape,'MAPE':float(np.mean(np.abs((a-p)/np.maximum(np.abs(a),1e-8)))*100),'R2':float(r2_score(a,p)) if len(a)>1 and np.var(a)>0 else None,'n':len(a)}

def estimators():
    return {'Random Forest':RandomForestRegressor(n_estimators=100,max_depth=8,min_samples_leaf=3,random_state=42,n_jobs=1),'XGBoost':XGBRegressor(n_estimators=100,max_depth=3,learning_rate=.05,subsample=1,colsample_bytree=1,random_state=42,n_jobs=1)}

def series_from_store(store,group):
    if not all(group.get(k) for k in ('state','district','market','commodity','variety','source')): raise ValueError('Choose state, district, market, commodity, variety and source independently')
    data=store.observations(group,limit=100000)['records']
    if not data: raise ValueError('No observations for the requested source-specific series')
    frame=pd.DataFrame(data).sort_values('date')
    if frame['date'].duplicated().any(): raise ValueError('Ambiguous duplicate source dates')
    series=pd.Series(frame['modal'].astype(float).to_numpy(),index=pd.to_datetime(frame['date']))
    # Calendar horizons must not masquerade as observation-count horizons.
    last_gap=np.where(np.diff(series.index.values).astype('timedelta64[D]').astype(int)!=1)[0]
    if len(last_gap): series=series.iloc[int(last_gap[-1])+1:]
    if len(series)<240: raise ValueError(f'Unsupported series: only {len(series)} consecutive daily observations at the end. Require at least 240; missing reports are not imputed or zero-filled.')
    return series

def baseline(series,origins,horizon):
    # Last-observation naive is suitable even when seasonality is not established.
    return np.asarray([series.iloc[int(i)-1] for i in origins])

def arima_predictions(series,origins,horizon):
    result=[]
    for origin in origins:
        fit=ARIMA(np.asarray(series.iloc[max(0,int(origin)-180):int(origin)],dtype=float),order=(1,1,0)).fit()
        prediction=float(fit.forecast(horizon)[-1])
        if not np.isfinite(prediction) or prediction<=0: raise ValueError('ARIMA produced an invalid price')
        result.append(prediction)
    return np.asarray(result)

def train(store,group,horizons=(7,14,30)):
    series=series_from_store(store,group)
    n=len(series); validation_start=int(n*.65); test_start=int(n*.82)
    version=hashlib.sha256(series.to_json(date_format='iso').encode()).hexdigest()
    run_id=uuid.uuid4().hex
    report={'id':run_id,'group':group,'dataset_version':version,'created_at':utcnow(),'observations':n,'period':[series.index[0].date().isoformat(),series.index[-1].date().isoformat()],'methodology':'Direct H-day endpoint models; chronological train/validation/final test. At every origin only earlier reports enter features. Models fixed before validation/test; ARIMA rolling refits use past prices only. Overlapping H-day errors are dependent; empirical intervals are not formal guarantees. Missing daily reports truncate the supported sequence. Source/market/commodity/variety are never pooled.','horizons':{}}
    artifact={'group':group,'series':series,'horizons':{}}
    for h in horizons:
        if h not in (7,14,30): raise ValueError('Supported candidate horizons are 7, 14 and 30 days')
        x,y,origins,targets=supervised(series,h)
        train_mask=targets<validation_start
        val_mask=(origins>=validation_start)&(targets<test_start)
        test_mask=origins>=test_start
        if min(int(train_mask.sum()),int(val_mask.sum()),int(test_mask.sum()))<30:
            report['horizons'][str(h)]={'status':'unsupported','reason':'At least 30 forecast origins per split are required; overlapping targets are dependent.'}; continue
        val_predictions={'Naive baseline':baseline(series,origins[val_mask],h)}; failures={}
        models=estimators()
        for name,model in models.items():
            try:
                model.fit(x[train_mask],y[train_mask]);pred=model.predict(x[val_mask])
                if not np.all(np.isfinite(pred)) or np.any(pred<=0): raise ValueError('Invalid validation prices')
                val_predictions[name]=pred
            except Exception as exc: failures[name]=type(exc).__name__
        try: val_predictions['ARIMA']=arima_predictions(series,origins[val_mask],h)
        except Exception as exc: failures['ARIMA']=type(exc).__name__
        validation={name:metrics(y[val_mask],pred) for name,pred in val_predictions.items()}
        selected=min(validation,key=lambda name:(validation[name]['MAE'],validation[name]['RMSE']))
        # Selection is frozen BEFORE final test predictions are generated.
        pretest=targets<test_start
        test_predictions={'Naive baseline':baseline(series,origins[test_mask],h)}
        for name in models:
            if name in validation:
                try:
                    model=estimators()[name];model.fit(x[pretest],y[pretest]);test_predictions[name]=model.predict(x[test_mask])
                except Exception as exc: failures[name+' final test']=type(exc).__name__
        if 'ARIMA' in validation:
            try: test_predictions['ARIMA']=arima_predictions(series,origins[test_mask],h)
            except Exception as exc: failures['ARIMA final test']=type(exc).__name__
        test_metrics={name:metrics(y[test_mask],pred) for name,pred in test_predictions.items()}
        if selected not in test_predictions:
            report['horizons'][str(h)]={'status':'unsupported','reason':'Validation winner failed final evaluation','failures':failures};continue
        absolute_errors=np.abs(y[val_mask]-val_predictions[selected])
        radius=float(np.quantile(absolute_errors,.95,method='higher'))
        winner=None
        if selected in models:
            winner=estimators()[selected];winner.fit(x,y)
        elif selected=='ARIMA': winner=ARIMA(np.asarray(series.iloc[-180:]),order=(1,1,0)).fit()
        predictions=[{'origin':series.index[int(i)].date().isoformat(),'date':series.index[int(i)+h-1].date().isoformat(),'actual':float(a),'predicted':float(p),'residual':float(a-p)} for i,a,p in zip(origins[test_mask],y[test_mask],test_predictions[selected])]
        settings={'random_seed':42,'RF':{'n_estimators':100,'max_depth':8,'min_samples_leaf':3},'XGBoost':{'n_estimators':100,'max_depth':3,'learning_rate':.05},'ARIMA':{'order':[1,1,0],'history_window':180}}
        report['horizons'][str(h)]={'status':'validated','selected':selected,'selection_reason':'Lowest validation MAE, then RMSE; final test never used for selection.','validation':validation,'test':test_metrics,'baseline_beaten_on_final_test':test_metrics[selected]['MAE']<test_metrics['Naive baseline']['MAE'],'training_end':series.index[validation_start-1].date().isoformat(),'validation_period':[series.index[validation_start].date().isoformat(),series.index[test_start-1].date().isoformat()],'test_period':[series.index[test_start].date().isoformat(),series.index[-1].date().isoformat()],'interval_radius':radius,'interval_method':'95th percentile absolute validation residual; empirical, dependent errors; not a formal coverage guarantee','failures':failures,'hyperparameters':settings,'predictions':predictions}
        artifact['horizons'][h]={'selected':selected,'model':winner,'interval_radius':radius}
    if not artifact['horizons']: raise ValueError('No horizon passed data sufficiency and evaluation checks')
    path=store.root/'models'/f'{run_id}.joblib';joblib.dump(artifact,path)
    (store.root/'models'/f'{run_id}.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    with store.connect() as con:
        con.execute('INSERT INTO model_registry VALUES(?,?,?,?,?,?)',(run_id,json.dumps(group,sort_keys=True),version,utcnow(),str(path),json.dumps(report)))
    return report

def forecast(store,run_id,horizon):
    rows=store.query('SELECT * FROM model_registry WHERE id=?',(run_id,))
    if not rows: raise ValueError('Model version not found')
    # Load only internally registered local artifacts, never user-provided pickle files.
    artifact=joblib.load(rows[0]['artifact']); info=artifact['horizons'].get(horizon)
    if not info: raise ValueError('This horizon is not validated')
    series=artifact['series']; selected=info['selected']
    if selected=='Naive baseline': estimate=float(series.iloc[-1])
    elif selected=='ARIMA': estimate=float(info['model'].forecast(horizon)[-1])
    else: estimate=float(info['model'].predict(features(series,len(series)).reshape(1,-1))[0])
    if not np.isfinite(estimate) or estimate<=0: raise ValueError('Forecast failed numeric validation')
    radius=info['interval_radius'];report=json.loads(rows[0]['result_json'])
    result={'group':artifact['group'],'horizon_days':horizon,'date':(series.index[-1]+timedelta(days=horizon)).date().isoformat(),'forecast':estimate,'lower':max(0,estimate-radius),'upper':estimate+radius,'interval_method':report['horizons'][str(horizon)]['interval_method'],'selected':selected,'latest_observation':series.index[-1].date().isoformat(),'latest_price':float(series.iloc[-1]),'trained_at':rows[0]['created_at'],'dataset_version':rows[0]['dataset_version'],'evaluation':report['horizons'][str(horizon)]['test'][selected],'disclaimer':'Estimate, not a guaranteed market price. Data may be stale. Endpoint forecast only; intermediate daily points were not validated.'}
    return result

def explain(store,run_id,horizon):
    rows=store.query('SELECT artifact FROM model_registry WHERE id=?',(run_id,))
    if not rows: raise ValueError('Model version not found')
    artifact=joblib.load(rows[0]['artifact']);info=artifact['horizons'].get(horizon)
    if not info or info['selected'] not in ('Random Forest','XGBoost'): raise ValueError('SHAP is available only for a selected tree model')
    import shap
    values=features(artifact['series'],len(artifact['series'])).reshape(1,-1)
    explainer=shap.TreeExplainer(info['model']); contributions=np.asarray(explainer.shap_values(values)).reshape(-1)
    return {'model':info['selected'],'features':[{'feature':name,'value':float(value),'contribution':float(score)} for name,value,score in zip(FEATURE_NAMES,values[0],contributions)],'disclaimer':'SHAP explains model output, not causation.'}