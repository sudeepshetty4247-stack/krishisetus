"""Actual trained-model contract acceptance; no fixture yield estimates."""
from pathlib import Path
from fastapi.testclient import TestClient
from fastapi_service import create_service

def test_authenticated_yield_predictions_across_three_states(tmp_path,monkeypatch):
 monkeypatch.setenv('KRISHI_PYTHON_TOKEN','test-only-yield-contract-token')
 monkeypatch.setenv('KRISHI_YIELD_ROOT',str(Path(__file__).parents[1]/'yield-output'))
 c=TestClient(create_service(tmp_path));headers={'Authorization':'Bearer test-only-yield-contract-token'}
 for state,district,crop,season in [('Karnataka','Udupi','Rice','Kharif'),('Punjab','Ludhiana','Wheat','Rabi'),('Maharashtra','Pune','Maize','Kharif')]:
  body=dict(state=state,district=district,crop=crop,season=season,year=2021)
  assert c.post('/v1/yield/predict',json=body).status_code==401
  result=c.post('/v1/yield/predict',headers=headers,json=body)
  assert result.status_code==200
  data=result.json();assert data['unit']=='tonnes/hectare';assert data['predicted_yield']>0;assert data['model']=='XGBoost';assert data['individual_confidence'] is None
  body['year']=2026;assert c.post('/v1/yield/predict',headers=headers,json=body).status_code==422
