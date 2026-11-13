import hashlib,json,time
from pathlib import Path
import numpy as np
import pandas as pd
from .features import make_splits,FEATURES,CATEGORICAL
from .evaluation import metrics,subgroup_report
from .tuning import tune,SEARCH
from .models import build
from .artifacts import save_model,write_json
from .acquisition import digest

def train(master_path,output):
    out=Path(output);out.mkdir(parents=True,exist_ok=True);master=pd.read_parquet(master_path)
    train,val,test=make_splits(master)
    # No geographic selection uses test yields. Require five earlier observed years only.
    combos=train.groupby(CATEGORICAL).year.nunique();keys=set(combos[combos>=5].index)
    train=train.loc[pd.MultiIndex.from_frame(train[CATEGORICAL]).isin(keys)].copy();val=val.loc[pd.MultiIndex.from_frame(val[CATEGORICAL]).isin(keys)].copy();test=test.loc[pd.MultiIndex.from_frame(test[CATEGORICAL]).isin(keys)].copy()
    train.to_parquet(out/'train.parquet',index=False);val.to_parquet(out/'validation.parquet',index=False);test.to_parquet(out/'test.parquet',index=False)
    report={'objective':'District-season crop yield regression','unit':'tonnes/hectare','dataset_sha256':digest(master_path),'features':FEATURES,'cutoff':'January 1 of crop start year; published crop/weather history at least two years old','protocol':'Train 1997–2016; validation 2017–2019; unseen final test 2020–2022. Validation historical targets frozen at 2016; test frozen at 2019. No current area, production or target input.','split_rows':{'train':len(train),'validation':len(val),'test':len(test)},'models':[]}
    finaltrain=pd.concat([train,val],ignore_index=True);winner=None;bestmae=float('inf')
    for name in SEARCH:
        started=time.monotonic();model,params,trials,tune_seconds=tune(name,train,val)
        tr=metrics(train.yield_t_ha,np.maximum(0,model.predict(train[FEATURES])));va=metrics(val.yield_t_ha,np.maximum(0,model.predict(val[FEATURES])))
        # Model selection only uses validation MAE; evaluated model refit through 2019, never 2020–2022.
        final=build(name,params);final.fit(finaltrain[FEATURES],finaltrain.yield_t_ha);pred=np.maximum(0,final.predict(test[FEATURES]));te=metrics(test.yield_t_ha,pred)
        artifact=save_model(final,out/(name.lower().replace(' ','-')+'.joblib'))
        entry={'name':name,'parameters':params,'training':tr,'validation':va,'test':te,'training_seconds':time.monotonic()-started,'tuning_seconds':tune_seconds,'trials':trials,'artifact':artifact,'subgroups':subgroup_report(test,pred)}
        report['models'].append(entry)
        points=test[CATEGORICAL+['year','yield_t_ha']].copy();points['prediction']=pred;points.to_parquet(out/(name.lower().replace(' ','-')+'-test-predictions.parquet'),index=False)
        if va['MAE']<bestmae:bestmae=va['MAE'];winner=name
        print('model',name,'test',te,flush=True);write_json(out/'evaluation.json',report)
    report['selected_model']=winner;report['selection_basis']='Lowest validation MAE, not test score';report['test_rmse_winner']=min(report['models'],key=lambda x:x['test']['RMSE'])['name']
    # Truly unseen districts: no district-specific lag targets or district labels present in training.
    held={tuple(k) for k in train[['state','district']].drop_duplicates().itertuples(index=False) if int(hashlib.sha256('|'.join(k).encode()).hexdigest(),16)%5==0}
    keep=~pd.MultiIndex.from_frame(finaltrain[['state','district']]).isin(held);geo_train=finaltrain.loc[keep].copy()
    geo_test=test.loc[pd.MultiIndex.from_frame(test[['state','district']]).isin(held)].copy()
    for c in ['history_mean_yield','history_last_yield','history_std_yield','history_area_ha','history_count','history_age']:geo_test[c]=np.nan
    params=next(x['parameters'] for x in report['models'] if x['name']==winner);gm=build(winner,params);gm.fit(geo_train[FEATURES],geo_train.yield_t_ha)
    report['unseen_district_test']={'held_districts':len(held),'training_rows':len(geo_train),'test':metrics(geo_test.yield_t_ha,np.maximum(0,gm.predict(geo_test[FEATURES]))),'basis':'Deterministic 20% district holdout, selected temporal model parameters fixed; held district crop target history removed'}
    best=next(x for x in report['models'] if x['name']==winner)
    import joblib
    fm=joblib.load(out/best['artifact']['file']);pre=fm.regressor_.named_steps['preprocess'];reg=fm.regressor_.named_steps['model'];names=pre.get_feature_names_out()
    importance=getattr(reg,'feature_importances_',None)
    report['feature_importance']=sorted([{'feature':str(n),'importance':float(v)} for n,v in zip(names,importance)],key=lambda x:-x['importance'])[:30] if importance is not None else []
    # Save only combinations supported by earlier training, not every observed district/crop.
    coverage=[]
    for key,g in master.groupby(CATEGORICAL):
        if key not in keys:continue
        coverage.append(dict(zip(CATEGORICAL,key))|{'history_years':sorted(g.year.unique().tolist()),'rows':len(g),'last_year':int(g.year.max()),'trained_years':int(combos[key])})
    write_json(out/'coverage.json',coverage);write_json(out/'evaluation.json',report)
    write_json(out/'configuration.json',{'seed':42,'search':SEARCH,'python_model_unit':'tonnes/hectare','training_end':2019,'test_start':2020,'test_end':2022,'geographic_holdout_hash_modulus':5,'source':'Government DES official reports','artifacts_trusted_local_only':True})
    return report
