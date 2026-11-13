"""Exact state/district joins, historical boundaries, district-area grid aggregation."""
import json
from pathlib import Path
import numpy as np
import pandas as pd
from scipy.io import netcdf_file
from shapely import wkb,contains_xy
from .validation import geo_key
from .acquisition import digest
STATE_ALIASES={'orissa':'odisha','uttaranchal':'uttarakhand','nctofdelhi':'delhi','andamanandnicobarislands':'andamanandnicobarislands'}
def skey(x):return STATE_ALIASES.get(geo_key(x),geo_key(x))
def district_geometry(path,clean):
    boundaries=pd.read_parquet(path);geo={}
    for _,r in boundaries.iterrows():
        g=wkb.loads(r.geometry)
        if not g.is_valid:g=g.buffer(0)
        for c in ['dtname','name11','test_name','NAME']:
            key=(skey(r.stname),geo_key(r[c]));geo.setdefault(key,g)
    matched=[];unmatched=[]
    for st,dt in clean[['state','district']].drop_duplicates().itertuples(index=False):
        g=geo.get((skey(st),geo_key(dt)))
        if g is None:unmatched.append({'state':st,'district':dt});continue
        point=g.representative_point();matched.append({'state':st,'district':dt,'latitude':point.y,'longitude':point.x,'geometry':g})
    return matched,unmatched
def grids(root,geos):
    root=Path(root);rows=[]
    for path in sorted(root.glob('rain-*.nc')):
        year=int(path.stem.split('-')[1])
        with netcdf_file(path,'r',mmap=False) as f:
            rain=f.variables['RAINFALL'][:].copy().astype(float);lat=f.variables['LATITUDE'][:].copy();lon=f.variables['LONGITUDE'][:].copy()
        rain[rain<0]=np.nan;xx,yy=np.meshgrid(lon,lat);months=pd.date_range(f'{year}-01-01',periods=len(rain)).month.values
        temps={}
        for kind in ['tmax','tmin']:
            p=root/f'{kind}-{year}.grd'
            if p.exists():
                a=np.fromfile(p,dtype='<f4')
                if a.size==len(rain)*31*31:
                    a=a.reshape(len(rain),31,31).astype(float);a[(a<-80)|(a>70)]=np.nan;temps[kind]=a
        tx,ty=np.meshgrid(np.arange(67.5,98,1),np.arange(7.5,38,1))
        for item in geos:
            g=item['geometry'];mask=contains_xy(g,xx,yy)
            if not mask.any():continue # no fake nearest-point rainfall for tiny islands
            weights=np.cos(np.radians(yy[mask]));a=rain[:,mask];ok=np.isfinite(a);den=(ok*weights).sum(axis=1)
            daily=np.divide(np.nansum(a*weights,axis=1),den,out=np.full(len(a),np.nan),where=den>0)
            complete=np.isfinite(daily).mean()>=0.98
            row={k:item[k] for k in ['state','district','latitude','longitude']};row['environment_year']=year;row['rain_grid_cells']=int(mask.sum())
            for label,months_sel in [('annual',range(1,13)),('monsoon',[6,7,8,9]),('winter',[1,2,11,12])]:
                d=daily[np.isin(months,list(months_sel))];row[f'{label}_rain_mm']=float(d.sum()) if complete and np.isfinite(d).all() else np.nan
            row['rain_daily_std_mm']=float(np.std(daily)) if complete else np.nan
            tmask=contains_xy(g,tx,ty)
            for k,a in temps.items():
                if not tmask.any():continue
                v=a[:,tmask];row[k+'_c']=float(np.nanmean(v)) if np.isfinite(v).mean()>=.98 else np.nan
            if 'tmax_c' in row and 'tmin_c' in row:row['temperature_c']=(row['tmax_c']+row['tmin_c'])/2
            rows.append(row)
        print('aggregated',year,len(geos),flush=True)
    return pd.DataFrame(rows)
def integrate(clean,environment):
    result=clean.copy();result['environment_year']=result.year-2
    # Jan 1 prediction cutoff: only weather through year-2 and published crop history through year-2.
    result=result.merge(environment,on=['state','district','environment_year'],how='left',validate='many_to_one')
    return result
