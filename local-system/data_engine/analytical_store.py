"""Read immutable, explicitly activated Parquet on a persistent service volume."""
import hashlib
import json
import os
from pathlib import Path
from datetime import date, datetime
import duckdb

FIELDS = ('state', 'district', 'market', 'commodity', 'variety', 'grade')

def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''): h.update(block)
    return h.hexdigest()

class AnalyticalStore:
    def __init__(self, root):
        self.root = Path(root) / 'analytical'
        self.pointer = self.root / 'active.json'

    def metadata(self):
        if not self.pointer.is_file(): raise ValueError('Nationwide history has not been transferred and activated')
        info = json.loads(self.pointer.read_text())
        path = (self.root / info['file']).resolve()
        if path.parent != self.root.resolve() or not path.is_file(): raise ValueError('Activated historical file is unavailable')
        if path.stat().st_size != info['bytes']: raise ValueError('Historical file size changed; reactivate after checksum verification')
        return info, path

    def connect(self, path):
        con = duckdb.connect()
        con.execute("SET memory_limit='256MB'")
        con.execute('SET threads=1')
        con.read_parquet(str(path)).create_view('history')
        return con

    def activate(self, file, manifest):
        """Administrative CLI only. No API accepts paths or uploads executable artifacts."""
        file, manifest = Path(file).resolve(), Path(manifest).resolve()
        if file.parent != self.root.resolve(): raise ValueError('Transfer Parquet into the persistent analytical directory first')
        info = json.loads(manifest.read_text())
        checksum = digest(file)
        if not info.get('cleaned_sha256') or checksum != info['cleaned_sha256']:
            raise ValueError('Cleaned-file SHA-256 is missing or does not match')
        with self.connect(file) as con:
            columns = {r[0] for r in con.execute('DESCRIBE history').fetchall()}
            if not set((*FIELDS, 'date', 'min_price', 'max_price', 'modal_price')).issubset(columns):
                raise ValueError('Historical schema is incomplete')
            count, first, last = con.execute('SELECT count(*),min(date),max(date) FROM history').fetchone()
            invalid = con.execute("""SELECT count(*) FROM history WHERE modal_price IS NULL OR NOT isfinite(modal_price)
                OR modal_price<=0 OR date IS NULL OR date>current_date OR state IS NULL OR state=''
                OR district IS NULL OR district='' OR market IS NULL OR market='' OR commodity IS NULL OR commodity=''
                OR variety IS NULL OR variety='' OR (min_price IS NOT NULL AND (min_price<0 OR min_price>modal_price))
                OR (max_price IS NOT NULL AND max_price<modal_price)""").fetchone()[0]
            if invalid: raise ValueError(f'{invalid} invalid rows; activation refused without discarding records')
            if count != info.get('records'): raise ValueError('Manifest count does not match actual rows')
            # State-scoped exact business-key checks keep grouping memory bounded.
            for (state,) in con.execute('SELECT DISTINCT state FROM history').fetchall():
                duplicate = con.execute('SELECT count(*) FROM (SELECT 1 FROM history WHERE state=? GROUP BY state,district,market,commodity,variety,grade,date HAVING count(*)>1)', [state]).fetchone()[0]
                if duplicate: raise ValueError(f'{duplicate} duplicate business keys in {state}; activation refused')
        self.root.mkdir(parents=True, exist_ok=True)
        active = {**info, 'file': file.name, 'bytes': file.stat().st_size, 'cleaned_sha256': checksum,
                  'earliest': str(first), 'latest': str(last), 'price_unit': 'INR/quintal'}
        temp = self.root / 'active.tmp'
        temp.write_text(json.dumps(active, indent=2))
        os.replace(temp, self.pointer)
        return active

    def query(self, filters, limit=100, offset=0, aggregate=False):
        if limit<1 or limit>1000 or offset<0 or offset>100000: raise ValueError('Pagination out of bounds; narrow filters beyond 100,000 rows')
        info, path = self.metadata()
        clauses, params = [], []
        for key in FIELDS:
            value = filters.get(key)
            if value:
                if not isinstance(value, str) or len(value)>200: raise ValueError('Invalid historical filter')
                clauses.append(f'{key}=?'); params.append(value)
        for key, operator in [('start', '>='), ('end', '<=')]:
            if filters.get(key):
                value = date.fromisoformat(filters[key]).isoformat()
                clauses.append(f'date{operator}?'); params.append(value)
        where = ' WHERE ' + ' AND '.join(clauses) if clauses else ''
        with self.connect(path) as con:
            if aggregate:
                result = con.execute('SELECT count(*) records,min(date) earliest,max(date) latest,avg(modal_price) historical_average FROM history'+where, params)
            else:
                result = con.execute('SELECT * FROM history'+where+' ORDER BY date DESC,state,district,market,commodity,variety,grade LIMIT ? OFFSET ?', [*params,limit+1,offset])
            names = [d[0] for d in result.description]
            rows = [dict(zip(names,row)) for row in result.fetchall()]
        for row in rows:
            for key, value in row.items():
                if isinstance(value, datetime): row[key] = value.date().isoformat()
                elif isinstance(value, date): row[key] = value.isoformat()
        return {'records': rows[:limit], 'has_more': len(rows)>limit, 'limit':limit, 'offset':offset,
                'dataset_version':info['cleaned_sha256'], 'provenance':info.get('dataset'),
                'source':info.get('source'), 'price_unit':'INR/quintal', 'latest_dataset_observation':info['latest'],
                'basis':'Historical observations; not current market prices'}

if __name__ == '__main__':
    import argparse
    parser=argparse.ArgumentParser(description='Activate a transferred, checksum-verified historical Parquet file')
    parser.add_argument('--root',required=True);parser.add_argument('--file',required=True);parser.add_argument('--manifest',required=True)
    args=parser.parse_args()
    print(json.dumps(AnalyticalStore(args.root).activate(args.file,args.manifest),indent=2))