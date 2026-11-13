"""Preserve a new genuine optimized experiment without overwriting past results."""
import json, hashlib, uuid, warnings
import os,time
from pathlib import Path
from datetime import datetime, timezone
import duckdb, joblib
from ml_engine.weekly import weekly_series
from ml_engine.optimization import optimize

def main():
    started=time.monotonic(); focused=os.environ.get('KRISHI_THREE_MODELS')=='1'
    warnings.filterwarnings('ignore')
    root = Path(__file__).resolve().parent
    previous = json.loads((root.parent/'src/data/academic-comparison.json').read_text())
    files = sorted((root/'runtime/optimization/raw').glob('*.parquet'))
    if len(files) != 6:
        raise ValueError('Six checksummed genuine yearly source files required')
    checksums=json.loads((root/'runtime/optimization/raw/checksums.json').read_text())
    for source in files:
        if hashlib.sha256(source.read_bytes()).hexdigest() != checksums.get(source.name):
            raise ValueError('Historical source checksum mismatch: '+source.name)
    con = duckdb.connect(config={'memory_limit':'512MB','threads':'2'})
    frame = con.execute("""SELECT trim(State) state,trim(District) district,trim(Market) market,
       trim(Commodity) commodity,trim(Variety) variety,trim(Grade) grade,cast(Arrival_Date as DATE) date,
       Min_Price min_price,Max_Price max_price,Modal_Price modal_price FROM read_parquet(?)
       WHERE State='Karnataka' AND District='Dharwad' AND Market IN ('Hubli (Amaragol)','Hubli (Amaragol) APMC')
       AND Commodity='Maize' AND Variety='Local' AND Modal_Price>0
       AND (Min_Price IS NULL OR (Min_Price>=0 AND Min_Price<=Modal_Price))
       AND (Max_Price IS NULL OR Max_Price>=Modal_Price)
       AND NOT (Max_Price>Min_Price*4)
       GROUP BY ALL""", [[str(p) for p in files]]).df()
    frame = frame.groupby(['state','district','market','commodity','variety','grade','date'],as_index=False).agg({'min_price':'min','max_price':'max','modal_price':'median'})
    series,daily,raw = weekly_series(frame,previous['report']['group'])
    if len(raw) != 758 or series.notna().sum() != 218:
        raise ValueError('Genuine history does not reconcile with the preserved experiment')
    entries,artifacts,features = optimize(series,('Naive','Random Forest','XGBoost','SARIMA')) if focused else optimize(series)
    out = root/'runtime/optimization'; out.mkdir(parents=True,exist_ok=True)
    run_id = str(uuid.uuid4()); path = out/(run_id+'.joblib')
    joblib.dump(artifacts,path); loaded=joblib.load(path)
    # Verify deserialization and actual prediction for every saved tree/time-series model.
    from ml_engine.optimization import enriched_design
    for h,models in loaded.items():
        X,_,_,_=enriched_design(series,h)
        for name,model in models.items():
            if name in ('Naive','Seasonal naive'): assert len(model['series']) == len(series)
            elif name in ('ARIMA','SARIMA'): assert len(model.forecast(h)) == h
            else: assert len(model.predict(X[-1:])) == 1
    stamp=datetime.now(timezone.utc).isoformat()
    report={**previous['report'],'horizons':entries,'features':features,'trained_at':stamp,'training_seconds':time.monotonic()-started,
            'artifact_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'artifact_load_verified':True,
            'methodology':'Same original chronological boundaries and genuine weekly observations. Each tree refits at every origin on targets strictly before it. Hyperparameters and expanding/156-week windows chosen by purged walk-forward validation MAE only. ARIMA/SARIMA orders chosen on validation, parameters refit before test and past-filtered. Actual ties excluded only for binary metrics; continuous price-change scores for AUC. No class resampling: regression forecasts preserve the observed balanced test distribution. Weekly 7/14/28 are historical, never 30-day or current inference.',
            'optimization':{'accuracy_target':.85,'models':list(loaded[1]),'previous_experiment':previous['id'],'source_checksums':json.loads((out/'raw/checksums.json').read_text())}}
    run={**previous,'id':run_id,'created_at':stamp,'run_version':'focused-three-model-v1' if focused else 'optimized-walk-forward-v1','artifact_path':str(path.relative_to(root)), 'report':report}
    (out/(run_id+'.json')).write_text(json.dumps(run,indent=2,allow_nan=False))
    (out/'latest.json').write_text(json.dumps(run,allow_nan=False))
    # Retain executed evidence across sandbox restarts; the dashboard still reads Cloud, not this file.
    (root.parent/('src/data/three-model-comparison.json' if focused else 'src/data/optimized-comparison.json')).write_text(json.dumps(run,indent=2,allow_nan=False))
    print(json.dumps({'id':run_id,'artifact_load_verified':True,'horizons':{h:{'selected':v['selected'],'test':v['test'],'direction':v['direction']['test']} for h,v in entries.items()}},indent=2))

if __name__ == '__main__':main()