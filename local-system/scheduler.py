"""Bounded ingestion and sufficient-new-observation retraining; run as a supervised process."""
import json
import os
from datetime import date, timedelta
from data_engine.agmarknet import AgmarknetConnector
from data_engine.connectors import DataGovConnector, SourceUnavailable
from ml_engine.research import train

def daily_update(store, filters=None, max_pages=10):
    results = {}
    for name, connector in [('agmarknet', AgmarknetConnector()), ('data_gov', DataGovConnector())]:
        try:
            if name == 'agmarknet':
                results[name] = connector.ingest(store,(date.today()-timedelta(days=7)).isoformat(),date.today().isoformat(),filters,max_pages,True)
            else: results[name] = connector.ingest(store,{},max_pages,True)
        except (SourceUnavailable, ValueError) as exc: results[name] = {'status':'failed','reason':str(exc)}
    # Retrain only explicitly registered research groups, never every possible nationwide combination.
    threshold = max(1,int(os.environ.get('RETRAIN_NEW_OBSERVATIONS','100')))
    latest = {}
    for row in store.query('SELECT * FROM model_registry ORDER BY created_at DESC'):
        latest.setdefault(row['group_json'],row)
    retraining = []
    for group_json, row in list(latest.items())[:10]:
        group = json.loads(group_json); previous=json.loads(row['result_json'])
        new = store.observations({**group,'start':(date.fromisoformat(previous['period'][1])+timedelta(days=1)).isoformat()},limit=1)['total']
        if new < threshold: continue
        try: retraining.append({'status':'completed','model_id':train(store,group)['id']})
        except ValueError as exc: retraining.append({'status':'unsupported','reason':str(exc)})
    return {'sources':results,'retraining':retraining}