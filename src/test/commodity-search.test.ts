import {describe,expect,it} from 'vitest';
import {searchCommodities} from '@/lib/commodity-search';
import {freshness} from '@/lib/price-time';
const names=['Maize','Bengal Gram(Gram)(Whole)','Bengal Gram Dal(Chana Dal)','Tomato','Onion','Paddy(Common)','Groundnut','Wheat'];
describe('commodity search',()=>{
 it('finds maize from a partial name',()=>expect(searchCommodities(names,'mai')[0]).toBe('Maize'));
 it('finds maize from the regional name corn and Kannada',()=>{expect(searchCommodities(names,'corn')[0]).toBe('Maize');expect(searchCommodities(names,'ಮೆಕ್ಕೆಜೋಳ')[0]).toBe('Maize');});
 it('finds Bengal gram from chana',()=>expect(searchCommodities(names,'chana')).toContain('Bengal Gram(Gram)(Whole)'));
 it('tolerates a spelling mistake',()=>expect(searchCommodities(names,'tamato')[0]).toBe('Tomato'));
 it('does not invent crops',()=>expect(searchCommodities(names,'saffron')).toEqual([]));
});
describe('freshness labels use the reporting date, not retrieval time',()=>{
 const now=new Date('2026-11-12T10:00:00+05:30');
 it('yesterday is the latest available report',()=>expect(freshness('2026-11-11',now)).toBe('latest'));
 it('five days old is recent',()=>expect(freshness('2026-11-07',now)).toBe('recent'));
 it('April 2026 is historical in November',()=>expect(freshness('2026-04-20',now)).toBe('historical'));
 it('January 2024 is historical',()=>expect(freshness('2024-01-06',now)).toBe('historical'));
});
