"""Transparent, configurable publication gates; metrics must come from validation."""
import os
from datetime import date, datetime
from zoneinfo import ZoneInfo

def assess_forecast(result, today=None, max_age=None, max_smape=None):
    today = today or datetime.now(ZoneInfo('Asia/Kolkata')).date()
    max_age = int(os.environ.get('FORECAST_MAX_AGE_DAYS', '7')) if max_age is None else max_age
    max_smape = float(os.environ.get('FORECAST_MAX_SMAPE', '30')) if max_smape is None else max_smape
    age = (today - date.fromisoformat(result['latest_observation'])).days
    reasons = []
    if age < 0 or age > max_age: reasons.append('Model history is outside the configured freshness window')
    if result.get('selected') in ('Naive baseline', 'Seasonal naive'): reasons.append('Only a baseline is supported; no improved forecast is published')
    if not result.get('baseline_beaten_on_final_test'): reasons.append('Selected model did not beat the naive baseline on the final chronological test')
    score = result.get('evaluation', {}).get('sMAPE')
    if score is None or score > max_smape: reasons.append('Final-test error exceeds the configured publication threshold')
    return {'supported': not reasons, 'reason': '; '.join(reasons), 'age_days': age,
            'max_age_days': max_age, 'max_smape': max_smape}

def monitoring(store, run_id, horizon):
    """Evaluate matured holdout forecast endpoints, without treating unavailable dates as errors."""
    rows = store.query('SELECT result_json FROM model_registry WHERE id=?', (run_id,))
    if not rows: raise ValueError('Model version not found')
    import json
    report = json.loads(rows[0]['result_json'])
    info = report['horizons'].get(str(horizon))
    if not info or info.get('status') != 'validated': raise ValueError('Horizon unsupported')
    residuals = info.get('predictions', [])
    recent = residuals[-30:]
    mae = sum(abs(r['residual']) for r in recent) / len(recent) if recent else None
    reference = info['validation'][info['selected']]['MAE']
    return {'model_id': run_id, 'recent_test_MAE': mae, 'validation_MAE': reference,
            'deteriorating': mae is not None and mae > reference * 1.5,
            'basis': 'Saved chronological final-test residuals, not live post-deployment monitoring'}