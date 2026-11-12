import math
import numpy as np
import pandas as pd

def net_value(price,quantity,transport=0,handling=0,other=0):
    values=[float(x) for x in (price,quantity,transport,handling,other)]
    if not all(math.isfinite(x) for x in values) or min(values[0:2])<=0 or min(values[2:])<0: raise ValueError('Prices and quantity must be positive; expenses finite and non-negative')
    return values[0]*values[1]-sum(values[2:])

def break_even_transport(alternative_price,current_price,quantity,additional_other_costs=0):
    # Signed result: negative means no positive transport allowance exists.
    if not all(math.isfinite(float(x)) for x in (alternative_price,current_price,quantity,additional_other_costs)) or min(alternative_price,current_price,quantity)<=0: raise ValueError('Invalid comparison inputs')
    return (alternative_price-current_price)*quantity-additional_other_costs

def compare(store,scenario):
    required=('commodity','variety','date','source','nearest','quantity')
    if not all(scenario.get(k) for k in required): raise ValueError('Commodity, variety, reporting date, source, nearest market ID and quantity are required')
    filters={k:scenario[k] for k in ('commodity','variety','source')};filters['start']=filters['end']=scenario['date']
    for key in ('state','district'):
        if scenario.get(key): filters[key]=scenario[key]
    data=store.observations(filters,limit=10000)
    if data['total']>10000: raise ValueError('Narrow the geographic scope; at most 10,000 markets per comparison')
    rows=data['records']; nearest=next((r for r in rows if r['market_id']==scenario['nearest']),None)
    if nearest is None: raise ValueError('Nearest market has no comparable report on this date/source/variety')
    quantity=float(scenario['quantity']); expenses=scenario.get('expenses',{}); results=[]
    base_cost=expenses.get(nearest['market_id'],{})
    base=net_value(nearest['modal'],quantity,base_cost.get('transport',0),base_cost.get('handling',0),base_cost.get('other',0))
    for row in rows:
        cost=expenses.get(row['market_id'],{});transport=float(cost.get('transport',0));handling=float(cost.get('handling',0));other=float(cost.get('other',0))
        net=net_value(row['modal'],quantity,transport,handling,other)
        other_delta=handling+other-float(base_cost.get('handling',0))-float(base_cost.get('other',0))
        results.append({**row,'gross':row['modal']*quantity,'expenses':transport+handling+other,'net':net,'net_advantage':net-base,'additional_gross':(row['modal']-nearest['modal'])*quantity,'break_even_additional_transport':break_even_transport(row['modal'],nearest['modal'],quantity,other_delta),'costs_entered':row['market_id'] in expenses})
    results.sort(key=lambda r:r['net'],reverse=True)
    return {'results':results,'basis':'Reported modal prices, same source/date/commodity/variety; expense defaults are zero assumptions, not actual transport quotes. No road distance is inferred.','disclaimer':'Decision support only. Actual transaction prices, quality deductions, fees and costs may differ.'}

def analytics(store,filters):
    # Require same source/commodity/variety for meaningful price-relative analysis.
    if not all(filters.get(k) for k in ('commodity','variety','source')): raise ValueError('Choose one commodity, variety and source')
    result=store.observations(filters,limit=100000)
    if result['total']>100000: raise ValueError('Narrow the date/geography filter for analysis')
    if not result['records']: return {'markets':[],'spreads':[],'monthly':[]}
    df=pd.DataFrame(result['records']);df['date']=pd.to_datetime(df['date'])
    daily=df.groupby('date')['modal'].agg(['min','max','median','count'])
    daily=daily[daily['count']>=2]
    joined=df.join(daily[['median','count']],on='date').dropna(subset=['median'])
    joined['competitive']=joined['modal']>=joined['median']
    summaries=[]
    for mid,g in df.groupby('market_id'):
        dates=g.sort_values('date'); common=joined[joined['market_id']==mid];prices=dates['modal'];mean=float(prices.mean());cv=float(prices.std(ddof=0)/mean) if len(prices)>1 else None
        correlation=None;units=g['arrival_unit'].dropna().unique();pairs=g.dropna(subset=['arrivals'])
        if len(units)==1 and len(pairs)>=10 and pairs['arrivals'].std()>0 and pairs['modal'].std()>0: correlation=float(pairs['arrivals'].corr(pairs['modal']))
        summaries.append({'market_id':mid,'market':g.iloc[0]['market'],'state':g.iloc[0]['state'],'reports':len(g),'latest':g['date'].max().date().isoformat(),'price_cv':cv,'competitive_fraction':float(common['competitive'].mean()) if len(common)>=10 else None,'comparable_days':len(common),'arrival_price_correlation':correlation,'arrival_unit':units[0] if len(units)==1 else None,'score':None,'score_reason':'No arbitrary composite score. Stability, competitive frequency and observed coverage are reported separately.'})
    spreads=[{'date':d.date().isoformat(),'spread':float(r['max']-r['min']),'markets':int(r['count'])} for d,r in daily.iterrows()]
    df['month']=df['date'].dt.month; df['year']=df['date'].dt.year
    monthly=[{'market_id':mid,'year':int(year),'month':int(month),'mean_modal':float(g['modal'].mean()),'reports':len(g)} for (mid,year,month),g in df.groupby(['market_id','year','month'])]
    return {'markets':summaries,'spreads':spreads,'monthly':monthly,'methodology':'Competitive frequency = fraction of shared reporting days with modal price at or above same-source daily median; minimum 10 common days. Volatility = population SD / mean reported prices (not returns). Arrivals correlation requires at least 10 paired reports in one arrival unit. Correlation is not causation. No future reports or implied road distances.'}