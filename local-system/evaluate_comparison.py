"""Reproduce the academic comparison from real local Parquet; never seed prices."""
import hashlib
import json
import time
from pathlib import Path
from datetime import datetime, timezone
import duckdb
import joblib
from ml_engine.weekly import train_group

def main():
    root = Path(__file__).resolve().parent
    parquet = root / 'runtime/analytical/india_2021_2026.parquet'
    previous = json.loads((root / 'runtime/restored-models/23f4fd41ac5843a99814cdbf2157a661.json').read_text())
    con = duckdb.connect(config={'memory_limit': '512MB', 'threads': '2'})
    frame = con.execute("SELECT * FROM read_parquet(?) WHERE state=? AND district=? AND market IN (?, ?) AND commodity=? AND variety=? AND NOT suspicious",
                        [str(parquet), 'Karnataka', 'Dharwad', 'Hubli (Amaragol)', 'Hubli (Amaragol) APMC', 'Maize', 'Local']).df()
    started = time.monotonic()
    report, artifact, version = train_group(frame, previous['group'], previous['source'])
    stamp = datetime.now(timezone.utc).isoformat()
    run_id = 'academic-direction-' + stamp.replace(':','').replace('.','')
    out = root / 'runtime/academic-comparison'
    out.mkdir(parents=True, exist_ok=True)
    path = out / (run_id + '.joblib')
    joblib.dump(artifact, path)
    loaded = joblib.load(path)
    report.update({'trained_at': stamp, 'training_seconds': time.monotonic()-started,
                   'artifact_sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                   'artifact_load_verified': bool(loaded['models']), 'previous_experiment': previous['id'],
                   'direction_method': 'Increase is positive; actual unchanged targets are excluded. Predicted change > 0 is increase, otherwise decrease/non-increase. ROC-AUC uses continuous predicted price minus observed origin price. Undefined metrics are null. Identical origins per model; validation selection never uses test.',
                   'methodology': 'Weekly mean of reported daily median across grades. No target interpolation. Chronological 60/20/20 usable-origin boundaries, train targets purged before validation. Test trees refit every four eligible origins using targets observed at the block origin. ARIMA/SARIMA fixed pre-test parameters filtered with past-only data. Sparse weeks produce eligible-origin samples, not continuous daily forecasts.'})
    run = {'id': run_id, 'created_at': stamp, 'run_version': 'academic-direction-v1', 'dataset_version': version,
           'source_name': report['source'], **previous['group'], 'grade': 'daily median across reported grades',
           'frequency': report['frequency'], 'observations': report['observed_weeks'],
           'period_start': report['period'][0], 'period_end': report['period'][1],
           'status': 'historical_evaluated', 'artifact_path': str(path.relative_to(root)), 'report': report}
    destination = root.parent / 'src/data/academic-comparison.json'
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(run, indent=2, allow_nan=False))
    (out / (run_id+'.json')).write_text(json.dumps(run, indent=2, allow_nan=False))
    print(json.dumps({'id': run_id, 'raw_rows': len(frame), 'seconds': report['training_seconds'],
                      'horizons': {h: {'selected': v['selected'], 'samples': v['samples'], 'direction': v['direction']['test']} for h,v in report['horizons'].items()}}, indent=2))

if __name__ == '__main__':
    main()