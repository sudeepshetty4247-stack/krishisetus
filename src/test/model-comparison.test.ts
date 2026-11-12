import {expect,it} from 'vitest';
import {metricWinners,directionWinners,evaluationRows,type EvaluationRow} from '@/lib/model-comparison';
import evidence from '@/data/academic-comparison.json';
import type {ModelRun} from '@/components/farmer/data';
const rows=[{algorithm:'Naive',validation:{MAE:140,RMSE:145,sMAPE:5,R2:.47,n:30},test:{MAE:94.30,RMSE:136.4,sMAPE:4.83,R2:.47,n:30}},{algorithm:'SARIMA',validation:{MAE:130.7476,RMSE:141,sMAPE:4.9,R2:.48,n:30},test:{MAE:97.29,RMSE:134.64,sMAPE:4.98,R2:.483,n:30}}] as EvaluationRow[];
it('keeps the Hubli validation selection distinct from the final test MAE winner',()=>{expect(metricWinners(rows,'validation','MAE')).toEqual(['SARIMA']);expect(metricWinners(rows,'test','MAE')).toEqual(['Naive']);});
it('uses lowest RMSE independently of MAE',()=>expect(metricWinners(rows,'test','RMSE')).toEqual(['SARIMA']));
it('uses lowest sMAPE independently of RMSE',()=>expect(metricWinners(rows,'test','sMAPE')).toEqual(['Naive']));
it('uses highest R squared and excludes missing metrics',()=>{expect(metricWinners(rows,'test','R2')).toEqual(['SARIMA']);expect(metricWinners([{algorithm:'Missing'} as EvaluationRow],'test','R2')).toEqual([]);});
const genuine=evaluationRows([evidence as unknown as ModelRun]).filter(r=>r.horizon===7);
it('compares all six actual algorithms on one identical final test with 33 observations',()=>{
 expect(genuine).toHaveLength(6);expect(genuine.map(r=>r.test?.n)).toEqual([33,33,33,33,33,33]);
 expect(genuine.map(r=>r.direction?.test?.n)).toEqual([32,32,32,32,32,32]);
});
it('does not replace price-model selection with a direction test winner',()=>{
 expect(metricWinners(genuine,'validation','MAE')).toEqual(['SARIMA']);
 expect(metricWinners(genuine,'test','MAE')).toEqual(['Naive']);
 expect(directionWinners(genuine,'test','F1')).toEqual(['SARIMA']);
 expect(directionWinners(genuine,'test','ROC_AUC')).toEqual(['ARIMA']);
 expect(directionWinners(genuine,'validation','F1')).toEqual(['ARIMA']);
});
it('preserves undefined Naive precision and uses continuous-score chance AUC',()=>{
 const naive=genuine.find(r=>r.algorithm==='Naive');expect(naive?.direction?.test?.Precision).toBeNull();
 expect(naive?.direction?.test?.ROC_AUC).toBe(.5);expect(naive?.direction?.test?.increase).toBe(16);expect(naive?.direction?.test?.decrease).toBe(16);
});
it('returns no classification winners for old regression-only experiments',()=>expect(directionWinners(rows,'test','Accuracy')).toEqual([]));