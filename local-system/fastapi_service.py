"""HTTPS deployment entrypoint; local Flask UI remains independently runnable."""
import json
import logging
import os
import secrets
import sqlite3
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from starlette.middleware.wsgi import WSGIMiddleware
from data_engine.analytical_store import AnalyticalStore
from data_engine.storage import Store, stable_id
from config import DATA_DIR
from pydantic import BaseModel, Field
from typing import Literal

class ForecastRequest(BaseModel):
    owner: str = Field(min_length=1,max_length=100)
    model_id: str = Field(default='',max_length=100)
    filters: dict[str,str] = Field(default_factory=dict)
    horizon: Literal[7,14,30] = 7

class CompareRequest(BaseModel):
    forecasts: list[ForecastRequest] = Field(min_length=1,max_length=5)

log = logging.getLogger('krishisetu.service')

def create_service(root=None):
    root=Path(root or DATA_DIR);root.mkdir(parents=True,exist_ok=True)
    app=FastAPI(title='KRISHISETU Python service',version='2.0',docs_url=None,redoc_url=None,openapi_url=None)
    token=os.environ.get('KRISHI_PYTHON_TOKEN','')
    history=AnalyticalStore(root)
    rate_db=root/'request_limits.sqlite'
    with sqlite3.connect(rate_db) as con:
        con.execute('CREATE TABLE IF NOT EXISTS requests(bucket TEXT PRIMARY KEY, minute INTEGER NOT NULL, count INTEGER NOT NULL)')

    def authorize(authorization: str = Header(default='')):
        if not token or not secrets.compare_digest(authorization, 'Bearer '+token):
            raise HTTPException(401,detail='Service authorization required')

    def owner_store(owner: str):
        if not owner or len(owner)>100: raise HTTPException(422,detail='Authenticated owner required')
        return Store(root/'service'/stable_id(owner))

    @app.middleware('http')
    async def boundaries(request:Request,call_next):
        started=time.monotonic();rid=uuid.uuid4().hex
        # No URLs, bodies, authorization headers or account identifiers are logged.
        public=request.url.path in ('/health','/service/health')
        if not public:
            header=request.headers.get('authorization','')
            if not token or not secrets.compare_digest(header,'Bearer '+token):
                return JSONResponse({'error':'Service authorization required'},401)
            owner=request.headers.get('x-owner-id','shared-proxy')[:100]
            bucket=stable_id(owner);minute=int(time.time()//60)
            with sqlite3.connect(rate_db,timeout=5) as con:
                con.execute('DELETE FROM requests WHERE minute<?',(minute-2,))
                con.execute('INSERT INTO requests VALUES(?,?,1) ON CONFLICT(bucket) DO UPDATE SET count=CASE WHEN minute=excluded.minute THEN count+1 ELSE 1 END,minute=excluded.minute',(bucket,minute))
                count=con.execute('SELECT count FROM requests WHERE bucket=?',(bucket,)).fetchone()[0]
            if count>60:return JSONResponse({'error':'Too many requests; retry next minute'},429,headers={'Retry-After':'60'})
        length=request.headers.get('content-length')
        if length and (not length.isdigit() or int(length)>20*1024*1024):return JSONResponse({'error':'Request exceeds 20 MB'},413)
        if request.method in ('POST','PUT','PATCH'):
            if len(await request.body())>20*1024*1024:return JSONResponse({'error':'Request exceeds 20 MB'},413)
        response=await call_next(request)
        response.headers['X-Request-ID']=rid;response.headers['Cache-Control']='no-store'
        response.headers['X-Content-Type-Options']='nosniff'
        log.info('request=%s status=%s seconds=%.3f',rid,response.status_code,time.monotonic()-started)
        return response

    @app.exception_handler(ValueError)
    async def invalid(request,exc):return JSONResponse({'error':str(exc)},422)

    @app.exception_handler(Exception)
    async def unavailable(request,exc):
        log.error('Service operation failed: %s',type(exc).__name__)
        return JSONResponse({'error':'Operation unavailable; no replacement prices or predictions generated'},503)

    @app.get('/health')
    @app.get('/service/health')
    def health():return {'status':'alive','contract_version':2,'python':True,'ready':False,'note':'Liveness only; use authenticated readiness for dataset/model checks'}

    @app.get('/ready',dependencies=[Depends(authorize)])
    @app.get('/v1/ready',dependencies=[Depends(authorize)])
    def ready(owner:str=Query(min_length=1,max_length=100)):
        store=owner_store(owner)
        artifacts=store.query('SELECT artifact FROM model_registry')
        models=sum(Path(r['artifact']).is_file() for r in artifacts)
        try:meta,_=history.metadata();data_ready=True
        except ValueError:meta=None;data_ready=False
        ok=data_ready and models>0
        return JSONResponse({'ready':ok,'history_available':data_ready,'loadable_artifact_paths':models,
                             'history_version':meta.get('cleaned_sha256') if meta else None,
                             'current_forecast_verified':False},200 if ok else 503)

    @app.get('/history',dependencies=[Depends(authorize)])
    @app.get('/v1/history',dependencies=[Depends(authorize)])
    def historical(state:str=Query('',max_length=200),district:str=Query('',max_length=200),market:str=Query('',max_length=200),commodity:str=Query('',max_length=200),variety:str=Query('',max_length=200),grade:str=Query('',max_length=100),start:str='',end:str='',limit:int=Query(100,ge=1,le=1000),offset:int=Query(0,ge=0,le=100000),aggregate:bool=False):
        return history.query(dict(state=state,district=district,market=market,commodity=commodity,variety=variety,grade=grade,start=start,end=end),limit,offset,aggregate)

    def registered(owner,model_id):
        store=owner_store(owner)
        rows=store.query('SELECT * FROM model_registry WHERE id=?',(model_id,))
        if not rows:raise HTTPException(404,detail='Model is not registered for this account')
        return store,rows[0]

    @app.get('/models',dependencies=[Depends(authorize)])
    @app.get('/v1/models',dependencies=[Depends(authorize)])
    def models(owner:str=Query(min_length=1,max_length=100)):
        return {'records':[{'id':r['id'],'created_at':r['created_at'],'dataset_version':r['dataset_version'],'group':json.loads(r['group_json']),'artifact_available':Path(r['artifact']).is_file()} for r in owner_store(owner).query('SELECT * FROM model_registry ORDER BY created_at DESC LIMIT 200')]}

    @app.get('/v1/models/{model_id}',dependencies=[Depends(authorize)])
    def model(model_id:str,owner:str=Query(min_length=1,max_length=100)):
        _,row=registered(owner,model_id)
        return {'id':row['id'],'trained_at':row['created_at'],'dataset_version':row['dataset_version'],
                'artifact_available':Path(row['artifact']).is_file(),'evaluation':json.loads(row['result_json'])}

    @app.get('/v1/forecast/{horizon}',dependencies=[Depends(authorize)])
    def predict(horizon:int,model_id:str=Query(min_length=1,max_length=100),owner:str=Query(min_length=1,max_length=100)):
        if horizon not in (7,14,30):raise HTTPException(422,detail='Only validated 7, 14 or 30 day endpoints are eligible')
        store,row=registered(owner,model_id)
        if not Path(row['artifact']).is_file():raise HTTPException(503,detail='Registered model artifact is missing')
        from ml_engine.research import forecast
        from ml_engine.reliability import assess_forecast
        result=forecast(store,model_id,horizon);gate=assess_forecast(result)
        if not gate['supported']:return JSONResponse({'available':False,'error':gate['reason'],'reliability':gate},422)
        return {**result,'generated_at':datetime.now(timezone.utc).isoformat(),'reliability':gate,'available':True}

    @app.post('/forecast',dependencies=[Depends(authorize)])
    def forecast_request(body:ForecastRequest):
        model_id=body.model_id
        if not model_id:
            required=('state','district','market','commodity','variety','source')
            if not all(body.filters.get(k) for k in required):raise HTTPException(422,detail='Choose one full crop, variety, source and market identity')
            for row in owner_store(body.owner).query('SELECT id,group_json FROM model_registry ORDER BY created_at DESC'):
                group=json.loads(row['group_json'])
                if all(group.get(k)==body.filters[k] for k in required) and group.get('grade','')==body.filters.get('grade',''):
                    model_id=row['id'];break
            if not model_id:raise HTTPException(404,detail='No registered model exists for this exact source and market')
        return predict(body.horizon,model_id,body.owner)

    @app.post('/forecast/compare',dependencies=[Depends(authorize)])
    def forecast_compare(body:CompareRequest):
        results=[]
        for item in body.forecasts:
            try:
                result=forecast_request(item)
                if isinstance(result,JSONResponse):result=json.loads(result.body)
                results.append(result)
            except HTTPException as exc:results.append({'available':False,'error':exc.detail,'status':exc.status_code})
        return {'results':results,'basis':'Independent exact-horizon estimates; not market-price or net-return rankings'}

    @app.get('/model-status',dependencies=[Depends(authorize)])
    def model_status(model_id:str,owner:str):return model(model_id,owner)

    @app.get('/training-status',dependencies=[Depends(authorize)])
    def training_status(job_id:str,owner:str):return retraining(job_id,owner)

    @app.get('/v1/explanation/{model_id}',dependencies=[Depends(authorize)])
    def explanation(model_id:str,owner:str=Query(min_length=1,max_length=100),horizon:int=Query(7)):
        store,_=registered(owner,model_id)
        if horizon not in (7,14,30):raise HTTPException(422,detail='Unsupported horizon')
        from ml_engine.research import explain
        return explain(store,model_id,horizon)

    @app.get('/v1/retraining/{job_id}',dependencies=[Depends(authorize)])
    def retraining(job_id:str,owner:str=Query(min_length=1,max_length=100)):
        if len(job_id)!=32 or any(c not in '0123456789abcdef' for c in job_id):raise HTTPException(422,detail='Invalid job ID')
        path=owner_store(owner).root/'models'/f'job-{job_id}.json'
        if not path.is_file():raise HTTPException(404,detail='Training job not found for this account')
        return json.loads(path.read_text())

    from yield_engine.api import yield_router
    yield_root=Path(os.environ.get('KRISHI_YIELD_ROOT',str(root/'yield-output')))
    app.include_router(yield_router(yield_root),dependencies=[Depends(authorize)])

    # Preserve the existing analytics/train/job/forecast protocol. Flask's local-only pages stay host-protected.
    from app import create_app
    app.mount('/',WSGIMiddleware(create_app(root)))
    return app

app=create_service()