import {evaluationRows,type EvaluationRow} from './model-comparison';
import type {ModelRun} from '@/components/farmer/data';
export const mainModels=['Random Forest','XGBoost','SARIMA'] as const;
export function focusedRows(run:ModelRun,horizon:number){return evaluationRows([run]).filter(r=>r.horizon===horizon&&mainModels.some(m=>m===r.algorithm));}
// Aggregate only full aligned OOS predictions with identical protocol, target period, unit and frequency.
export function eligibleAggregate(runs:ModelRun[],reference:ModelRun,horizon:number){
 const ref=Object.values(reference.report.horizons).find(h=>h.horizon_days===horizon);
 if(!ref?.evaluation_periods?.test_origins||!ref.evaluation_periods.test_targets)return [];
 const seen=new Set<string>();
 return runs.filter(run=>{
  const h=Object.values(run.report.horizons).find(h=>h.horizon_days===horizon);
  if(!h||run.run_version!==reference.run_version||run.source_name!==reference.source_name||run.frequency!==reference.frequency||run.grade!==reference.grade||JSON.stringify(h.evaluation_periods)!==JSON.stringify(ref.evaluation_periods))return false;
  const p=h.all_predictions;const first=p?.['Random Forest'];
  if(!first?.length||!mainModels.every(m=>p?.[m]?.length===first.length&&p[m]?.every((v,i)=>v.origin===first[i]?.origin&&v.week===first[i]?.week&&v.actual===first[i]?.actual&&v.current===first[i]?.current)))return false;
  const key=JSON.stringify([run.state,run.district,run.market,run.commodity,run.variety,run.grade]);
  if(seen.has(key))return false;seen.add(key);return true;
 });
}
export function aggregateRows(runs:ModelRun[],horizon:number):EvaluationRow[]{
 if(!runs.length)return [];
 return mainModels.map(algorithm=>{
  const points=runs.flatMap(run=>Object.values(run.report.horizons).find(h=>h.horizon_days===horizon)?.all_predictions?.[algorithm]||[]);
  const n=points.length;const errors=points.map(p=>p.predicted-p.actual);
  const direction=points.filter(p=>p.actual!==p.current);const tp=direction.filter(p=>p.actual>p.current&&p.predicted>p.current).length;
  const fp=direction.filter(p=>p.actual<p.current&&p.predicted>p.current).length;const fn=direction.filter(p=>p.actual>p.current&&p.predicted<=p.current).length;
  const increases=tp+fn,decreases=direction.length-increases;
  let pairs=0;for(const up of direction.filter(p=>p.actual>p.current))for(const down of direction.filter(p=>p.actual<p.current)){const a=up.predicted-up.current,b=down.predicted-down.current;pairs+=a>b?1:a===b?.5:0;}
  const run=runs[0];if(!run)throw new Error('Missing aggregate reference');
  return {run,algorithm,horizon,selected:false,status:'Evaluated',test:{MAE:errors.reduce((s,v)=>s+Math.abs(v),0)/n,RMSE:Math.sqrt(errors.reduce((s,v)=>s+v*v,0)/n),sMAPE:points.reduce((s,p)=>s+200*Math.abs(p.predicted-p.actual)/(Math.abs(p.actual)+Math.abs(p.predicted)),0)/n,R2:null,n},direction:{test:{n:direction.length,increase:increases,decrease:decreases,unchanged_excluded:n-direction.length,missing_excluded:0,predicted_unchanged:direction.filter(p=>p.predicted===p.current).length,Accuracy:direction.length?(tp+decreases-fp)/direction.length:null,Precision:tp+fp?tp/(tp+fp):null,Recall:increases?tp/increases:null,F1:2*tp+fp+fn?2*tp/(2*tp+fp+fn):null,ROC_AUC:increases&&decreases?pairs/(increases*decreases):null}}};
 });
}