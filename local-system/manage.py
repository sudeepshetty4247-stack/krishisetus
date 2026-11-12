"""Reproducible bounded ingestion, evaluation, scheduling and export commands."""
import argparse
import json
import os
import time
from datetime import datetime,timezone
from config import DATA_DIR,MAX_PAGES
from data_engine.storage import Store
from data_engine.connectors import DataGovConnector,CedaConnector,SourceUnavailable,import_file
from ml_engine.research import train

def main():
    parser=argparse.ArgumentParser(description='KRISHISETU local data and research engine')
    parser.add_argument('--data-dir',default=str(DATA_DIR))
    commands=parser.add_subparsers(dest='command',required=True)
    commands.add_parser('init');commands.add_parser('audit');commands.add_parser('export-parquet');commands.add_parser('source-check')
    historical=commands.add_parser('ingest-history');historical.add_argument('--start',required=True);historical.add_argument('--end',required=True);historical.add_argument('--filters',default='{}');historical.add_argument('--max-pages',type=int,default=10);historical.add_argument('--reset',action='store_true')
    back=commands.add_parser('backup');back.add_argument('--directory',required=True)
    imp=commands.add_parser('import');imp.add_argument('file');imp.add_argument('--source-name',required=True);imp.add_argument('--source-url',required=True);imp.add_argument('--price-unit')
    for name in ('ingest','schedule'):
        p=commands.add_parser(name);p.add_argument('--filters',default='{}');p.add_argument('--max-pages',type=int,default=MAX_PAGES);p.add_argument('--reset',action='store_true')
    tr=commands.add_parser('train');tr.add_argument('--group',required=True,help='JSON with state,district,market,commodity,variety,source');tr.add_argument('--horizons',default='7,14,30')
    report=commands.add_parser('report');report.add_argument('--output',default='research-report.json')
    args=parser.parse_args();store=Store(args.data_dir)
    try:
        if args.command=='init': result={'database':str(store.db),'records':store.coverage()['records']}
        elif args.command=='import': result=import_file(store,args.file,args.source_name,args.source_url,args.price_unit)
        elif args.command=='audit': result=store.coverage()
        elif args.command=='export-parquet': result={'parquet':store.export_parquet(),'note':'Snapshots are append-only; DuckDB consumers must deduplicate by observation id when combining repeated exports.'}
        elif args.command=='ingest': result=DataGovConnector().ingest(store,json.loads(args.filters),max_pages=args.max_pages,reset=args.reset)
        elif args.command=='ingest-history':
            from data_engine.agmarknet import AgmarknetConnector
            result=AgmarknetConnector().ingest(store,args.start,args.end,json.loads(args.filters),args.max_pages,args.reset)
        elif args.command=='backup':
            from operations import backup
            result={'backup':backup(store,args.directory)}
        elif args.command=='source-check':
            result={}
            try:
                response=DataGovConnector().page(limit=1);result['data_gov']={'records_returned':len(response['records']),'status':'reachable'}
            except SourceUnavailable as exc: result['data_gov']={'status':'unavailable','reason':str(exc)}
            try: CedaConnector().discover();result['ceda']={'status':'catalogue_reachable','note':'Price download not verified by this catalogue check'}
            except SourceUnavailable as exc: result['ceda']={'status':'unavailable','reason':str(exc)}
            from data_engine.agmarknet import AgmarknetConnector
            try: AgmarknetConnector().discover();result['agmarknet']={'status':'catalogue_reachable'}
            except SourceUnavailable as exc: result['agmarknet']={'status':'unavailable','reason':str(exc)}
            result['enam']={'status':'not_integrated','reason':'No verified officially supported endpoint supplied'}
            result['rems']={'status':'not_integrated','reason':'No verified officially supported endpoint supplied'}
        elif args.command=='train': result=train(store,json.loads(args.group),tuple(int(h) for h in args.horizons.split(',')))
        elif args.command=='report':
            result={'created_at':datetime.now(timezone.utc).isoformat(),'coverage':store.coverage(),'sources':store.query('SELECT * FROM sources'),'models':[json.loads(r['result_json']) for r in store.query('SELECT result_json FROM model_registry')],'limitations':['Counts are stored observations, not nationwide targets.','No model metrics exist until real data training executes.','No verified reporting calendars: missing days cannot be counted as missed reports.','CEDA connector blocked pending current documentation and credentials.','Imports preserve source assertions; they do not independently certify them.','No claim of income improvement or guaranteed profit.']}
            from pathlib import Path
            Path(args.output).write_text(json.dumps(result,indent=2),encoding='utf-8')
        elif args.command=='schedule':
            # Explicit long-running process; survives local offline failures, no background claim.
            hour=int(os.environ.get('DAILY_REFRESH_HOUR_UTC','3'));last_day=None
            if hour not in range(24): raise ValueError('Refresh hour must be 0–23 UTC')
            print('Scheduler running; Ctrl+C stops. Training remains an explicit audited command.')
            while True:
                now=datetime.now(timezone.utc)
                if now.hour==hour and last_day!=now.date():
                    try: print(json.dumps(DataGovConnector().ingest(store,json.loads(args.filters),max_pages=args.max_pages,reset=True)))
                    except SourceUnavailable as exc: print(str(exc))
                    last_day=now.date()
                time.sleep(60)
        else: result={}
        print(json.dumps(result,indent=2,default=str))
    except (ValueError,SourceUnavailable) as exc:
        parser.exit(1,f'{exc}\n')

if __name__=='__main__': main()