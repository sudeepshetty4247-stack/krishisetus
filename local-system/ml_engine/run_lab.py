"""Execute the weekly model laboratory on stored genuine history and publish evaluation reports."""
import json, os, sys, uuid, time
from datetime import datetime, timezone
from pathlib import Path
import joblib, pandas as pd, requests
from ml_engine.weekly import train_group
from data_engine.history_import import SOURCE_NAME, ROOT
GROUPS=[('Dharwad','Hubli (Amaragol)','Maize','Local'),('Davangere','Davangere','Maize','Local'),('Chitradurga','Chitradurga','Maize','Local'),('Bellary','Kottur','Maize','Hybrid/Local'),('Bagalkot','Bagalakot','Maize','Hybrid/Local'),('Bangalore','Bangalore','Maize','Hybrid/Local'),
        ('Dharwad','Hubli (Amaragol)','Bengal Gram (Gram)(Whole)','Jawari/Local'),('Raichur','Raichur','Bengal Gram (Gram)(Whole)','Jawari/Local'),('Chitradurga','Chitradurga','Bengal Gram (Gram)(Whole)','Average (Whole)'),
        ('Dharwad','Hubli (Amaragol)','Onion','Puna'),('Davangere','Davangere','Onion','Onion'),('Kolar','Kolar','Tomato','Tomato')]
def publish(row):
    url,key=os.environ['SUPABASE_URL'],os.environ['SUPABASE_SERVICE_ROLE_KEY']
    r=requests.post(f'{url}/rest/v1/ml_runs',headers={'apikey':key,'Authorization':f'Bearer {key}','Content-Type':'application/json','Prefer':'return=minimal'},data=json.dumps(row,default=float),timeout=60)
    if not r.ok: raise RuntimeError(f'{r.status_code} {r.text[:300]}')
if __name__=='__main__':
    frame=pd.read_parquet(ROOT/'history'/'karnataka_2021_2026.parquet'); frame['date']=pd.to_datetime(frame.date)
    run_version=datetime.now(timezone.utc).strftime('lab-%Y%m%dT%H%MZ'); models=ROOT/'models'; models.mkdir(parents=True,exist_ok=True); log=[]
    only=sys.argv[1:] 
    for district,market,commodity,variety in GROUPS:
        if only and market not in only: continue
        group={'state':'Karnataka','district':district,'market':market,'commodity':commodity,'variety':variety}; t=time.time()
        try:
            report,artifact,version=train_group(frame,group,SOURCE_NAME); status='trained' if any(h.get('status')=='trained' for h in report['horizons'].values()) else 'insufficient_data'
        except Exception as e:
            report={'group':group,'error':str(e)[:400],'horizons':{}};version='none';status='validation_failed' if 'Insufficient' not in str(e) else 'insufficient_data';artifact=None
        rid=str(uuid.uuid4()); path=None
        if artifact: path=models/f'{rid}.joblib'; joblib.dump(artifact,path); (models/f'{rid}.json').write_text(json.dumps(report,default=float))
        report['training_seconds']=round(time.time()-t,1); report['trained_at']=datetime.now(timezone.utc).isoformat()
        p=report.get('period',[None,None])
        publish({'id':rid,'run_version':run_version,'dataset_version':version,'source_name':SOURCE_NAME,**group,'grade':'all reported grades (daily median)','frequency':'weekly','observations':report.get('observed_weeks',0),'period_start':p[0] or '2021-01-01','period_end':p[1] or '2021-01-01','status':status,'artifact_path':f'local-system/data/models/{rid}.joblib' if path else None,'report':report})
        print(market,commodity,status,report['training_seconds'],{h:(v.get('selected'),round(v['test'][v['selected']]['MAE'],1) if v.get('test') else v.get('reason')) for h,v in report['horizons'].items()},flush=True)
