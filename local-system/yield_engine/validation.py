import re
import numpy as np
KEY=['state','district','crop','season','year']
SEASONS={'Kharif','Rabi','Autumn','Winter','Summer','Whole Year'}
def name(x):return re.sub(r'\s+',' ',re.sub(r'^\d+\.\s*','',str(x))).strip()
def geo_key(x):return re.sub('[^a-z0-9]','',name(x).lower().replace('*',''))
def validate(frame):
    missing=set(KEY+['area_ha','production','production_unit'])-set(frame.columns)
    if missing:raise ValueError(f'Missing raw columns: {sorted(missing)}')
    invalid=(~np.isfinite(frame.area_ha))|(frame.area_ha<=0)|(~np.isfinite(frame.production))|(frame.production<0)|(~frame.season.isin(SEASONS))|(~frame.year.between(1997,2022))
    return invalid
