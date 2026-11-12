"""Historical AGMARKNET ingestion from the GODL-licensed variety-wise daily price compilation.

Source chain: AGMARKNET → data.gov.in "Variety-wise Daily Market Prices Data of Commodity" →
Khandelwal compilation (Kaggle DOI 10.34740/kaggle/dsv/15888319) → Hugging Face yearly Parquet mirror.
Prices are Rs/quintal as published. The compilation has no arrivals column, so arrivals stay absent.

Pipeline: download (retry + SHA-256 manifest) → validate → normalise names → de-duplicate →
local Parquet → optional hosted publication through the service-role-only RPC.
"""
import argparse, hashlib, json, os, time
from datetime import datetime, timezone
from pathlib import Path
import duckdb, pandas as pd, requests

REPO='https://huggingface.co/datasets/DHIVAKARNAIDUSUNKARI/mandi-india-daily-prices-2001-2026/resolve/main/data/mandi_daily_by_year/mandi_daily_{year}.parquet'
SOURCE_NAME='data.gov.in variety-wise history'
SOURCE_URL='https://www.data.gov.in/resource/variety-wise-daily-market-prices-data-commodity'
DATASET='Khandelwal AGMARKNET compilation via Hugging Face DHIVAKARNAIDUSUNKARI/mandi-india-daily-prices-2001-2026'
ROOT=Path(os.environ.get('KRISHI_DATA_DIR',Path(__file__).resolve().parents[1]/'data'))

def download(year,raw_dir,log):
    raw_dir.mkdir(parents=True,exist_ok=True); path=raw_dir/f'mandi_daily_{year}.parquet'
    if path.exists() and path.stat().st_size>0: return path
    for attempt in range(4):
        try:
            with requests.get(REPO.format(year=year),stream=True,timeout=120) as r:
                r.raise_for_status(); tmp=path.with_suffix('.part')
                with open(tmp,'wb') as f:
                    for chunk in r.iter_content(1<<20): f.write(chunk)
                tmp.replace(path); return path
        except Exception as exc:
            log.append({'year':year,'attempt':attempt+1,'error':f'{type(exc).__name__}: {exc}'[:300]}); time.sleep(3*(attempt+1))
    raise RuntimeError(f'Download failed for {year}')

def sha256(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for chunk in iter(lambda:f.read(1<<20),b''): h.update(chunk)
    return h.hexdigest()

def clean(files,where):
    con=duckdb.connect(); paths=','.join(f"'{p}'" for p in files)
    frame=con.execute(f"""SELECT trim(State) state, trim(District) district, trim(Market) market, trim(Commodity) commodity,
      COALESCE(NULLIF(trim(Variety),''),'Not specified') variety, COALESCE(trim(Grade),'') grade, Arrival_Date date,
      Min_Price min_price, Max_Price max_price, Modal_Price modal_price FROM read_parquet([{paths}]) WHERE {where}""").df()
    total=len(frame)
    for c in ('state','district','market','commodity','variety','grade'): frame[c]=frame[c].astype(str).str.split().str.join(' ')
    # Canonical commodity spelling shared with the hosted daily sync: no space before '('.
    frame['commodity']=frame.commodity.str.replace(r'\s+\(','(',regex=True).str.replace(r'\)\s+\(',')(',regex=True)
    valid=(frame.modal_price>0)&(frame.modal_price<1e7)&(frame.min_price.isna()|(frame.min_price<=frame.modal_price))&(frame.max_price.isna()|(frame.max_price>=frame.modal_price))
    rejected=frame[~valid]; frame=frame[valid]
    key=['state','district','market','commodity','variety','grade','date']
    dupes=int(frame.duplicated(key).sum()); frame=frame.drop_duplicates(key,keep='last')
    frame['suspicious']=frame.min_price.notna()&frame.max_price.notna()&(frame.max_price>frame.min_price*4)
    return frame.sort_values(key).reset_index(drop=True),{'received':total,'rejected':int(len(rejected)),'duplicates':dupes,'stored':int(len(frame))}

def publish(frame,log):
    url,key=os.environ['SUPABASE_URL'],os.environ['SUPABASE_SERVICE_ROLE_KEY']
    headers={'apikey':key,'Authorization':f'Bearer {key}','Content-Type':'application/json'}
    retrieved=datetime.now(timezone.utc).isoformat(); stored=0
    records=frame.assign(date=frame.date.astype(str),retrieved_at=retrieved).astype(object).where(frame.notna(),None).to_dict('records')
    for i in range(0,len(records),2000):
        body={'records':records[i:i+2000],'p_source':SOURCE_NAME,'p_url':SOURCE_URL,'p_dataset':DATASET}
        for attempt in range(4):
            r=requests.post(f'{url}/rest/v1/rpc/publish_official_reports',headers=headers,data=json.dumps(body,default=str),timeout=120)
            if r.ok: stored+=int(r.json()); break
            log.append({'batch':i,'status':r.status_code,'error':r.text[:300]}); time.sleep(2*(attempt+1))
        else: raise RuntimeError(f'Hosted publication failed at batch {i}')
    requests.post(f'{url}/rest/v1/rpc/refresh_agri_summary',headers=headers,data='{}',timeout=200)
    return stored

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('--years',default='2021-2026'); p.add_argument('--where',default='true')
    p.add_argument('--out',default='history.parquet'); p.add_argument('--publish',action='store_true'); a=p.parse_args()
    lo,hi=map(int,a.years.split('-')); log=[]; raw=ROOT/'raw'
    files=[download(y,raw,log) for y in range(lo,hi+1)]
    frame,stats=clean(files,a.where); out=ROOT/'history'/a.out; out.parent.mkdir(parents=True,exist_ok=True); frame.to_parquet(out,index=False)
    manifest={'source':SOURCE_NAME,'source_url':SOURCE_URL,'dataset':DATASET,'licence':'Government Open Data License - India','unit':'INR/quintal','files':{p.name:sha256(p) for p in files},'filter':a.where,'stats':stats,'first_date':str(frame.date.min()),'last_date':str(frame.date.max()),'created_at':datetime.now(timezone.utc).isoformat(),'failures':log}
    if a.publish: manifest['hosted_stored']=publish(frame,log)
    out.with_suffix('.manifest.json').write_text(json.dumps(manifest,indent=2)); print(json.dumps({k:v for k,v in manifest.items() if k!='files'},indent=1))
