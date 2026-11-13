"""Mounted inside the existing authenticated Python service."""
from fastapi import APIRouter
from pydantic import BaseModel,Field
from .prediction import YieldPredictor
class YieldRequest(BaseModel):
    state:str=Field(min_length=1,max_length=200)
    district:str=Field(min_length=1,max_length=200)
    crop:str=Field(min_length=1,max_length=200)
    season:str=Field(min_length=1,max_length=100)
    year:int=Field(ge=1997,le=2100)
def yield_router(root):
    predictor=YieldPredictor(root);router=APIRouter(prefix='/v1/yield')
    @router.get('/report')
    def report():return predictor.report()
    @router.get('/coverage')
    def coverage():return {'records':predictor.coverage(),'prediction_mode':'historical_hindcast'}
    @router.post('/predict')
    def predict(body:YieldRequest):return predictor.predict(**body.model_dump())
    return router
