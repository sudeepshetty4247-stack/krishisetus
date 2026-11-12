import {expect,it} from 'vitest';
import {metricWinners,type EvaluationRow} from '@/lib/model-comparison';
const rows=[{algorithm:'Naive',validation:{MAE:140,RMSE:145,sMAPE:5,R2:.47,n:30},test:{MAE:94.30,RMSE:136.4,sMAPE:4.83,R2:.47,n:30}},{algorithm:'SARIMA',validation:{MAE:130.7476,RMSE:141,sMAPE:4.9,R2:.48,n:30},test:{MAE:97.29,RMSE:134.64,sMAPE:4.98,R2:.483,n:30}}] as EvaluationRow[];
it('keeps the Hubli validation selection distinct from the final test MAE winner',()=>{expect(metricWinners(rows,'validation','MAE')).toEqual(['SARIMA']);expect(metricWinners(rows,'test','MAE')).toEqual(['Naive']);});
it('uses lowest RMSE independently of MAE',()=>expect(metricWinners(rows,'test','RMSE')).toEqual(['SARIMA']));
it('uses lowest sMAPE independently of RMSE',()=>expect(metricWinners(rows,'test','sMAPE')).toEqual(['Naive']));
it('uses highest R squared and excludes missing metrics',()=>{expect(metricWinners(rows,'test','R2')).toEqual(['SARIMA']);expect(metricWinners([{algorithm:'Missing'} as EvaluationRow],'test','R2')).toEqual([]);});