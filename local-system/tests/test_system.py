"""All numeric observations here are explicit unit-test fixtures, never product data."""
import json
import numpy as np
import pandas as pd
import pytest
from app import create_app
from data_engine.storage import Store
from data_engine.cleaning import normalize,ingest_rows
from data_engine.connectors import DataGovConnector,SourceUnavailable,import_file
from intelligence_engine.decisions import net_value,break_even_transport,compare
from ml_engine.research import features,supervised,metrics,series_from_store

@pytest.fixture
def store(tmp_path): return Store(tmp_path/'data')

def row(**kw):
    return dict(state='Karnataka',district='Dharwad',market='Dharwad',commodity='Maize',variety='Local',arrival_date='2025-01-02',min_price='1800',max_price='2400',modal_price='2000',price_unit='INR/quintal',**kw)

def seed(store,rows): return ingest_rows(store,rows,'test','https://example.invalid/test-fixture','test fixture — not official')

def test_net_formula(): assert net_value(2000,10,800,200,100)==18900
def test_break_even(): assert break_even_transport(2300,2000,10,200)==2800
def test_negative_advantage(): assert break_even_transport(1900,2000,10)==-1000
def test_invalid_cost():
    with pytest.raises(ValueError): net_value(2000,10,-1)
def test_units():
    r=row();r.update(min_price='18',modal_price='20',max_price='24',price_unit='INR/kg'); assert normalize(r)['modal']==2000
def test_missing_unit():
    r=row();r.pop('price_unit')
    with pytest.raises(ValueError): normalize(r)
def test_invalid_date():
    r=row();r['arrival_date']='2025-02-30'
    with pytest.raises(ValueError): normalize(r)
def test_missing_price_not_zero():
    r=row();r['min_price']='';assert normalize(r)['min'] is None
def test_nationwide_catalog(store):
    r=row();r.update(state='Punjab',district='Ludhiana',market='Khanna',commodity='Wheat');seed(store,[r]);assert store.catalog('states',{})==[{'name':'Punjab'}];assert store.catalog('commodities',{})==[{'name':'Wheat'}]
def test_duplicate_audit(store):
    result=seed(store,[row(),row()]); assert result['accepted']==1 and result['duplicates']==1;assert len(store.query('SELECT * FROM cleaning_audit'))==1
def test_source_separation(store):
    seed(store,[row()]);ingest_rows(store,[row()],'second','test','test');assert store.coverage()['records']==2
def test_compare_same_date_variety(store):
    rows=[row(),row()];rows[1].update(market='Hubballi',modal_price='2300');seed(store,rows)
    nearest=store.observations({'market':'Dharwad'})['records'][0]['market_id'];other=store.observations({'market':'Hubballi'})['records'][0]['market_id']
    result=compare(store,{'commodity':'Maize','variety':'Local','date':'2025-01-02','source':'test','nearest':nearest,'quantity':10,'expenses':{other:{'transport':1000}}})
    assert result['results'][0]['net']==22000 and result['results'][0]['net_advantage']==2000
def test_no_future_feature_leakage():
    series=pd.Series(np.arange(1,201,dtype=float),index=pd.date_range('2024-01-01',periods=200));before=features(series,100);series.iloc[100:]=999999;np.testing.assert_array_equal(before,features(series,100));assert before[0]==100
def test_horizon_target_alignment():
    s=pd.Series(np.arange(200),index=pd.date_range('2024-01-01',periods=200));x,y,origins,targets=supervised(s,7);assert y[0]==96 and origins[0]==90 and targets[0]==96
def test_metrics_actual_values():
    result=metrics([100,200],[110,190]);assert result['MAE']==10 and result['RMSE']==10
def test_insufficient_series(store):
    seed(store,[row()])
    with pytest.raises(ValueError,match='Unsupported'): series_from_store(store,{'state':'Karnataka','district':'Dharwad','market':'Dharwad','commodity':'Maize','variety':'Local','source':'test'})
def test_missing_key():
    connector=DataGovConnector(key='');connector.key=None
    with pytest.raises(SourceUnavailable,match='not configured'): connector.page()
def test_pagination_contract(monkeypatch,store):
    connector=DataGovConnector(key='unit-test-not-real');offsets=[]
    def page(offset,limit,filters):
        offsets.append(offset);return {'records':[row()] if offset==0 else []}
    monkeypatch.setattr(connector,'page',page)
    result=connector.ingest(store,max_pages=1);assert offsets==[0] and result['next_offset']==1
def test_sql_parameterization(store): assert store.catalog('states',{'state':"' OR 1=1 --"})==[]
def test_api_and_csrf(tmp_path):
    app=create_app(tmp_path/'app',testing=True);client=app.test_client();status=client.get('/api/status',base_url='http://localhost').get_json();assert status['verified_records']==0
    assert client.post('/api/selling-comparison',json={},base_url='http://localhost').status_code==403
    assert client.post('/api/selling-comparison',json={},headers={'X-CSRF-Token':status['csrf']},base_url='http://localhost').status_code==400
    assert client.get('/api/prices?limit=1001',base_url='http://localhost').status_code==400
    assert client.get('/api/status',base_url='http://evil.example').status_code==403
def test_parquet_export(store):
    seed(store,[row()]);store.export_parquet();files=list((store.root/'parquet').rglob('*.parquet'));assert len(files)==1
    import duckdb
    assert duckdb.sql(f"SELECT COUNT(*) FROM read_parquet('{files[0]}')").fetchall()[0][0]==1
def test_csv_import(store,tmp_path):
    path=tmp_path/'fixture.csv';pd.DataFrame([row()]).to_csv(path,index=False);result=import_file(store,path,'test fixture','https://example.invalid');assert result['accepted']==1
def test_forecast_missing_model(tmp_path):
    client=create_app(tmp_path,testing=True).test_client();response=client.get('/api/forecast?model_id=missing',base_url='http://localhost');assert response.status_code==400

def test_training_and_registry_on_explicit_unit_fixture(store):
    # This is test-only arithmetic input, NEVER an official research dataset or delivered model.
    from ml_engine.research import train,forecast
    records=[]
    for i,d in enumerate(pd.date_range('2023-01-01',periods=400)):
        r=row();r.update(arrival_date=d.date().isoformat(),min_price='1000',max_price='4000',modal_price=str(2000+i*.5+10*np.sin(i/7)));records.append(r)
    seed(store,records)
    group={'state':'Karnataka','district':'Dharwad','market':'Dharwad','commodity':'Maize','variety':'Local','source':'test'}
    report=train(store,group,(7,));h=report['horizons']['7']
    assert h['status']=='validated'
    assert set(h['validation'])=={'Naive baseline','Seasonal naive','ARIMA','SARIMA','Random Forest','XGBoost'}
    expected=min(h['validation'],key=lambda name:(h['validation'][name]['MAE'],h['validation'][name]['RMSE']))
    assert h['selected']==expected
    assert h['test_period'][0]>h['validation_period'][1]
    result=forecast(store,report['id'],7)
    assert result['date']=='2024-02-11' and result['forecast']>0
    assert store.query('SELECT COUNT(*) n FROM model_registry')[0]['n']==1