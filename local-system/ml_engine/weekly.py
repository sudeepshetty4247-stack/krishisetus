"""Weekly price forecasting laboratory on genuine AGMARKNET history.

Series identity: state / district / market (APMC suffix normalised) / commodity / variety from ONE source.
Daily value = median modal price across the grades reported that day (AGMARKNET 2.0 relabelled grades in 2025).
Weekly value = mean of the observed daily values in a Monday–Sunday week. Missing weeks are NOT imputed as targets.

Leakage controls
* Features at origin week o use only weeks <= o (forward-fill of at most two weeks, past values only).
* Targets are week o+h (h = 1, 2, 4 weeks ≈ 7, 14, 28 days).
* Chronological split on usable origins: first 60% train (targets purged before validation), next 20% validation, final 20% test.
* Selection uses validation MAE only. Test is a walk-forward evaluation: tree models refit every 4 weeks on
  targets strictly before the origin; ARIMA parameters are fixed on pre-test data and filtered forward.
"""
import hashlib, json, uuid, warnings
from datetime import datetime, timezone
import numpy as np, pandas as pd, joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from statsmodels.tsa.statespace.sarimax import SARIMAX
from xgboost import XGBRegressor
from ml_engine.direction import direction_metrics
warnings.filterwarnings('ignore')
HORIZONS=(1,2,4)
FEATURES=['lag_1','lag_2','lag_3','lag_4','lag_8','lag_13','lag_52','mean_4','mean_8','mean_13','std_4','std_8','std_13','change_1','change_4','week_sin','week_cos','month','lag_52_missing']

def norm_market(m): return pd.Series(m).str.replace(r'\s*APMC$','',regex=True).str.replace(r'^APMC\s+','',regex=True).iloc[0] if isinstance(m,str) else m

def weekly_series(frame,group):
    f=frame.copy(); f['mk']=f.market.str.replace(r'\s*APMC$','',regex=True).str.replace(r'^APMC\s+','',regex=True)
    s=f[(f.state==group['state'])&(f.district==group['district'])&(f.mk==group['market'])&(f.commodity==group['commodity'])&(f.variety==group['variety'])]
    if s.empty: raise ValueError('No observations for this source-specific series')
    daily=s.groupby('date').modal_price.median(); daily.index=pd.to_datetime(daily.index)
    weekly=daily.groupby(daily.index.to_period('W-SUN')).mean()
    idx=pd.period_range(weekly.index.min(),weekly.index.max(),freq='W-SUN')
    return weekly.reindex(idx),daily,s

def feature_row(filled,o):
    v=lambda k:filled.iloc[o-k] if o-k>=0 else np.nan
    past=filled.iloc[max(0,o-12):o+1]
    week=filled.index[o].week; month=filled.index[o].end_time.month
    lag52=v(52)
    row=[v(0),v(1),v(2),v(3),v(7),v(12),lag52 if not np.isnan(lag52) else v(0)]
    for w in (4,8,13): row.append(float(np.nanmean(filled.iloc[max(0,o-w+1):o+1])))
    for w in (4,8,13): row.append(float(np.nanstd(filled.iloc[max(0,o-w+1):o+1])))
    row+= [v(0)-v(1),v(0)-v(4),np.sin(2*np.pi*week/52),np.cos(2*np.pi*week/52),month,float(np.isnan(lag52))]
    return row

def design(weekly,h):
    filled=weekly.ffill(limit=2)   # past-only carry, never used for targets
    X,y,origin,target=[],[],[],[]
    for o in range(56,len(weekly)-h):
        if np.isnan(weekly.iloc[o]) or np.isnan(weekly.iloc[o+h]): continue
        r=feature_row(filled,o)
        if np.isnan(r[0]) or np.isnan(r[1]): continue
        X.append(r); y.append(weekly.iloc[o+h]); origin.append(o); target.append(o+h)
    return np.asarray(X,float),np.asarray(y,float),np.asarray(origin),np.asarray(target)

def metrics(a,p):
    a,p=np.asarray(a,float),np.asarray(p,float)
    return {'MAE':float(mean_absolute_error(a,p)),'RMSE':float(np.sqrt(mean_squared_error(a,p))),'sMAPE':float(np.mean(200*np.abs(p-a)/np.maximum(np.abs(a)+np.abs(p),1e-8))),'R2':float(r2_score(a,p)) if len(a)>2 and np.var(a)>0 else None,'n':int(len(a))}

def make(name):
    if name=='Random Forest': return RandomForestRegressor(n_estimators=200,max_depth=8,min_samples_leaf=3,random_state=42,n_jobs=2)
    return XGBRegressor(n_estimators=250,max_depth=3,learning_rate=.05,subsample=.9,colsample_bytree=.9,random_state=42,n_jobs=2)

def seasonal_naive(weekly,origins,h):
    filled=weekly.ffill(limit=2); out=[]
    for o in origins:
        t=o+h-52; cands=[filled.iloc[k] for k in (t,t-1,t+1) if 0<=k<=o and not np.isnan(filled.iloc[k])]
        out.append(cands[0] if cands else filled.iloc[o])
    return np.asarray(out)

def arima_fit(weekly,end,seasonal):
    y=np.log(weekly.iloc[:end].to_numpy(float))
    model=SARIMAX(y,order=(1,1,1),seasonal_order=(1,0,0,52) if seasonal else (0,0,0,0),enforce_stationarity=False,enforce_invertibility=False)
    return model.fit(disp=False,maxiter=80)

def arima_predict(fit,weekly,origins,h):
    out=[]
    for o in origins:
        res=fit.apply(np.log(weekly.iloc[:o+1].to_numpy(float)))
        out.append(float(np.exp(res.forecast(h)[-1])))
    return np.asarray(out)

def train_group(frame,group,source):
    weekly,daily,raw=weekly_series(frame,group)
    n=len(weekly)
    if weekly.notna().sum()<150: raise ValueError(f'Insufficient history: {int(weekly.notna().sum())} observed weeks (need 150)')
    # Split on the 1-week design so every horizon shares the same chronological boundaries.
    _,_,o1,_=design(weekly,1)
    if len(o1)<100: raise ValueError(f'Insufficient history: only {len(o1)} usable forecast origins (need 100)')
    test_start=int(o1[int(len(o1)*.8)]); val_start=int(o1[int(len(o1)*.6)])
    version=hashlib.sha256(raw.sort_values(['date','grade']).to_csv(index=False).encode()).hexdigest()[:16]
    wk=lambda i:str(weekly.index[min(i,n-1)].start_time.date())
    report={'group':group,'source':source,'frequency':'weekly mean of daily median modal price (INR/quintal)','observed_weeks':int(weekly.notna().sum()),'daily_reports':int(len(daily)),'raw_rows':int(len(raw)),
            'period':[str(daily.index.min().date()),str(daily.index.max().date())],'train_period':[wk(0),wk(val_start-1)],'validation_period':[wk(val_start),wk(test_start-1)],'test_period':[wk(test_start),wk(n-1)],
            'dataset_version':version,'features':FEATURES,'horizons':{},'history':[{'week':str(p.start_time.date()),'price':None if np.isnan(v) else round(float(v),2)} for p,v in weekly.items()]}
    artifact={'group':group,'weekly':weekly,'models':{}}
    for h in HORIZONS:
        X,y,o,t=design(weekly,h); tr=t<val_start; va=(o>=val_start)&(t<test_start); te=o>=test_start
        if min(tr.sum(),va.sum(),te.sum())<15:
            report['horizons'][str(h)]={'status':'insufficient_data','reason':f'train/validation/test samples {int(tr.sum())}/{int(va.sum())}/{int(te.sum())}; 15 each required'};continue
        val,status,fails={},{},{}
        val['Naive']=weekly.ffill(limit=2).iloc[o[va]].to_numpy(); val['Seasonal naive']=seasonal_naive(weekly,o[va],h)
        fitted={}
        for name in ('Random Forest','XGBoost'):
            try: m=make(name).fit(X[tr],y[tr]); val[name]=m.predict(X[va]); fitted[name]=m
            except Exception as e: fails[name]=str(e)[:200]
        for name,seasonal in (('ARIMA',False),('SARIMA',True)):
            try: fit=arima_fit(weekly,val_start,seasonal); val[name]=arima_predict(fit,weekly,o[va],h)
            except Exception as e: fails[name]=str(e)[:200]
        vm={k:metrics(y[va],p) for k,p in val.items() if np.all(np.isfinite(p))}
        selected=min(vm,key=lambda k:(vm[k]['MAE'],vm[k]['RMSE']))
        # Walk-forward final test
        test={'Naive':weekly.ffill(limit=2).iloc[o[te]].to_numpy(),'Seasonal naive':seasonal_naive(weekly,o[te],h)}
        for name in fitted:
            preds=np.empty(te.sum()); idx=np.where(te)[0]
            for start in range(0,len(idx),4):
                block=idx[start:start+4]; cut=o[block[0]]
                m=make(name).fit(X[t<=cut],y[t<=cut]); preds[start:start+len(block)]=m.predict(X[block])
            test[name]=preds
        for name,seasonal in (('ARIMA',False),('SARIMA',True)):
            if name in vm:
                try: fit=arima_fit(weekly,test_start,seasonal); test[name]=arima_predict(fit,weekly,o[te],h)
                except Exception as e: fails[name+' test']=str(e)[:200]
        tm={k:metrics(y[te],p) for k,p in test.items()}
        direction = {split: {name: direction_metrics(y[mask], p, weekly.iloc[o[mask]].to_numpy())
                     for name, p in predictions.items()} for split, mask, predictions in
                     (('validation', va, val), ('test', te, test))}
        all_predictions = {name: [{'origin': wk(int(a)), 'week': wk(int(b)),
                            'current': float(weekly.iloc[int(a)]), 'actual': float(ya), 'predicted': float(p)}
                            for a, b, ya, p in zip(o[te], t[te], y[te], predictions)]
                           for name, predictions in test.items()}
        recent=te&(o>=n-26); rm={k:metrics(y[recent],test[k][recent[te]]) for k in test} if recent.sum()>=5 else {}
        sel_test=test.get(selected); residuals=(y[te]-sel_test) if sel_test is not None else np.array([])
        radius=float(np.quantile(np.abs(y[va]-val[selected]),.9))
        entry={'status':'trained','horizon_weeks':h,'horizon_days':h*7,'selected':selected,'selection_reason':'Lowest validation MAE (RMSE tie-break). Final walk-forward test never used for selection.',
               'validation':vm,'test':tm,'recent_26_weeks':rm,'samples':{'train':int(tr.sum()),'validation':int(va.sum()),'test':int(te.sum())},'failures':fails,
               'direction': direction, 'all_predictions': all_predictions,
               'evaluation_periods': {'test_origins': [wk(int(o[te][0])), wk(int(o[te][-1]))],
                                     'test_targets': [wk(int(t[te][0])), wk(int(t[te][-1]))]},
               'deterioration_ratio':(rm.get(selected,{}).get('MAE',np.nan)/tm[selected]['MAE']) if rm and selected in tm and tm[selected]['MAE'] else None,
               'baseline_beaten':bool(selected in tm and tm[selected]['MAE']<tm['Naive']['MAE']),
               'interval':{'radius':radius,'method':'90th percentile of absolute validation errors; empirical, not a coverage guarantee'},
               'predictions':[{'origin':wk(int(a)),'week':wk(int(b)),'actual':round(float(ya),2),'predicted':round(float(p),2)} for a,b,ya,p in zip(o[te],t[te],y[te],sel_test)] if sel_test is not None else [],
               'residuals':{'mean':float(np.mean(residuals)),'std':float(np.std(residuals)),'lag1_autocorrelation':float(pd.Series(residuals).autocorr(1)) if len(residuals)>3 else None} if len(residuals) else None}
        # Final model on all data, explanation, and forecast from the last observed week
        last=int(np.where(weekly.notna())[0][-1]); fx=np.asarray([feature_row(weekly.ffill(limit=2),last)])
        if selected in fitted:
            final=make(selected).fit(X,y); estimate=float(final.predict(fx)[0])
            imp=dict(zip(FEATURES,map(float,final.feature_importances_)))
            import shap
            sv=np.asarray(shap.TreeExplainer(final).shap_values(X[te]))
            entry['feature_importance']=sorted(({'feature':k,'importance':v} for k,v in imp.items()),key=lambda d:-d['importance'])
            entry['shap_mean_abs']=sorted(({'feature':k,'value':float(v)} for k,v in zip(FEATURES,np.abs(sv).mean(0))),key=lambda d:-d['value'])
            artifact['models'][h]=final
        elif selected in ('ARIMA','SARIMA'):
            fit=arima_fit(weekly,n,selected=='SARIMA'); estimate=float(np.exp(fit.forecast(h)[-1]))
            entry['parameters']={k:float(v) for k,v in zip(fit.model.param_names,fit.params)}; artifact['models'][h]=fit.params
        elif selected=='Seasonal naive': estimate=float(seasonal_naive(weekly,[last],h)[0])
        else: estimate=float(weekly.iloc[last])
        entry['forecast']={'origin_week':wk(last),'target_week':str((weekly.index[last]+h).start_time.date()),'price':round(estimate,2),'lower':round(max(0,estimate-radius),2),'upper':round(estimate+radius,2),
                           'latest_actual':round(float(weekly.iloc[last]),2),'latest_report_date':str(daily.index.max().date()),
                           'note':'Generated from the last observed historical week. It is NOT a current forecast when that week is old.'}
        report['horizons'][str(h)]=entry
    return report,artifact,version
