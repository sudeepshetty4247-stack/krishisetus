import type {ModelRun,Metric} from '@/components/farmer/data';
export const algorithms=['Naive','Seasonal naive','Random Forest','XGBoost','ARIMA','SARIMA'];
export type DirectionMetric='Accuracy'|'Precision'|'Recall'|'F1'|'ROC_AUC';
export type DirectionResult=Record<DirectionMetric,number|null>&{n:number;increase:number;decrease:number;unchanged_excluded:number;missing_excluded:number;predicted_unchanged:number};
export type EvaluationRow={run:ModelRun;algorithm:string;horizon:number;validation?:Metric|undefined;test?:Metric|undefined;direction?:{validation?:DirectionResult|undefined;test?:DirectionResult|undefined};selected:boolean;status:string};
export function evaluationRows(runs:ModelRun[]):EvaluationRow[]{return runs.flatMap(run=>Object.values(run.report.horizons||{}).flatMap(h=>algorithms.map(algorithm=>({run,algorithm,horizon:h.horizon_days,validation:h.validation?.[algorithm],test:h.test?.[algorithm],direction:{validation:h.direction?.validation?.[algorithm],test:h.direction?.test?.[algorithm]},selected:h.selected===algorithm,status:h.failures?.[algorithm]||h.failures?.[algorithm+' test']?'Validation failed':h.test?.[algorithm]?'Evaluated':h.reason||'Not available'}))));}
export function metricWinners(rows:EvaluationRow[],split:'validation'|'test',metric:'MAE'|'RMSE'|'sMAPE'|'R2'){
 const valid=rows.filter(r=>typeof r[split]?.[metric]==='number'&&Number.isFinite(r[split]?.[metric]));
 if(!valid.length)return [];
 const values=valid.map(r=>Number(r[split]?.[metric]));const best=metric==='R2'?Math.max(...values):Math.min(...values);
 return valid.filter(r=>r[split]?.[metric]===best).map(r=>r.algorithm);
}
export function directionWinners(rows:EvaluationRow[],split:'validation'|'test',metric:DirectionMetric){
 const valid=rows.filter(r=>typeof r.direction?.[split]?.[metric]==='number'&&Number.isFinite(r.direction?.[split]?.[metric]));
 if(!valid.length)return [];
 const best=Math.max(...valid.map(r=>Number(r.direction?.[split]?.[metric])));
 return valid.filter(r=>Math.abs(Number(r.direction?.[split]?.[metric])-best)<1e-12).map(r=>r.algorithm);
}
export const algorithmLabel=(name:string)=>name==='Seasonal naive'?'Seasonal Naive':name;
export const modelExplanations:Record<string,string>={
 Naive:'Predicts the latest observed price. A simple baseline every other model must be compared against.',
 'Seasonal naive':'Uses a previous seasonal price pattern. This weekly experiment looks back 52 weeks, with a past-only fallback.',
 'Random Forest':'Combines predictions from many decision trees to capture patterns in past prices.',
 XGBoost:'Builds boosted decision trees, each improving on errors made by the earlier trees.',
 ARIMA:'Models changes and autocorrelation: how historical prices relate to earlier prices.',
 SARIMA:'Extends ARIMA with seasonality. This experiment uses a 52-week seasonal component.',
};