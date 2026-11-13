"""Load checksum-verified local artifacts for exact evaluated historical inputs."""
import json
from pathlib import Path
import numpy as np
import pandas as pd
from .features import CATEGORICAL,FEATURES
from .artifacts import load_model
class YieldPredictor:
    def __init__(self,root):
        self.root=Path(root);self._model=None
    def report(self):
        p=self.root/'evaluation.json'
        if not p.exists():raise ValueError('Yield evaluation is not available')
        result=json.loads(p.read_text())
        if not result.get('selected_model'):raise ValueError('Yield model comparison has not completed')
        return result
    def coverage(self):
        self.report()
        f=pd.read_parquet(self.root/'test.parquet')
        return f[CATEGORICAL+['year']].drop_duplicates().sort_values(CATEGORICAL+['year']).to_dict('records')
    def predict(self,state,district,crop,season,year):
        report=self.report();f=pd.read_parquet(self.root/'test.parquet')
        selection={'state':state,'district':district,'crop':'Rice' if crop.lower() in ('paddy','rice') else crop,'season':season,'year':year}
        for k,v in selection.items():f=f.loc[f[k]==v]
        if len(f)!=1:raise ValueError('This combination/year is not covered by the evaluated historical dataset. Current or future forecasts need newer verified inputs and validation.')
        chosen=next(r for r in report['models'] if r['name']==report['selected_model'])
        if self._model is None:self._model=load_model(self.root/chosen['artifact']['file'],chosen['artifact']['sha256'])
        value=float(np.maximum(0,self._model.predict(f[FEATURES]))[0])
        if not np.isfinite(value):raise ValueError('Model returned an invalid yield')
        environmental={k:None if pd.isna(f.iloc[0][k]) else float(f.iloc[0][k]) for k in ['annual_rain_mm','temperature_c','tmax_c','tmin_c']}
        crop_metrics=next((g for g in chosen['subgroups']['crop'] if g['crop']==selection['crop']),None)
        return {'available':True,'selection':selection,'model':chosen['name'],'predicted_yield':value,'unit':'tonnes/hectare','basis':'Historical pre-season hindcast, not a current-year forecast','cutoff':f'{year}-01-01','environment_year':year-2,'environment_observations':environmental,'test_metrics':chosen['test'],'crop_test_metrics':crop_metrics,'individual_confidence':None,'confidence_note':'Test R² is not individual prediction confidence','dataset_sha256':report['dataset_sha256']}
