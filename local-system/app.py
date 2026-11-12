"""Independent loopback Flask application. No Lovable runtime or cloud dependency."""
import json
import logging
import os
import secrets
import tempfile
from pathlib import Path
from flask import Flask, jsonify, render_template, request, session
from config import DATA_DIR
from data_engine.storage import Store
from data_engine.connectors import import_file, DataGovConnector, SourceUnavailable
from intelligence_engine.decisions import compare, analytics
from ml_engine.research import forecast, explain

def create_app(data_dir=None, testing=False):
    app=Flask(__name__)
    app.config.update(SECRET_KEY=secrets.token_hex(32),MAX_CONTENT_LENGTH=20*1024*1024,SESSION_COOKIE_HTTPONLY=True,SESSION_COOKIE_SAMESITE='Strict',TESTING=testing)
    store=Store(data_dir or DATA_DIR);app.extensions['store']=store
    logging.basicConfig(level=logging.INFO,format='%(asctime)s %(levelname)s %(message)s')

    @app.before_request
    def protect():
        # Binding to loopback is not enough: prevent browser DNS rebinding and cross-site writes.
        host=request.host.split(':')[0]
        if host not in ('127.0.0.1','localhost','[::1]'): return jsonify(error='Local host required'),403
        if request.method in ('POST','PUT','PATCH','DELETE'):
            token=request.headers.get('X-CSRF-Token','')
            expected=session.get('csrf','')
            if not expected or not secrets.compare_digest(token,expected): return jsonify(error='Reload the page and try again (session token required).'),403
        if 'csrf' not in session: session['csrf']=secrets.token_urlsafe(32)

    @app.after_request
    def secure(response):
        response.headers['X-Content-Type-Options']='nosniff'
        response.headers['X-Frame-Options']='DENY'
        response.headers['Referrer-Policy']='same-origin'
        response.headers['Cache-Control']='no-store' if request.path.startswith('/api/') else 'no-cache'
        return response

    @app.errorhandler(ValueError)
    @app.errorhandler(SourceUnavailable)
    def expected_error(exc): return jsonify(error=str(exc)),400

    @app.errorhandler(413)
    def too_large(exc): return jsonify(error='File exceeds the 20 MB upload limit.'),413

    @app.errorhandler(Exception)
    def unexpected(exc):
        from werkzeug.exceptions import HTTPException
        if isinstance(exc,HTTPException): return jsonify(error=exc.description),exc.code
        app.logger.exception('Local request failed')
        return jsonify(error='The operation failed. Check local logs; no replacement data was generated.'),500

    def filters(): return {key:request.args[key] for key in ('state','district','market','commodity','variety','source','start','end') if request.args.get(key)}
    def pagination():
        limit=int(request.args.get('limit',100));offset=int(request.args.get('offset',0))
        if limit<1 or limit>1000 or offset<0: raise ValueError('Use limit 1–1000 and non-negative offset')
        return limit,offset

    pages={'/':'home','/markets':'markets','/forecast':'forecast','/selling-assistant':'decision','/research':'research','/data-quality':'quality','/help':'help'}
    def page(): return render_template('index.html',view=pages[request.path],csrf=session['csrf'])
    for path in pages: app.add_url_rule(path,'page_'+pages[path],page)

    @app.get('/api/status')
    def status():
        return jsonify(sources=store.query('SELECT * FROM sources'),csrf=session['csrf'],database='local SQLite',mode='local',verified_records=store.coverage()['records'])

    @app.get('/api/catalog/<kind>')
    def catalog(kind):
        limit,offset=pagination(); rows=store.catalog(kind,filters())
        return jsonify(records=rows[offset:offset+limit],total=len(rows),limit=limit,offset=offset)

    @app.get('/api/prices')
    @app.get('/api/arrivals')
    @app.get('/api/trends')
    def prices():
        limit,offset=pagination()
        return jsonify(store.observations(filters(),limit,offset))

    @app.get('/api/quality')
    def quality(): return jsonify(store.coverage(filters()))

    @app.get('/api/ingestion-history')
    def history():
        limit,offset=pagination()
        return jsonify(records=store.query('SELECT * FROM ingestion_logs ORDER BY started_at DESC LIMIT ? OFFSET ?',(limit,offset)))

    @app.post('/api/import')
    def upload():
        file=request.files.get('file')
        if not file or not file.filename: raise ValueError('Choose a CSV or XLSX file')
        suffix=Path(file.filename).suffix.lower()
        if suffix not in ('.csv','.xlsx'): raise ValueError('Only CSV and XLSX are accepted')
        fd,path=tempfile.mkstemp(suffix=suffix);os.close(fd)
        try:
            file.save(path)
            result=import_file(store,path,request.form.get('source_name',''),request.form.get('source_url',''),request.form.get('price_unit') or None)
            return jsonify(result)
        finally: Path(path).unlink(missing_ok=True)

    @app.post('/api/refresh')
    def refresh():
        # One bounded page from the browser; bulk refresh belongs to CLI/scheduler.
        body=request.get_json(silent=True) or {}
        return jsonify(DataGovConnector().ingest(store,body.get('filters',{}),max_pages=1,reset=bool(body.get('reset'))))

    @app.post('/api/selling-comparison')
    def selling():
        body=request.get_json(silent=True)
        if not isinstance(body,dict): raise ValueError('Provide a selling scenario')
        return jsonify(compare(store,body))

    @app.get('/api/analytics')
    def intelligence(): return jsonify(analytics(store,filters()))

    @app.get('/api/models')
    def models():
        limit,offset=pagination()
        rows=store.query('SELECT id,group_json,created_at,result_json FROM model_registry ORDER BY created_at DESC LIMIT ? OFFSET ?',(limit,offset))
        return jsonify(records=[{'id':r['id'],'group':json.loads(r['group_json']),'created_at':r['created_at'],'results':json.loads(r['result_json'])} for r in rows])

    @app.get('/api/forecast')
    def prediction(): return jsonify(forecast(store,request.args.get('model_id',''),int(request.args.get('horizon',7))))

    @app.get('/api/explain')
    def explanation(): return jsonify(explain(store,request.args.get('model_id',''),int(request.args.get('horizon',7))))

    return app

if __name__=='__main__':
    create_app().run(host='127.0.0.1',port=5000,debug=False,threaded=False)