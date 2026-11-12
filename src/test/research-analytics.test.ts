import {describe,expect,it} from 'vitest';
import {backtestStrategies,marketAnalytics} from '@/lib/research-analytics';
const groups=[{market:'A',history:[{week:'2025-01-06',price:2000},{week:'2025-01-13',price:2100},{week:'2025-01-20',price:2000}]},{market:'B',history:[{week:'2025-01-06',price:2300},{week:'2025-01-13',price:1900},{week:'2025-01-20',price:2400}]}];
describe('research analytics',()=>{
 it('backtest decides with last week prices only (no look-ahead)',()=>{const r=backtestStrategies(groups,'A',{A:0,B:10},0)!;const hp=r.find(x=>x.strategy==='Highest reported price last week')!;
  // week2: last week B 2300 > A 2000 → sells at B 1900; week3: last week A 2100 > B 1900 → sells at A 2000.
  expect(hp.meanNet).toBe(1950);});
 it('cost per km reduces net value of distant markets',()=>{const r=backtestStrategies(groups,'A',{A:0,B:10},5)!;expect(r.find(x=>x.strategy==='Nearest other market')!.meanNet).toBe((1900-50+2400-50)/2);});
 it('consistency counts weeks at or above the cross-market median',()=>{const a=marketAnalytics(groups);expect(a.sharedWeeks).toBe(3);expect(a.meanSpread).toBeCloseTo((300+200+400)/3);});
});
