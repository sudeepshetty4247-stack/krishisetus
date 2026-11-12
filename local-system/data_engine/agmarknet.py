"""Public AGMARKNET 2.0 reports; no key, no CAPTCHA bypass, no inferred units.

Contract reference: agmarknet 0.2.2 public SDK, daily-price-arrival/report.
Keep the unmodified provider response and checkpoint each monthly page.
"""
import json
import time
import uuid
from datetime import date, timedelta
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from config import TIMEOUT, PAUSE
from .connectors import SourceUnavailable
from .storage import stable_id, utcnow
from .cleaning import ingest_rows

BASE = 'https://api.agmarknet.gov.in/v1/daily-price-arrival/'
SOURCE = 'agmarknet'

def normalize_report(row):
    """Provider fields are mapped, never enriched with invented varieties/units."""
    price_units = {'Rs./Quintal': 'INR/quintal', 'Rs/Quintal': 'INR/quintal',
                   'Rs./Kg': 'INR/kg', 'Rs./Metric Tonnes': 'INR/tonne'}
    unit = row.get('unit_name_price')
    return {'state': row.get('state_name'), 'district': row.get('district_name'),
            'market': row.get('market_name'), 'commodity': row.get('cmdt_name'),
            'variety': row.get('variety_name'), 'arrival_date': row.get('arrival_date'),
            'min_price': row.get('min_price'), 'max_price': row.get('max_price'),
            'modal_price': row.get('model_price'), 'price_unit': price_units.get(unit, unit),
            'arrivals': row.get('arrival_qty'), 'arrival_unit': row.get('unit_name_arrival')}

def month_end(day):
    following = (day.replace(day=28) + timedelta(days=4)).replace(day=1)
    return following - timedelta(days=1)

class AgmarknetConnector:
    def __init__(self, session=None):
        self.session = session or requests.Session()
        self.session.mount('https://', HTTPAdapter(max_retries=Retry(
            total=3, backoff_factor=2, status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=['GET', 'POST'], respect_retry_after_header=True)))

    def request(self, action, payload=None):
        try:
            response = self.session.request('GET' if action == 'filters' else 'POST',
                BASE + action, json=payload, timeout=TIMEOUT)
            if not response.ok:
                # Never retry authorization blocks or disable TLS verification.
                raise SourceUnavailable(f'AGMARKNET returned HTTP {response.status_code}; public access may be restricted. No reports substituted.')
            result = response.json()
            if not isinstance(result, dict): raise SourceUnavailable('AGMARKNET response is not an object')
            return result
        except (requests.RequestException, ValueError):
            raise SourceUnavailable('AGMARKNET connection failed or response was not JSON') from None

    def discover(self): return self.request('filters')

    def page(self, start, end, page=1, filters=None):
        f = filters or {}
        if not set(f).issubset({'group', 'commodity', 'state', 'district', 'market', 'grade', 'variety'}):
            raise ValueError('Use documented AGMARKNET numeric filter identifiers')
        payload = {'from_date': start, 'to_date': end, 'data_type': '100006',
                   'group': str(f.get('group', '0')), 'commodity': str(f.get('commodity', '0')),
                   'page': str(page), 'limit': '1000'}
        for key in ('state', 'district', 'market', 'grade', 'variety'):
            values = f.get(key, [0])
            if not isinstance(values, list) or len(values) > 100: raise ValueError('Filter arrays must contain at most 100 numeric IDs')
            payload[key] = json.dumps([int(v) for v in values])
        result = self.request('report', payload)
        blocks = result.get('data', {}).get('records')
        if not isinstance(blocks, list) or not blocks or not isinstance(blocks[0], dict):
            raise SourceUnavailable('AGMARKNET report records schema is missing')
        block = blocks[0]
        rows = block.get('data')
        pagination = block.get('pagination')
        if isinstance(pagination, list): pagination = pagination[0] if pagination else {}
        if not isinstance(rows, list) or not isinstance(pagination, dict):
            raise SourceUnavailable('AGMARKNET rows or pagination metadata is missing')
        total_pages = pagination.get('total_pages')
        if total_pages is None or int(total_pages) < page:
            if rows: raise SourceUnavailable('AGMARKNET pagination cannot prove completeness')
            total_pages = page
        return result, rows, int(total_pages)

    def ingest(self, store, start, end, filters=None, max_pages=10, reset=False):
        first, last = date.fromisoformat(start), date.fromisoformat(end)
        if first > last or last > date.today(): raise ValueError('Choose a valid non-future historical interval')
        if not 1 <= max_pages <= 100: raise ValueError('Run between 1 and 100 bounded pages')
        filters = filters or {}
        job = 'agmarknet:' + stable_id(start, end, filters)
        previous = store.query('SELECT * FROM checkpoints WHERE job=?', (job,))
        cursor = {'start': start, 'page': 1}
        if previous and not reset:
            if previous[0]['status'] == 'complete': return {'status': 'complete', 'pages': []}
            cursor = json.loads(previous[0]['parameters'])
        results = []
        try:
            for _ in range(max_pages):
                current = date.fromisoformat(cursor['start'])
                stop = min(month_end(current), last)
                raw, rows, pages = self.page(current.isoformat(), stop.isoformat(), cursor['page'], filters)
                path = store.root / 'raw' / f'agmarknet-{uuid.uuid4().hex}.json'
                path.write_text(json.dumps(raw, ensure_ascii=False), encoding='utf-8')
                results.append(ingest_rows(store, [normalize_report(r) for r in rows], SOURCE, BASE+'report', path))
                if cursor['page'] < pages: cursor['page'] += 1
                else: cursor = {'start': (stop + timedelta(days=1)).isoformat(), 'page': 1}
                complete = date.fromisoformat(cursor['start']) > last
                with store.connect() as con:
                    con.execute('INSERT OR REPLACE INTO checkpoints VALUES(?,?,?,?,?)',
                        (job, json.dumps(cursor), cursor['page'], 'complete' if complete else 'partial', utcnow()))
                store.source_status(SOURCE, 'connected', 'Public report downloaded, archived and audited. Requested interval is not a nationwide completeness claim.')
                if complete: break
                time.sleep(PAUSE)
        except SourceUnavailable as exc:
            store.source_status(SOURCE, 'failed', str(exc))
            raise
        return {'status': 'complete' if complete else 'partial', 'cursor': cursor, 'pages': results}