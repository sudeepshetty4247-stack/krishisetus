"""Documented CEDA contract tests: identifiers and token here are fixtures only."""
import pytest
from data_engine.connectors import CedaConnector,SourceUnavailable

def test_ceda_missing_authorization(monkeypatch):
    monkeypatch.delenv('CEDA_API_TOKEN',raising=False)
    with pytest.raises(SourceUnavailable,match='authorized'):CedaConnector().discover()

def test_ceda_documented_post_contract():
    class Session:
        def mount(self,*args):pass
        def request(self,method,url,**kwargs):
            assert method=='POST'
            assert url=='https://api.ceda.ashoka.edu.in/v1/agmarknet/markets'
            assert kwargs['headers']=={'Authorization':'Bearer fixture-only-token'}
            assert kwargs['json']=={'commodity_id':4,'state_id':29,'district_id':562,'indicator':'price'}
            class Response:
                ok=True
                def json(self):return {'output':{'type':'success','data':[]}}
            return Response()
    assert CedaConnector('fixture-only-token',Session()).markets(4,29,562)['data']==[]

def test_ceda_rejects_reversed_range():
    with pytest.raises(ValueError):CedaConnector('fixture-only-token').prices(4,29,562,1,'2025-02-01','2025-01-01')