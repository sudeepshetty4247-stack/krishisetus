import {describe,it,expect} from 'vitest';
import {latestTickerRows,optionalPriceQuantity} from '../lib/ticker';
describe('latest available price browsing',()=>{
 it('keeps November 12 prices dated November 12 when November 13 is not published',()=>{
  expect(latestTickerRows([{date:'2026-11-11',price:5900},{date:'2026-11-12',price:6000}],new Date('2026-11-13T06:16:00Z'))).toEqual([{date:'2026-11-12',price:6000}]);
 });
 it('switches to November 13 once genuine reports exist',()=>{
  expect(latestTickerRows([{date:'2026-11-12'},{date:'2026-11-13'},{date:'2026-11-14'}],new Date('2026-11-13T06:16:00Z'))).toEqual([{date:'2026-11-13'}]);
 });
 it('does not assume 20 quintals when quantity is blank',()=>{expect(optionalPriceQuantity('')).toBeUndefined();});
 it('keeps an entered positive quantity',()=>{expect(optionalPriceQuantity('20')).toBe(20);});
});