"""Service test records are explicitly synthetic test fixtures, not research input."""
import pytest
from app import create_app

@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setenv('KRISHI_PYTHON_TOKEN','unit-test-only-not-a-production-token')
    return create_app(tmp_path,testing=True).test_client()

def request(client,action,payload):
    return client.post('/service/'+action,json={**payload,'owner':'test-owner'},headers={'Authorization':'Bearer unit-test-only-not-a-production-token'})

def reports():
    base={'state':'Karnataka','district':'Dharwad','commodity':'Maize','variety':'Local','date':'2025-01-02','source_name':'test-fixture','price_unit':'INR/quintal'}
    return [{**base,'market':'Dharwad','modal_price':2000},{**base,'market':'Hubballi','modal_price':2300}]

def test_service_requires_token(client):
    assert client.post('/service/compare',json={}).status_code==401

def test_python_net_value(client):
    response=request(client,'compare',{'records':reports(),'quantity':10,'nearest':'Karnataka|Dharwad|Dharwad','expenses':{'Karnataka|Dharwad|Hubballi':{'transport':1000}}})
    assert response.status_code==200
    row=response.get_json()['results'][0]
    assert row['net']==22000 and row['net_advantage']==2000 and row['break_even_additional_transport']==3000

def test_service_backtest_no_future_dates(client):
    response=request(client,'backtest',{'records':reports(),'quantity':10,'nearest':'Karnataka|Dharwad|Dharwad'})
    assert response.get_json()['periods']==[{'date':'2025-01-02','nearest_net':20000,'highest_price_net':23000,'highest_net':23000,'net_advantage':3000,'best_market':'Hubballi'}]

def test_service_rejects_incompatible_dates(client):
    rows=reports();rows[1]['date']='2025-01-03'
    assert request(client,'compare',{'records':rows,'quantity':10,'nearest':'Karnataka|Dharwad|Dharwad'}).status_code==400

def test_missing_model_returns_error(client):
    assert request(client,'forecast',{'model_id':'missing','horizon':7}).status_code==400

def test_opportunity_threshold_is_applied(client):
    rows=[{**r,'min_price':1000,'max_price':4000} for r in reports()]
    payload={'records':rows,'filters':{'commodity':'Maize','variety':'Local','source':'test-fixture'},'threshold':301}
    assert request(client,'analytics',payload).get_json()['opportunities']==[]
    payload['threshold']=300
    assert request(client,'analytics',payload).get_json()['opportunities'][0]['spread']==300