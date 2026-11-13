import numpy as np
from sklearn.metrics import r2_score,mean_absolute_error,mean_squared_error

def metrics(actual,predicted):
    a=np.asarray(actual,float);p=np.asarray(predicted,float)
    if len(a)!=len(p) or not np.isfinite(p).all():raise ValueError('Non-finite/misaligned predictions')
    positive=a>0;den=np.abs(a)+np.abs(p)
    return {'n':len(a),'R2':float(r2_score(a,p)) if len(a)>1 else None,'MAE':float(mean_absolute_error(a,p)),'RMSE':float(np.sqrt(mean_squared_error(a,p))),'MAPE':float(np.mean(np.abs(a[positive]-p[positive])/a[positive])*100) if positive.any() else None,'MAPE_zero_targets_excluded':int((~positive).sum()),'sMAPE':float(np.mean(np.divide(2*np.abs(a-p),den,out=np.zeros(len(a)),where=den>0))*100)}
def subgroup_report(frame,predicted):
    f=frame[['crop','state','district','yield_t_ha']].copy();f['prediction']=predicted
    return {label:[{label:k,**metrics(g.yield_t_ha,g.prediction)} for k,g in f.groupby(label)] for label in ['crop','state']}
