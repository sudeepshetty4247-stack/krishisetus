"""Authenticated Python service contract shared with the hosted preview.
Deploy behind HTTPS or run locally. No credentials or public tunnel is provisioned here.
"""
import os
import secrets
import json
import threading
import uuid
from pathlib import Path
import pandas as pd
from flask import Blueprint,request,jsonify
from data_engine.storage import Store,stable_id,utcnow
from data_engine.cleaning import ingest_rows
from intelligence_engine.decisions import analytics,net_value,break_even_transport
from ml_engine.research import train,forecast,explain
from operations import atomic_json,official_export

def install_service(app,root):
    service=Blueprint('python_service',__name__)
    token=os.environ.get('KRISHI_PYTHON_TOKEN')
    def owner_store(owner):
        if not isinstance(owner,str) or not owner or len(owner)>100: raise ValueError('Authenticated owner required')
        return Store(Path(root)/'service'/stable_id(owner))

    @service.before_request
    def authenticate():
        if request.path=='/service/health':return
        header=request.headers.get('Authorization','')
        if not token or not secrets.compare_digest(header,'Bearer '+token):return jsonify(error='Service authorization required'),401

    @service.get('/service/health')
    def health():return jsonify(status='alive',python=True,ready=False,contract_version=1,message='Liveness only, not model readiness')

    @service.post('/service/official-reports')
    def source_reports():
        body=request.get_json(silent=True) or {}
        return jsonify(official_export(Store(root),int(body.get('offset',0)),int(body.get('limit',1000))))

    @service.post('/service/<action>')
    def operation(action):
        body=request.get_json(silent=True)
        if not isinstance(body,dict):raise ValueError('JSON request required')
        store=owner_store(body.get('owner'));filters=body.get('filters',{});records=body.get('records',[])
        if not isinstance(records,list) or len(records)>10000:raise ValueError('At most 10,000 validated records per operation')
        if action in ('train','analytics'):
            raw=[]
            for r in records:
                raw.append({**r,'arrival_date':r['date'],'price_unit':'INR/quintal'})
            if raw:
                path=store.root/'raw'/f'service-{uuid.uuid4().hex}.json';path.write_text(json.dumps(raw),encoding='utf-8');ingest_rows(store,raw,filters.get('source',''),'',path)
        if action=='analytics':
            result=analytics(store,filters);threshold=float(body.get('threshold',100))
            if not __import__('math').isfinite(threshold) or threshold<0:raise ValueError('Threshold must be finite and non-negative')
            result['opportunities']=[r for r in result.get('spreads',[]) if r['spread']>=threshold]
            result['opportunity_basis']='Same-day maximum minus minimum reported price meets the entered threshold; this is not net income or a forecast.'
            return jsonify(result)
        if action=='compare':
            quantity=float(body.get('quantity',0));expenses=body.get('expenses',{});nearest=body.get('nearest');rows=[]
            for r in records:
                key='|'.join([r['state'],r['district'],r['market']]);cost=expenses.get(key,{})
                rows.append({**r,'market_key':key,'gross':r['modal_price']*quantity,'expenses':sum(float(cost.get(k,0)) for k in ('transport','handling','other')),'net':net_value(r['modal_price'],quantity,cost.get('transport',0),cost.get('handling',0),cost.get('other',0))})
            current=next((r for r in rows if r['market_key']==nearest),None)
            if current is None:raise ValueError('Current market has no compatible report')
            if len({(r['date'],r['commodity'],r['variety'],r.get('grade',''),r.get('price_unit'),r['source_name']) for r in rows})!=1:raise ValueError('Comparisons require one date, commodity, variety, grade, unit and source')
            if any(r.get('price_unit')!='INR/quintal' or r.get('suspicious') or r.get('variety')=='Not specified' for r in rows):raise ValueError('Comparable reports require verified units, variety and reviewed prices')
            for r in rows:
                r['net_advantage']=r['net']-current['net'];other=expenses.get(r['market_key'],{});base=expenses.get(nearest,{})
                r['break_even_additional_transport']=break_even_transport(r['modal_price'],current['modal_price'],quantity,float(other.get('handling',0))+float(other.get('other',0))-float(base.get('handling',0))-float(base.get('other',0)))
            return jsonify(results=sorted(rows,key=lambda r:r['net'],reverse=True),message='Same source/date/commodity/variety. User expense estimates only; no guaranteed income.')
        if action=='backtest':
            quantity=float(body.get('quantity',10));expenses=body.get('expenses',{});nearest=body.get('nearest');periods=[]
            if not nearest:raise ValueError('Choose a current-market key for historical backtesting')
            grouped={}
            for r in records:grouped.setdefault((r['date'],r['commodity'],r['variety'],r['source_name']),[]).append(r)
            for group,rows in sorted(grouped.items()):
                available=[]
                for r in rows:
                    key='|'.join([r['state'],r['district'],r['market']]);cost=expenses.get(key,{})
                    available.append({**r,'key':key,'net':net_value(r['modal_price'],quantity,cost.get('transport',0),cost.get('handling',0),cost.get('other',0))})
                current=next((r for r in available if r['key']==nearest),None)
                if current is None:continue
                high=max(available,key=lambda r:r['modal_price']);best=max(available,key=lambda r:r['net'])
                periods.append({'date':group[0],'nearest_net':current['net'],'highest_price_net':high['net'],'highest_net':best['net'],'net_advantage':best['net']-current['net'],'best_market':best['market']})
            return jsonify(periods=periods,message='Historical same-day report simulation, no future records. Fixed user-entered costs; not evidence of actual farmer income improvement.')
        if action=='train':
            horizons=body.get('horizons',[7]);jid=uuid.uuid4().hex;path=store.root/'models'/f'job-{jid}.json'
            atomic_json(path,{'job_id':jid,'status':'queued'})
            def worker():
                atomic_json(path,{'job_id':jid,'status':'running','message':'Python chronological model comparison running'})
                try:
                    report=train(store,filters,tuple(horizons));atomic_json(path,{'job_id':jid,'status':'completed','model_id':report['id'],'report':report})
                except Exception as exc:atomic_json(path,{'job_id':jid,'status':'failed','error':str(exc)})
            threading.Thread(target=worker,daemon=False).start()
            return jsonify(job_id=jid,status='queued')
        if action=='job':
            jid=body.get('job_id','')
            if not isinstance(jid,str) or len(jid)!=32 or not all(c in '0123456789abcdef' for c in jid):raise ValueError('Invalid job ID')
            path=store.root/'models'/f'job-{jid}.json'
            if not path.exists():raise ValueError('Training job not found')
            result=json.loads(path.read_text())
            if result.get('report'):
                h=next((v for v in result['report']['horizons'].values() if v.get('status')=='validated'),{})
                result['predictions']=h.get('predictions',[]);result['comparison']=[{'model':name,**values} for name,values in h.get('test',{}).items()]
            return jsonify(result)
        if action=='models':return jsonify(records=[{'id':r['id'],'created_at':r['created_at'],'group':json.loads(r['group_json'])} for r in store.query('SELECT id,created_at,group_json FROM model_registry ORDER BY created_at DESC')])
        if action=='forecast':
            model_id=body.get('model_id','')
            if not model_id:
                required=('state','district','market','commodity','variety','source')
                if not all(filters.get(k) for k in required):raise ValueError('Choose one source, commodity, variety and full market identity')
                models=store.query('SELECT id,group_json FROM model_registry ORDER BY created_at DESC')
                model_id=next((r['id'] for r in models if all(json.loads(r['group_json']).get(k)==filters[k] for k in required)),None)
                if not model_id:raise ValueError('No validated model exists for this source and market')
            result=forecast(store,model_id,int(body.get('horizon',7)))
            from ml_engine.reliability import assess_forecast
            result['reliability']=assess_forecast(result)
            if not result['reliability']['supported']:
                return jsonify(error=result['reliability']['reason'],reliability=result['reliability']),422
            return jsonify(result)
        if action=='explain':return jsonify(explain(store,body.get('model_id',''),int(body.get('horizon',7))))
        raise ValueError('Unknown service action')
    app.register_blueprint(service)