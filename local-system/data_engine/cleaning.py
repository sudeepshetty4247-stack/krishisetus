"""Reject invalid observations, retain originals and flag rather than delete outliers."""
import json
import math
import uuid
from datetime import date, datetime
import pandas as pd
from .storage import stable_id, utcnow

def text(value):
    if value is None or (not isinstance(value,(list,dict)) and pd.isna(value)): return ''
    return ' '.join(str(value).strip().split())

def number(value, optional=False):
    if not text(value):
        if optional: return None
        raise ValueError('Missing numeric price')
    result=float(str(value).replace(',',''))
    if not math.isfinite(result) or result<0: raise ValueError('Invalid negative or non-finite numeric value')
    return result

def normalize(raw, default_price_unit=None):
    r={str(k).strip().lower().replace(' ','_').replace('-','_'):v for k,v in raw.items()}
    state,district,market,commodity,variety=[text(r.get(k)) for k in ('state','district','market','commodity','variety')]
    if not all((state,district,market,commodity,variety)): raise ValueError('State, district, market, commodity and variety are required')
    value=text(r.get('arrival_date') or r.get('date') or r.get('reporting_date'))
    observed=None
    for fmt in ('%Y-%m-%d','%d/%m/%Y','%d-%m-%Y'):
        try: observed=datetime.strptime(value,fmt).date(); break
        except ValueError: pass
    if observed is None or observed>date.today(): raise ValueError('Invalid or future reporting date')
    unit=text(r.get('price_unit') or r.get('units') or default_price_unit).lower().replace(' ','')
    factors={'inr/quintal':1,'rs/quintal':1,'₹/quintal':1,'inr/qtl':1,'inr/kg':100,'rs/kg':100,'inr/tonne':0.1}
    if unit not in factors: raise ValueError('Unknown price unit; explicit INR/quintal, INR/kg or INR/tonne required')
    modal=number(r.get('modal_price'))*factors[unit]
    minimum=number(r.get('min_price'),True); maximum=number(r.get('max_price'),True)
    minimum=minimum*factors[unit] if minimum is not None else None
    maximum=maximum*factors[unit] if maximum is not None else None
    if modal<=0 or (minimum is not None and minimum>modal) or (maximum is not None and maximum<modal): raise ValueError('Inconsistent minimum, modal or maximum price')
    arrivals=number(r.get('arrivals') or r.get('quantity'),True)
    arrival_unit=text(r.get('arrival_unit')) or None
    if arrivals is not None and not arrival_unit: raise ValueError('Arrival quantity requires its own unit')
    return {'state':state,'district':district,'market':market,'commodity':commodity,'variety':variety,'date':observed.isoformat(),'min':minimum,'max':maximum,'modal':modal,'price_unit':'INR/quintal','arrivals':arrivals,'arrival_unit':arrival_unit,'converted':unit not in ('inr/quintal','rs/quintal','₹/quintal','inr/qtl')}

def ingest_rows(store, rows, source_id, source_url, raw_path, default_price_unit=None):
    jid=uuid.uuid4().hex; now=utcnow(); accepted=rejected=duplicates=0
    with store.connect() as con:
        con.execute('INSERT OR IGNORE INTO sources(id,name,url) VALUES(?,?,?)',(source_id,source_id,source_url))
        con.execute('INSERT INTO ingestion_logs(id,source_id,started_at,status,raw_path) VALUES(?,?,?,\'running\',?)',(jid,source_id,now,str(raw_path)))
        for idx,raw in enumerate(rows):
            original=json.dumps(raw,ensure_ascii=False,default=str)
            def audit(action,reason):
                con.execute('INSERT INTO cleaning_audit(ingestion_id,row_number,action,reason,original_json) VALUES(?,?,?,?,?)',(jid,idx+1,action,reason,original))
            try: r=normalize(raw,default_price_unit)
            except (ValueError,TypeError,OverflowError) as exc:
                rejected+=1; audit('rejected',str(exc)); continue
            mid=stable_id(r['state'],r['district'],r['market']); cid=stable_id(r['commodity']); vid=stable_id(cid,r['variety']); oid=stable_id(mid,cid,vid,r['date'],source_id)
            if con.execute('SELECT 1 FROM observations WHERE id=?',(oid,)).fetchone(): duplicates+=1; audit('duplicate','Source-specific market/commodity/variety/date already stored; original preserved'); continue
            con.execute('INSERT OR IGNORE INTO markets VALUES(?,?,?,?)',(mid,r['state'],r['district'],r['market']))
            con.execute('INSERT OR IGNORE INTO commodities VALUES(?,?)',(cid,r['commodity']))
            con.execute('INSERT OR IGNORE INTO varieties VALUES(?,?,?)',(vid,cid,r['variety']))
            past=con.execute('SELECT modal FROM observations WHERE market_id=? AND commodity_id=? AND variety_id=? AND source_id=? AND date<? ORDER BY date DESC LIMIT 30',(mid,cid,vid,source_id,r['date'])).fetchall()
            suspicious=0
            if len(past)>=10:
                values=pd.Series([x[0] for x in past]); median=values.median(); mad=(values-median).abs().median()
                suspicious=int(abs(r['modal']-median)>6*max(mad,median*.01))
            if suspicious: audit('flagged','Outside six historical median absolute deviations; retained')
            if r['converted']: audit('converted','Explicit source unit converted to INR/quintal')
            con.execute('INSERT INTO observations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(oid,mid,cid,vid,r['date'],r['min'],r['max'],r['modal'],r['price_unit'],r['arrivals'],r['arrival_unit'],source_id,now,jid,suspicious))
            accepted+=1
        con.execute('UPDATE ingestion_logs SET finished_at=?,status=?,retrieved=?,accepted=?,rejected=?,duplicates=? WHERE id=?',(utcnow(),'success' if accepted or duplicates else 'no_valid_rows',len(rows),accepted,rejected,duplicates,jid))
        if accepted: con.execute('UPDATE sources SET last_success=?,status=\'available\' WHERE id=?',(utcnow(),source_id))
    return {'job_id':jid,'retrieved':len(rows),'accepted':accepted,'rejected':rejected,'duplicates':duplicates}