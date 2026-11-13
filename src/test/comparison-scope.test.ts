import {expect,it} from 'vitest';
import evidence from '@/data/optimized-comparison.json';
import type {ModelRun} from '@/components/farmer/data';
import {mainModels,focusedRows,eligibleAggregate,aggregateRows} from '@/lib/comparison-scope';
const run=evidence as unknown as ModelRun;
it('shows exactly the three requested main models without Naive or optional algorithms',()=>{expect(mainModels).toEqual(['Random Forest','XGBoost','SARIMA']);expect(focusedRows(run,7).map(r=>r.algorithm)).toEqual([...mainModels]);});
it('recomputes genuine individual direction and price metrics from aligned predictions',()=>{const pooled=aggregateRows(eligibleAggregate([run],run,7),7);for(const row of pooled){const original=focusedRows(run,7).find(r=>r.algorithm===row.algorithm);expect(row.test?.MAE).toBeCloseTo(original?.test?.MAE??0,8);expect(row.direction?.test?.Accuracy).toBe(original?.direction?.test?.Accuracy);expect(row.direction?.test?.ROC_AUC).toBeCloseTo(original?.direction?.test?.ROC_AUC??0,8);}});
it('never combines mismatched protocols or duplicate experiments for one identity',()=>{expect(eligibleAggregate([run,{...run,id:'duplicate'},{...run,id:'other',run_version:'incompatible'}],run,7)).toHaveLength(1);});
it('rejects absent full predictions rather than averaging percentages',()=>{const h=run.report.horizons['1'];if(!h)throw new Error('Missing genuine horizon');const missing={...run,report:{...run.report,horizons:{'1':{...h,all_predictions:undefined}}}};expect(eligibleAggregate([missing],run,7)).toEqual([]);});