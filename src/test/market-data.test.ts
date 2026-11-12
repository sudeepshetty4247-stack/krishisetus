import {describe,it,expect} from 'vitest';
import {netValue,parseMarketCsv,comparableRecords} from '@/lib/market-data';
describe('Selling rules',()=>{
 it('subtracts transport, handling and other costs from price times quintals',()=>expect(netValue(2000,10,800,200,100)).toBe(18900));
 it('rejects negative expenses',()=>expect(()=>netValue(2000,10,-1,0,0)).toThrow());
 it('rejects zero quantity',()=>expect(()=>netValue(2000,0,0,0,0)).toThrow());
});
describe('Reported data',()=>{
 const csv='market,commodity,arrival_date,min_price,max_price,modal_price,price_unit,variety\nDharwad,Maize,2025-01-02,1800,2100,2000,INR/quintal,Local\nHubballi,Maize,2025-01-01,1800,2100,2000,INR/quintal,Local';
 it('uses only the same reporting date for comparison',()=>expect(comparableRecords(parseMarketCsv(csv,'test fixture, not official data').records,'Maize')).toHaveLength(1));
 it('rejects unspecified price units',()=>expect(()=>parseMarketCsv(csv.replaceAll('INR/quintal',''),'test')).toThrow());
 it('requires provenance',()=>expect(()=>parseMarketCsv(csv,'')).toThrow());
 it('counts duplicate observations',()=>expect(parseMarketCsv(csv+'\nDharwad,Maize,2025-01-02,1800,2100,2000,INR/quintal,Local','test').duplicates).toBe(1));
});