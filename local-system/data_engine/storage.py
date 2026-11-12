"""SQLite metadata, observations and audited ingestion; Parquet analytical exports."""
import hashlib
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd

def utcnow():
    return datetime.now(timezone.utc).isoformat()

SCHEMA = '''
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS sources(id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'not_connected', checked_at TEXT, last_success TEXT, message TEXT);
CREATE TABLE IF NOT EXISTS markets(id TEXT PRIMARY KEY, state TEXT NOT NULL, district TEXT NOT NULL, name TEXT NOT NULL, UNIQUE(state,district,name));
CREATE TABLE IF NOT EXISTS commodities(id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS varieties(id TEXT PRIMARY KEY, commodity_id TEXT NOT NULL REFERENCES commodities(id), name TEXT NOT NULL, UNIQUE(commodity_id,name));
CREATE TABLE IF NOT EXISTS ingestion_logs(id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id), started_at TEXT NOT NULL, finished_at TEXT, status TEXT NOT NULL, retrieved INTEGER NOT NULL DEFAULT 0, accepted INTEGER NOT NULL DEFAULT 0, rejected INTEGER NOT NULL DEFAULT 0, duplicates INTEGER NOT NULL DEFAULT 0, raw_path TEXT, message TEXT);
CREATE TABLE IF NOT EXISTS observations(id TEXT PRIMARY KEY, market_id TEXT NOT NULL REFERENCES markets(id), commodity_id TEXT NOT NULL REFERENCES commodities(id), variety_id TEXT NOT NULL REFERENCES varieties(id), date TEXT NOT NULL, min REAL, max REAL, modal REAL NOT NULL CHECK(modal>0), price_unit TEXT NOT NULL, arrivals REAL, arrival_unit TEXT, source_id TEXT NOT NULL REFERENCES sources(id), retrieved_at TEXT NOT NULL, ingestion_id TEXT NOT NULL REFERENCES ingestion_logs(id), suspicious INTEGER NOT NULL DEFAULT 0, UNIQUE(market_id,commodity_id,variety_id,date,source_id));
CREATE INDEX IF NOT EXISTS observations_lookup ON observations(commodity_id,market_id,variety_id,date);
CREATE TABLE IF NOT EXISTS cleaning_audit(id INTEGER PRIMARY KEY AUTOINCREMENT, ingestion_id TEXT NOT NULL REFERENCES ingestion_logs(id), row_number INTEGER NOT NULL, action TEXT NOT NULL, reason TEXT NOT NULL, original_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS checkpoints(job TEXT PRIMARY KEY, parameters TEXT NOT NULL, next_offset INTEGER NOT NULL, status TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS model_registry(id TEXT PRIMARY KEY, group_json TEXT NOT NULL, dataset_version TEXT NOT NULL, created_at TEXT NOT NULL, artifact TEXT NOT NULL, result_json TEXT NOT NULL);
'''

def stable_id(*parts):
    return hashlib.sha256(json.dumps(parts, ensure_ascii=False).encode()).hexdigest()[:32]

class Store:
    def __init__(self, root):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        for name in ('raw', 'parquet', 'models', 'exports'):
            (self.root / name).mkdir(exist_ok=True)
        self.db = self.root / 'metadata.sqlite'
        with self.connect() as con:
            con.executescript(SCHEMA)
            for sid, name, url in [('agmarknet','AGMARKNET','https://agmarknet.gov.in/'),('data_gov','data.gov.in / AGMARKNET','https://data.gov.in/'),('ceda','CEDA Agri Market Data','https://api.ceda.ashoka.edu.in/'),('enam','e-NAM','https://enam.gov.in/'),('rems','ReMS Karnataka','https://www.remsl.in/')]:
                con.execute('INSERT OR IGNORE INTO sources(id,name,url) VALUES(?,?,?)',(sid,name,url))

    @contextmanager
    def connect(self):
        con = sqlite3.connect(self.db, timeout=30)
        con.row_factory = sqlite3.Row
        con.execute('PRAGMA foreign_keys=ON')
        try:
            yield con
            con.commit()
        except Exception:
            con.rollback()
            raise
        finally:
            con.close()

    def query(self, sql, params=()):
        with self.connect() as con:
            return [dict(r) for r in con.execute(sql, params).fetchall()]

    def source_status(self, sid, status, message):
        now = utcnow()
        with self.connect() as con:
            con.execute('UPDATE sources SET status=?,message=?,checked_at=?,last_success=CASE WHEN ?=\'connected\' THEN ? ELSE last_success END WHERE id=?',(status,message,now,status,now,sid))

    def where(self, filters):
        columns = {'state':'m.state','district':'m.district','market':'m.name','commodity':'c.name','variety':'v.name','source':'o.source_id'}
        clauses=[]; values=[]
        for key, column in columns.items():
            if filters.get(key): clauses.append(f'{column}=?'); values.append(filters[key])
        for key, operator in [('start','>='),('end','<=')]:
            if filters.get(key): clauses.append(f'o.date{operator}?'); values.append(filters[key])
        return (' WHERE '+' AND '.join(clauses) if clauses else ''), values

    def observations(self, filters=None, limit=100, offset=0):
        where, params = self.where(filters or {})
        base=' FROM observations o JOIN markets m ON m.id=o.market_id JOIN commodities c ON c.id=o.commodity_id JOIN varieties v ON v.id=o.variety_id'
        total=self.query('SELECT COUNT(*) AS n'+base+where,params)[0]['n']
        rows=self.query('SELECT o.*, m.state,m.district,m.name AS market,c.name AS commodity,v.name AS variety'+base+where+' ORDER BY o.date DESC,o.id LIMIT ? OFFSET ?',(*params,limit,offset))
        return {'records':rows,'total':total,'limit':limit,'offset':offset}

    def catalog(self, kind, filters):
        columns={'states':'m.state','districts':'m.district','markets':'m.name','commodities':'c.name','varieties':'v.name'}
        if kind not in columns: raise ValueError('Unknown catalogue')
        where,params=self.where(filters)
        return self.query(f'SELECT DISTINCT {columns[kind]} AS name FROM observations o JOIN markets m ON m.id=o.market_id JOIN commodities c ON c.id=o.commodity_id JOIN varieties v ON v.id=o.variety_id'+where+' ORDER BY name',params)

    def coverage(self, filters=None):
        where,params=self.where(filters or {})
        base=' FROM observations o JOIN markets m ON m.id=o.market_id JOIN commodities c ON c.id=o.commodity_id JOIN varieties v ON v.id=o.variety_id'
        stats=self.query('SELECT COUNT(*) records,COUNT(DISTINCT m.state) states,COUNT(DISTINCT m.state||\'|\'||m.district) districts,COUNT(DISTINCT o.market_id) markets,COUNT(DISTINCT o.commodity_id) commodities,COUNT(DISTINCT o.variety_id) varieties,MIN(o.date) earliest,MAX(o.date) latest,MAX(o.retrieved_at) last_update,SUM(CASE WHEN o.min IS NULL OR o.max IS NULL THEN 1 ELSE 0 END) missing_price_fields,SUM(CASE WHEN o.arrivals IS NULL THEN 1 ELSE 0 END) missing_arrivals,SUM(o.suspicious) suspicious'+base+where,params)[0]
        stats['source_distribution']=self.query('SELECT o.source_id source,COUNT(*) records'+base+where+' GROUP BY o.source_id',params)
        stats['state_distribution']=self.query('SELECT m.state,COUNT(*) records,COUNT(DISTINCT o.market_id) markets'+base+where+' GROUP BY m.state',params)
        stats['year_coverage']=self.query('SELECT substr(o.date,1,4) year,COUNT(*) records'+base+where+' GROUP BY year',params)
        stats['jobs']=self.query('SELECT status,COUNT(*) jobs,COALESCE(SUM(retrieved),0) retrieved,COALESCE(SUM(rejected),0) rejected,COALESCE(SUM(duplicates),0) duplicates FROM ingestion_logs GROUP BY status')
        stats['missing_reports']=None
        stats['missing_reports_reason']='Unknown: no verified market reporting calendar; absent reports are not zero prices.'
        return stats

    def export_parquet(self):
        """Bounded SQLite cursor batches; source partitions remain distinct."""
        import pyarrow as pa
        import pyarrow.parquet as pq
        with self.connect() as con:
            sql='SELECT o.*,m.state,m.district,m.name market,c.name commodity,v.name variety FROM observations o JOIN markets m ON m.id=o.market_id JOIN commodities c ON c.id=o.commodity_id JOIN varieties v ON v.id=o.variety_id'
            for index,frame in enumerate(pd.read_sql_query(sql,con,chunksize=50000)):
                frame['year']=frame['date'].str[:4]
                table=pa.Table.from_pandas(frame,preserve_index=False)
                pq.write_to_dataset(table,root_path=self.root/'parquet',partition_cols=['year','state','commodity','source_id'],basename_template=f'{stable_id(utcnow(),index)}-{{i}}.parquet')
        return str(self.root/'parquet')