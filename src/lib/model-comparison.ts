import type {ModelRun,Metric} from '@/components/farmer/data';
export const algorithms=['Naive','Seasonal naive','Random Forest','XGBoost','ARIMA','SARIMA'];
export type EvaluationRow={run:ModelRun;algorithm:string;horizon:number;validation?:Metric|undefined;test?:Metric|undefined;selected:boolean;status:string};
export function evaluationRows(runs:ModelRun[]):EvaluationRow[]{return runs.flatMap(run=>Object.values(run.report.horizons||{}).flatMap(h=>algorithms.map(algorithm=>({run,algorithm,horizon:h.horizon_days,validation:h.validation?.[algorithm],test:h.test?.[algorithm],selected:h.selected===algorithm,status:h.failures?.[algorithm]||h.failures?.[algorithm+' test']?'Validation failed':h.test?.[algorithm]?'Evaluated':h.reason||'Not available'}))));}
export function metricWinners(rows:EvaluationRow[],split:'validation'|'test',metric:'MAE'|'RMSE'|'sMAPE'|'R2'){
 const valid=rows.filter(r=>typeof r[split]?.[metric]==='number'&&Number.isFinite(r[split]?.[metric]));
 if(!valid.length)return [];
 const values=valid.map(r=>Number(r[split]?.[metric]));const best=metric==='R2'?Math.max(...values):Math.min(...values);
 return valid.filter(r=>r[split]?.[metric]===best).map(r=>r.algorithm);
}