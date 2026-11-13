import {describe,it,expect} from 'vitest';
import {todayTickerRows} from '../lib/ticker';

describe('today-only price strip',()=>{
 it('shows November 13 reports, never relabels November 12 prices',()=>{
  const rows=[{date:'2026-11-12',price:6000},{date:'2026-11-13',price:6100}];
  expect(todayTickerRows(rows,new Date('2026-11-13T06:10:00Z'))).toEqual([{date:'2026-11-13',price:6100}]);
 });
 it('uses the IST date at midnight rather than the UTC date',()=>{
  expect(todayTickerRows([{date:'2026-11-13'},{date:'2026-11-14'}],new Date('2026-11-13T18:30:00Z'))).toEqual([{date:'2026-11-14'}]);
 });
 it('returns no prices when the provider has only older reports',()=>{
  expect(todayTickerRows([{date:'2026-11-12'}],new Date('2026-11-13T06:10:00Z'))).toEqual([]);
 });
});