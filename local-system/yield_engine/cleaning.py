"""Parse genuine DES tables with per-crop units; never pool bales/nuts with tonnes."""
import json
from pathlib import Path
from io import StringIO
import numpy as np
import pandas as pd
from .validation import KEY,name,validate
from .acquisition import digest
def parse_reports(root):
    rows=[];sources=[]
    for path in sorted(Path(root).glob('*.html')):
        text=path.read_text()
        if 'apyreport' not in text:continue
        try:table=pd.read_html(StringIO(text),attrs={'id':'apyreport'})[0]
        except ValueError:continue
        sources.append({'file':path.name,'sha256':digest(path),'bytes':path.stat().st_size})
        for i in range(3,len(table.columns)-2,3):
            crop,season,_=table.columns[i];unit=table.columns[i+1][2]
            if str(crop).startswith('Unnamed:'):continue
            block=table.iloc[:,[0,1,2,i,i+1,i+2]].copy();block.columns=['state','district','year','area_ha','production','published_yield']
            block['crop']=name(crop);block['season']=name(season);block['production_unit']=unit
            block['year']=block.year.astype(str).str.extract(r'(\d{4})',expand=False)
            for c in ['area_ha','production','published_yield']:
                block[c]=pd.to_numeric(block[c].astype(str).str.replace(',','',regex=False).str.strip(),errors='coerce')
            # Empty crop cells are missing observations, not zero production.
            rows.append(block.loc[block.area_ha.notna()|block.production.notna()])
    if not rows:raise ValueError('No populated official production reports')
    raw=pd.concat(rows,ignore_index=True)
    for c in ['state','district','crop','season']:raw[c]=raw[c].map(name)
    raw['year']=pd.to_numeric(raw.year,errors='coerce')
    return raw,sources
def clean(raw):
    invalid=validate(raw);valid=raw.loc[~invalid].copy()
    unit_ok=valid.production_unit.str.fullmatch(r'Production \(Tonnes\)',case=False)
    excluded_units=valid.loc[~unit_ok].groupby(['crop','production_unit']).size().reset_index(name='rows').to_dict('records')
    valid=valid.loc[unit_ok].copy()
    # Coconut source labeling is inconsistent with nut-scale values; exclude until independently resolved.
    uncertain=valid.crop.str.lower().eq('coconut');uncertain_count=int(uncertain.sum());valid=valid.loc[~uncertain]
    duplicate=valid.duplicated(KEY,keep=False);conflicts=valid.loc[duplicate].groupby(KEY)[['area_ha','production']].nunique().max(axis=1)
    bad_keys=conflicts[conflicts>1].index
    if len(bad_keys):valid=valid.loc[~pd.MultiIndex.from_frame(valid[KEY]).isin(bad_keys)]
    before=len(valid);valid=valid.drop_duplicates(KEY)
    valid['yield_t_ha']=valid.production/valid.area_ha
    valid['yield_unit']='tonnes/hectare';valid['year']=valid.year.astype(int)
    # Keep high yields (sugarcane etc.) and real zero yields; flag, never trim to improve test metrics.
    valid['outlier_review']=valid.yield_t_ha>200
    report={'raw_rows':len(raw),'invalid_rows':int(invalid.sum()),'unit_exclusions':excluded_units,'coconut_unit_unresolved_rows':uncertain_count,'conflicting_keys':len(bad_keys),'exact_duplicates_removed':before-len(valid),'clean_rows':len(valid),'outlier_flags':int(valid.outlier_review.sum()),'raw_missing':raw.isna().sum().to_dict()}
    return valid.sort_values(KEY).reset_index(drop=True),report
