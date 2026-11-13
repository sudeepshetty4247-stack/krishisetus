"""January-1 pre-season hindcast. Published history and weather lagged two years."""
import numpy as np
import pandas as pd
from .validation import KEY
CATEGORICAL=['state','district','crop','season']
NUMERIC=['year','history_mean_yield','history_last_yield','history_std_yield','history_area_ha','history_count','history_age','latitude','longitude','annual_rain_mm','monsoon_rain_mm','winter_rain_mm','rain_daily_std_mm','temperature_c','tmax_c','tmin_c','rain_deviation_mm']
FEATURES=CATEGORICAL+NUMERIC
FORBIDDEN={'production','published_yield','yield_t_ha','area_ha'}
def feature_rows(master,history,freeze_year=None):
    result=master.copy();history=history.sort_values('year');groups={k:g for k,g in history.groupby(CATEGORICAL)};cache={}
    requested=result[CATEGORICAL+['year']].drop_duplicates()
    for row in requested.itertuples(index=False):
        key=tuple(getattr(row,c) for c in CATEGORICAL);cut=row.year-2
        if freeze_year is not None:cut=min(cut,freeze_year)
        ck=(key,cut)
        if ck in cache:continue
        g=groups.get(key)
        if g is None:years=np.array([]);ys=np.array([]);areas=np.array([])
        else:
            keep=g.year.to_numpy()<=cut;years=g.year.to_numpy()[keep];ys=g.yield_t_ha.to_numpy()[keep];areas=g.area_ha.to_numpy()[keep]
        cache[ck]={'history_mean_yield':float(np.mean(ys[-5:])) if len(ys) else np.nan,'history_last_yield':float(ys[-1]) if len(ys) else np.nan,'history_std_yield':float(np.std(ys[-5:])) if len(ys) else np.nan,'history_area_ha':float(np.mean(areas[-5:])) if len(ys) else np.nan,'history_count':len(ys),'last_history_year':int(years[-1]) if len(ys) else np.nan}
    rows=[]
    for row in result.itertuples(index=False):
        key=tuple(getattr(row,c) for c in CATEGORICAL);cut=min(row.year-2,freeze_year) if freeze_year is not None else row.year-2
        item=cache[(key,cut)].copy();item['history_age']=row.year-item.pop('last_history_year');rows.append(item)
    for c in rows[0] if rows else []:result[c]=[r[c] for r in rows]
    # Rainfall deviation uses previous environmental years only, no full-dataset climatology.
    env=result[['state','district','environment_year','annual_rain_mm']].drop_duplicates().sort_values('environment_year')
    env['rain_mean_past']=env.groupby(['state','district']).annual_rain_mm.transform(lambda x:x.shift(1).expanding(min_periods=3).mean())
    result=result.merge(env[['state','district','environment_year','rain_mean_past']],on=['state','district','environment_year'],how='left',validate='many_to_one')
    result['rain_deviation_mm']=result.annual_rain_mm-result.rain_mean_past
    for c in NUMERIC:
        if c not in result:result[c]=np.nan
    return result

def make_splits(master):
    train=feature_rows(master.loc[master.year<=2016],master)
    val=feature_rows(master.loc[master.year.between(2017,2019)],master,2016)
    test=feature_rows(master.loc[master.year.between(2020,2022)],master,2019)
    return train,val,test
