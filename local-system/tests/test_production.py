"""Fixtures validate contracts only; none are operational market records."""
import json
from datetime import date
import pytest
from data_engine.agmarknet import AgmarknetConnector, normalize_report
from data_engine.storage import Store
from data_engine.cleaning import ingest_rows
from operations import backup, restore_backup, official_export, atomic_json
from ml_engine.reliability import assess_forecast

def fixture():
    return {'state_name':'Karnataka','district_name':'Dharwad','market_name':'Dharwad',
            'cmdt_name':'Maize','variety_name':'Local','arrival_date':'2025-01-01',
            'model_price':2000,'min_price':1900,'max_price':2100,'unit_name_price':'Rs./Quintal'}

def test_official_units_are_explicit():
    r=normalize_report(fixture());assert r['price_unit']=='INR/quintal' and r['modal_price']==2000
    raw=fixture();raw.pop('unit_name_price');assert normalize_report(raw)['price_unit'] is None

def test_historical_checkpoint_resumes(tmp_path,monkeypatch):
    store=Store(tmp_path);c=AgmarknetConnector();calls=[]
    def page(start,end,page,filters):
        calls.append((start,end,page));return {},[fixture()],2
    monkeypatch.setattr(c,'page',page)
    c.ingest(store,'2025-01-01','2025-01-31',max_pages=1)
    result=c.ingest(store,'2025-01-01','2025-01-31',max_pages=1)
    assert calls==[('2025-01-01','2025-01-31',1),('2025-01-01','2025-01-31',2)]
    assert result['status']=='complete' and store.coverage()['records']==1

def test_private_source_assertions_never_publish(tmp_path):
    store=Store(tmp_path);row=normalize_report(fixture())
    ingest_rows(store,[row],'import:fixture','https://agmarknet.gov.in','fixture')
    assert official_export(store)['records']==[]

def test_backup_integrity_and_atomic_job(tmp_path):
    store=Store(tmp_path/'data');path=backup(store,tmp_path/'backups')
    import sqlite3
    with sqlite3.connect(path) as con:assert con.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    path=tmp_path/'job.json';atomic_json(path,{'status':'completed'})
    assert json.loads(path.read_text())['status']=='completed'

def test_backup_restores_into_separate_database_without_overwriting(tmp_path):
    store=Store(tmp_path/'data')
    with store.connect() as con:con.execute("INSERT INTO checkpoints VALUES('fixture','{}',42,'complete','2026-11-12')")
    saved=backup(store,tmp_path/'backups');target=tmp_path/'recovery'/'metadata.sqlite'
    restore_backup(saved,target)
    import sqlite3
    with sqlite3.connect(target) as con:assert con.execute("SELECT next_offset FROM checkpoints WHERE job='fixture'").fetchone()[0]==42
    with pytest.raises(ValueError,match='must not already exist'):restore_backup(saved,target)

def test_supported_forecast_horizons_have_real_validation_gate():
    fc={'latest_observation':'2025-01-01','selected':'Random Forest','baseline_beaten_on_final_test':True,'evaluation':{'sMAPE':10}}
    assert assess_forecast(fc,today=date(2025,1,2))['supported']
    fc['baseline_beaten_on_final_test']=False
    assert not assess_forecast(fc,today=date(2025,1,2))['supported']

def test_stale_forecast_is_withheld():
    fc={'latest_observation':'2025-01-01','selected':'XGBoost','baseline_beaten_on_final_test':True,'evaluation':{'sMAPE':1}}
    assert not assess_forecast(fc,today=date(2025,1,9),max_age=7)['supported']