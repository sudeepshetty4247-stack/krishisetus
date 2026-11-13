import numpy as np
import pandas as pd
from yield_engine.cleaning import clean
from yield_engine.features import feature_rows,FEATURES,FORBIDDEN
from yield_engine.evaluation import metrics

def row(year,y=2,crop='Rice',unit='Production (Tonnes)'):
 return {'state':'Karnataka','district':'Udupi','crop':crop,'season':'Kharif','year':year,'area_ha':10.,'production':y*10,'production_unit':unit,'published_yield':y,'yield_t_ha':y,'environment_year':year-2,'annual_rain_mm':1000.}
def test_yield_is_production_divided_by_area():
 c,_=clean(pd.DataFrame([row(2000,3)]));assert c.iloc[0].yield_t_ha==3;assert c.iloc[0].yield_unit=='tonnes/hectare'
def test_bales_never_mixed_with_tonnes():
 c,r=clean(pd.DataFrame([row(2000),row(2001,2,'Cotton(lint)','Production (Bales)')]));assert len(c)==1;assert r['unit_exclusions'][0]['rows']==1

def test_no_current_or_future_yield_features():
 h=pd.DataFrame([row(2000,2),row(2001,4),row(2002,999),row(2003,500)])
 f=feature_rows(h.loc[h.year==2003],h);assert f.iloc[0].history_last_yield==4;assert f.iloc[0].history_mean_yield==3;assert not set(FEATURES)&FORBIDDEN

def test_validation_history_frozen_at_training_end():
 h=pd.DataFrame([row(2016,2),row(2017,999),row(2019,3)])
 f=feature_rows(h.loc[h.year==2019],h,2016);assert f.iloc[0].history_last_yield==2

def test_zero_yields_remain_and_mape_exclusions_counted():
 c,_=clean(pd.DataFrame([row(2000,0),row(2001,2)]));assert len(c)==2
 m=metrics([0,2],[0,3]);assert m['MAPE']==50;assert m['MAPE_zero_targets_excluded']==1;assert m['MAE']==.5

def test_conflicting_duplicate_keys_excluded():
 c,r=clean(pd.DataFrame([row(2000,2),row(2000,3),row(2001,1)]));assert c.year.tolist()==[2001];assert r['conflicting_keys']==1
