"""Crash-safe job files, SQLite backup, and official-source export contracts."""
import json
import os
import sqlite3
import tempfile
from pathlib import Path
from data_engine.storage import utcnow

def atomic_json(path, value):
    path = Path(path)
    fd, temporary = tempfile.mkstemp(dir=path.parent, suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as file:
            json.dump(value, file); file.flush(); os.fsync(file.fileno())
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)

def backup(store, directory):
    directory = Path(directory); directory.mkdir(parents=True, exist_ok=True)
    target = directory / ('metadata-' + utcnow().replace(':', '-') + '.sqlite')
    with store.connect() as source, sqlite3.connect(target) as destination:
        source.backup(destination)
        if destination.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise ValueError('Backup integrity verification failed')
    return str(target)

def restore_backup(source, target):
    """Restore into a NEW test database only; never overwrite a working store."""
    source,target=Path(source),Path(target)
    if target.exists():raise ValueError('Restore target must not already exist')
    target.parent.mkdir(parents=True,exist_ok=True)
    with sqlite3.connect(f'file:{source.resolve()}?mode=ro',uri=True) as original:
        if original.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise ValueError('Source backup failed integrity check')
        with sqlite3.connect(target) as destination:
            original.backup(destination)
            if destination.execute('PRAGMA integrity_check').fetchone()[0]!='ok':raise ValueError('Restored backup failed integrity check')
    return str(target)

def official_export(store, offset=0, limit=1000):
    """Only observations obtained by the fixed official connector; not uploads.

    Import source IDs cannot qualify as public, even if their URL names a ministry.
    """
    if not 0 <= offset or not 1 <= limit <= 1000: raise ValueError('Invalid export pagination')
    data = store.observations({'source': 'agmarknet'}, limit, offset)
    records = []
    for r in data['records']:
        records.append({'state': r['state'], 'district': r['district'], 'market': r['market'],
            'commodity': r['commodity'], 'variety': r['variety'], 'date': r['date'],
            'min_price': r['min'], 'max_price': r['max'], 'modal_price': r['modal'],
            'price_unit': r['price_unit'], 'arrivals': r['arrivals'], 'arrival_unit': r['arrival_unit'],
            'source_name': 'AGMARKNET', 'source_url': 'https://agmarknet.gov.in',
            'retrieved_at': r['retrieved_at'], 'suspicious': bool(r['suspicious'])})
    return {**data, 'records': records, 'source_verified': True, 'contract_version': 1}