"""Contract/security fixtures, not production performance evidence."""
import json
from pathlib import Path
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from fastapi_service import create_service
from data_engine.analytical_store import AnalyticalStore,digest
from data_engine.storage import Store,stable_id

TOKEN='unit-test-only-not-a-production-token'
@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setenv('KRISHI_PYTHON_TOKEN',TOKEN)
    return TestClient(create_service(tmp_path))

def auth():return {'Authorization':'Bearer '+TOKEN}

def test_health_is_not_model_readiness(client):
    assert client.get('/health').json()['ready'] is False
    assert client.get('/v1/ready?owner=fixture',headers=auth()).status_code==503

def test_history_requires_service_auth(client):
    assert client.get('/v1/history').status_code==401

@pytest.mark.parametrize('horizon',[7,14,30])
def test_missing_model_never_returns_prediction(client,horizon):
    response=client.get(f'/v1/forecast/{horizon}?owner=fixture&model_id=missing',headers=auth())
    assert response.status_code==404
    assert 'forecast' not in response.json()

def test_thirty_day_is_not_twenty_eight(client):
    assert client.get('/v1/forecast/28?owner=fixture&model_id=missing',headers=auth()).status_code==422

def test_model_metadata_is_owner_scoped(client,tmp_path):
    s=Store(tmp_path/'service'/stable_id('owner-one'))
    with s.connect() as con:con.execute('INSERT INTO model_registry VALUES(?,?,?,?,?,?)',('model-one','{}','v1','2026-01-01','missing','{}'))
    assert client.get('/v1/models/model-one?owner=owner-two',headers=auth()).status_code==404
    assert client.get('/v1/models/model-one?owner=owner-one',headers=auth()).json()['artifact_available'] is False

def test_rate_limit_is_durable(client):
    for _ in range(60):assert client.get('/v1/models?owner=fixture',headers=auth()).status_code==200
    assert client.get('/v1/models?owner=fixture',headers=auth()).status_code==429

def fixture_history(root,duplicate=False):
    a=AnalyticalStore(root);a.root.mkdir(parents=True)
    rows=[dict(state='Karnataka',district='Dharwad',market='Hubli',commodity='Maize',variety='Local',grade='',date=pd.Timestamp('2024-01-01'),min_price=1900.,max_price=2100.,modal_price=2000.)]
    if duplicate:rows.append(rows[0].copy())
    file=a.root/'fixture.parquet';pd.DataFrame(rows).to_parquet(file)
    manifest=a.root/'fixture.json';manifest.write_text(json.dumps({'records':len(rows),'cleaned_sha256':digest(file),'dataset':'explicit fixture','source':'fixture'}))
    return a,file,manifest

def test_history_preserves_dates_units_and_pagination(tmp_path):
    a,file,manifest=fixture_history(tmp_path);a.activate(file,manifest)
    r=a.query({'commodity':'Maize'},limit=1)
    assert r['records'][0]['date']=='2024-01-01'
    assert r['records'][0]['modal_price']==2000
    assert r['price_unit']=='INR/quintal'
    assert a.query({'commodity':'custom crop'})['records']==[]

def test_history_activation_refuses_duplicates_without_discarding(tmp_path):
    a,file,manifest=fixture_history(tmp_path,True)
    with pytest.raises(ValueError,match='duplicate'):a.activate(file,manifest)
    assert not a.pointer.exists()

def test_history_activation_refuses_bad_checksum(tmp_path):
    a,file,manifest=fixture_history(tmp_path);manifest.write_text(json.dumps({'records':1,'cleaned_sha256':'wrong'}))
    with pytest.raises(ValueError,match='SHA-256'):a.activate(file,manifest)