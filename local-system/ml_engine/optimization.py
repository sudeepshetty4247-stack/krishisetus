"""Validation-only search; identical purged walk-forward origins for every candidate."""
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from catboost import CatBoostRegressor
from statsmodels.tsa.statespace.sarimax import SARIMAX
from ml_engine.weekly import design, feature_row, FEATURES, metrics, seasonal_naive
from ml_engine.direction import direction_metrics

ALGORITHMS = ('Naive', 'Seasonal naive', 'Random Forest', 'XGBoost', 'ARIMA', 'SARIMA', 'LightGBM', 'CatBoost')
EXTRA = ['return_1', 'return_4', 'trend_8', 'relative_volatility_8', 'distance_mean_13']

def enriched_design(series, horizon):
    X, y, origins, targets = design(series, horizon)
    filled = series.ffill(limit=2)
    extra = []
    for o in origins:
        past = filled.iloc[o-7:o+1].to_numpy(float)
        current = filled.iloc[o]
        extra.append([current / filled.iloc[o-1]-1, current / filled.iloc[o-4]-1,
                      (past[-1]-past[0])/7, np.nanstd(past)/max(np.nanmean(past), 1),
                      current/np.nanmean(filled.iloc[o-12:o+1])-1])
    return np.nan_to_num(np.column_stack([X, extra])), y, origins, targets

def training_indices(targets, origins, cut, window):
    # A target at the prediction origin is excluded conservatively.
    return (targets < cut) & ((origins >= cut-window) if window else True)

def build(name, config):
    depth = config['depth']
    if name == 'Random Forest':
        return RandomForestRegressor(n_estimators=180, max_depth=depth, min_samples_leaf=3, random_state=42, n_jobs=2)
    if name == 'XGBoost':
        return XGBRegressor(n_estimators=160, max_depth=depth, learning_rate=.035, subsample=.85, colsample_bytree=.85, random_state=42, n_jobs=2)
    if name == 'LightGBM':
        return LGBMRegressor(n_estimators=160, max_depth=depth, num_leaves=2**depth, min_child_samples=10, learning_rate=.035, verbosity=-1, random_state=42, n_jobs=2)
    return CatBoostRegressor(iterations=160, depth=depth, learning_rate=.035, loss_function='RMSE', verbose=False, random_seed=42, thread_count=2, allow_writing_files=False)

def fit_time(series, cut, name, config):
    start = max(0, cut-config['window']) if config['window'] else 0
    return SARIMAX(np.log(series.iloc[start:cut].to_numpy(float)), order=config['order'],
                   seasonal_order=(1,0,0,52) if name == 'SARIMA' else (0,0,0,0),
                   enforce_stationarity=False, enforce_invertibility=False).fit(disp=False, maxiter=60)

def predict(series, X, y, origins, targets, indices, horizon, name, config):
    if name == 'Naive':
        return series.iloc[origins[indices]].to_numpy(float)
    if name == 'Seasonal naive':
        return seasonal_naive(series, origins[indices], horizon)
    result = []
    if name in ('ARIMA', 'SARIMA'):
        cut = int(origins[indices[0]])
        fitted = fit_time(series, cut, name, config)
        start = max(0, cut-config['window']) if config['window'] else 0
        for i in indices:
            state = fitted.apply(np.log(series.iloc[start:origins[i]+1].to_numpy(float)))
            result.append(float(np.exp(state.forecast(horizon)[-1])))
    else:
        for i in indices:
            mask = training_indices(targets, origins, origins[i], config['window'])
            model = build(name, config).fit(X[mask], y[mask])
            result.append(float(model.predict(X[i:i+1])[0]))
    result = np.asarray(result)
    if not np.isfinite(result).all():
        raise ValueError('Non-finite predictions; candidate excluded, not patched')
    return result

def optimize(series):
    _, _, first, _ = design(series, 1)
    if len(first) < 100:
        raise ValueError('At least 100 usable historical origins required')
    validation_start, test_start = int(first[int(len(first)*.6)]), int(first[int(len(first)*.8)])
    report, artifacts = {}, {}
    date = lambda i: str(series.index[int(i)].start_time.date())
    for h in (1, 2, 4):
        X, y, o, t = enriched_design(series, h)
        masks = {'validation': (o >= validation_start) & (t < test_start), 'test': o >= test_start}
        entry = {'status':'trained', 'horizon_weeks':h, 'horizon_days':h*7, 'validation':{}, 'test':{},
                 'direction':{'validation':{},'test':{}}, 'all_predictions':{}, 'tuning':{}, 'failures':{},
                 'samples':{'train':int((t < validation_start).sum()), **{k:int(v.sum()) for k,v in masks.items()}},
                 'evaluation_periods':{'test_origins':[date(o[masks['test']][0]),date(o[masks['test']][-1])],
                                       'test_targets':[date(t[masks['test']][0]),date(t[masks['test']][-1])]}}
        artifacts[h] = {}
        for name in ALGORITHMS:
            configs = ([{}] if name in ('Naive','Seasonal naive') else
                       [{'order':order,'window':0} for order in ((1,1,1),(2,1,0),(0,1,1))] if name in ('ARIMA','SARIMA') else
                       [{'depth':depth,'window':window} for depth,window in ((3,0),(5,0),(3,156))])
            trials = []
            for config in configs:
                try:
                    p = predict(series,X,y,o,t,np.where(masks['validation'])[0],h,name,config)
                    trials.append((metrics(y[masks['validation']],p),config,p))
                except Exception as exc:
                    entry['failures'][name+str(config)] = str(exc)[:150]
            if not trials:
                continue
            score, config, vp = min(trials,key=lambda v:(v[0]['MAE'],v[0]['RMSE']))
            entry['tuning'][name] = {'selected_config':config,'candidate_validation':[{'config':c,**m} for m,c,_ in trials],
                                    'objective':'Validation MAE, RMSE tie-break; no test selection'}
            for split, p in [('validation',vp),('test',predict(series,X,y,o,t,np.where(masks['test'])[0],h,name,config))]:
                mask = masks[split]
                entry[split][name] = metrics(y[mask],p)
                entry['direction'][split][name] = direction_metrics(y[mask],p,series.iloc[o[mask]].to_numpy())
                if split == 'test':
                    entry['all_predictions'][name] = [{'origin':date(a),'week':date(b),'current':float(series.iloc[a]),'actual':float(v),'predicted':float(pred)} for a,b,v,pred in zip(o[mask],t[mask],y[mask],p)]
            if name in ('Naive','Seasonal naive'):
                artifacts[h][name] = {'algorithm':name,'series':series}
            elif name in ('ARIMA','SARIMA'):
                artifacts[h][name] = fit_time(series,len(series),name,config)
            else:
                mask = training_indices(t,o,len(series),config['window'])
                artifacts[h][name] = build(name,config).fit(X[mask],y[mask])
        selected = min(entry['validation'],key=lambda n:(entry['validation'][n]['MAE'],entry['validation'][n]['RMSE']))
        entry.update(selected=selected,selection_reason='Validation-only tuned MAE; final test never used for selection.',
                     baseline_beaten=entry['test'][selected]['MAE'] < entry['test']['Naive']['MAE'])
        report[str(h)] = entry
    return report, artifacts, FEATURES+EXTRA