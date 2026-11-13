"""Validation-only fixed reproducible search; no test data accepted here."""
import time
import numpy as np
from .models import build
from .features import FEATURES
from .evaluation import metrics
SEARCH={'Baseline':[{}],'Random Forest':[{'max_depth':14,'min_samples_leaf':5},{'max_depth':22,'min_samples_leaf':3}],'XGBoost':[{'max_depth':5,'subsample':.85,'colsample_bytree':.9},{'max_depth':8,'subsample':.85,'colsample_bytree':.9}],'CatBoost':[{'depth':6,'l2_leaf_reg':5},{'depth':8,'l2_leaf_reg':8}]}
def tune(name,train,val):
    trials=[];best=None;best_error=float('inf');start=time.monotonic()
    for params in SEARCH[name]:
        model=build(name,params);t=time.monotonic();model.fit(train[FEATURES],train.yield_t_ha)
        vp=np.maximum(0,model.predict(val[FEATURES]));m=metrics(val.yield_t_ha,vp);trials.append({'parameters':params,'validation':m,'seconds':time.monotonic()-t})
        print('trial',name,params,m,flush=True)
        if m['MAE']<best_error:best=model;best_error=m['MAE'];selected=params
    if best is None:raise ValueError('All candidates failed')
    return best,selected,trials,time.monotonic()-start
