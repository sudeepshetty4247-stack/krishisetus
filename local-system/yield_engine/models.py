import numpy as np
from sklearn.compose import ColumnTransformer,TransformedTargetRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.dummy import DummyRegressor
from xgboost import XGBRegressor
from catboost import CatBoostRegressor
from .features import CATEGORICAL,NUMERIC

def build(name,params):
    pre=ColumnTransformer([('category',OneHotEncoder(handle_unknown='ignore',sparse_output=True),CATEGORICAL),('numeric',SimpleImputer(strategy='median',add_indicator=True,keep_empty_features=True),NUMERIC)])
    if name=='Random Forest':model=RandomForestRegressor(n_estimators=140,n_jobs=2,random_state=42,**params)
    elif name=='XGBoost':model=XGBRegressor(n_estimators=350,learning_rate=.045,objective='reg:squarederror',tree_method='hist',n_jobs=2,random_state=42,**params)
    elif name=='CatBoost':
        model=CatBoostRegressor(iterations=450,learning_rate=.045,loss_function='RMSE',thread_count=2,random_seed=42,verbose=False,allow_writing_files=False,**params)
    else:model=DummyRegressor(strategy='mean')
    return TransformedTargetRegressor(regressor=Pipeline([('preprocess',pre),('model',model)]),func=np.log1p,inverse_func=np.expm1,check_inverse=False)
