"""Official data.gov.in connector; unsupported source contracts fail explicitly."""
import json
import os
import time
import uuid
from pathlib import Path
import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from config import DATA_GOV_URL, TIMEOUT, PAUSE, PAGE_SIZE, MAX_PAGES
from .storage import stable_id,utcnow
from .cleaning import ingest_rows

class SourceUnavailable(RuntimeError): pass

class DataGovConnector:
    def __init__(self, key=None, session=None):
        self.key=key or os.environ.get('DATA_GOV_IN_API_KEY')
        self.session=session or requests.Session()
        retry=Retry(total=3,backoff_factor=2,status_forcelist=[429,500,502,503,504],respect_retry_after_header=True,allowed_methods=['GET'])
        self.session.mount('https://',HTTPAdapter(max_retries=retry))

    def page(self, offset=0, limit=PAGE_SIZE, filters=None):
        if not self.key: raise SourceUnavailable('DATA_GOV_IN_API_KEY is not configured. Register at data.gov.in; no replacement data is provided.')
        params={'api-key':self.key,'format':'json','offset':offset,'limit':limit}
        for key,value in (filters or {}).items():
            if key not in ('state','district','market','commodity','arrival_date'): raise ValueError('Unsupported official filter')
            params[f'filters[{key}]']=value
        try:
            response=self.session.get(DATA_GOV_URL,params=params,timeout=TIMEOUT)
            if response.status_code!=200: raise SourceUnavailable(f'data.gov.in returned HTTP {response.status_code}; retry later or check your authorized key.')
            data=response.json()
        except (requests.RequestException,ValueError) as exc:
            raise SourceUnavailable('data.gov.in request failed or returned non-JSON content; see connection status. No records were invented.') from None
        if not isinstance(data,dict) or not isinstance(data.get('records'),list): raise SourceUnavailable('Official response has no valid records array')
        return data

    def ingest(self, store, filters=None, max_pages=MAX_PAGES, reset=False):
        """Resume a bounded current-report snapshot; not a historical completeness claim."""
        filters=filters or {}; job='data_gov:'+stable_id(filters,PAGE_SIZE)
        previous=store.query('SELECT * FROM checkpoints WHERE job=?',(job,))
        offset=0 if reset or not previous else previous[0]['next_offset']
        if previous and previous[0]['status']=='complete' and not reset: return {'status':'complete','message':'Start a new snapshot with --reset; current API offsets are not historical cursors.'}
        results=[]
        for _ in range(min(max_pages,100)):
            try: data=self.page(offset,PAGE_SIZE,filters)
            except SourceUnavailable as exc:
                store.source_status('data_gov','failed',str(exc))
                with store.connect() as con:
                    con.execute('INSERT INTO ingestion_logs(id,source_id,started_at,finished_at,status,message) VALUES(?,?,?, ?,?,?)',(uuid.uuid4().hex,'data_gov',utcnow(),utcnow(),'failed',str(exc)))
                raise
            raw=store.root/'raw'/f'data-gov-{uuid.uuid4().hex}.json'
            raw.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
            result=ingest_rows(store,data['records'],'data_gov',DATA_GOV_URL,raw,default_price_unit='INR/quintal')
            results.append(result); offset+=len(data['records'])
            complete=len(data['records'])<PAGE_SIZE
            with store.connect() as con:
                con.execute('INSERT OR REPLACE INTO checkpoints VALUES(?,?,?,?,?)',(job,json.dumps(filters),offset,'complete' if complete else 'partial',utcnow()))
            store.source_status('data_gov','connected','Official response received and audited. Daily resource; historical coverage not assumed.')
            if complete: break
            time.sleep(PAUSE)
        return {'status':'complete' if complete else 'partial','next_offset':offset,'pages':results}

class CedaConnector:
    """Do not guess undocumented URLs, auth headers or pagination."""
    def discover(self):
        raise SourceUnavailable('CEDA supplied /agmarknet/commodities and /geographies paths returned HTTP 404 in the recorded access audit. Current documentation could not be retrieved. Obtain the current documented base URL, authentication and pagination contract plus an authorized key before enabling. CSV/Excel exports remain supported.')

def import_file(store,path,source_name,source_url,default_price_unit=None):
    path=Path(path)
    if not source_name.strip() or not source_url.strip(): raise ValueError('Original source name and URL are required')
    if path.suffix.lower() not in ('.csv','.xlsx'): raise ValueError('Only CSV and XLSX are supported')
    if path.stat().st_size>20*1024*1024: raise ValueError('Import limit is 20 MB; split larger source exports')
    frame=pd.read_csv(path,dtype=str,keep_default_na=False) if path.suffix.lower()=='.csv' else pd.read_excel(path,dtype=str).fillna('')
    raw=store.root/'raw'/f'{uuid.uuid4().hex}{path.suffix.lower()}'
    raw.write_bytes(path.read_bytes())
    sid='import:'+stable_id(source_name,source_url)
    result=ingest_rows(store,frame.to_dict('records'),sid,source_url,raw,default_price_unit)
    with store.connect() as con:
        con.execute('UPDATE sources SET name=? WHERE id=?',(source_name.strip(),sid))
    return result