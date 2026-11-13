import numpy as np
import pandas as pd
from ml_engine.optimization import training_indices, enriched_design, ALGORITHMS

def test_target_at_origin_and_future_never_train():
    targets=np.array([8,9,10,11]);origins=np.array([7,8,9,10])
    assert training_indices(targets,origins,10,0).tolist()==[True,True,False,False]

def test_training_window_excludes_old_origins():
    assert training_indices(np.array([2,8,9]),np.array([1,7,8]),10,3).tolist()==[False,True,True]

def test_future_prices_cannot_change_origin_features():
    series=pd.Series(np.arange(100,dtype=float)+100,index=pd.period_range('2020-01-01',periods=100,freq='W-SUN'))
    X,_,o,_=enriched_design(series,1)
    changed=series.copy();changed.iloc[70:]*=5
    Y,_,p,_=enriched_design(changed,1)
    assert np.array_equal(o,p)
    assert np.array_equal(X[o<70],Y[p<70])

def test_all_six_and_two_optional_models_are_evaluated():
    assert ALGORITHMS==('Naive','Seasonal naive','Random Forest','XGBoost','ARIMA','SARIMA','LightGBM','CatBoost')