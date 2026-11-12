import {describe,it,expect} from 'vitest';
import {rankOptions,latestByMarket,sameDayOpportunity,winDays} from '@/lib/selling';
import type {Report} from '@/lib/agri-types';
const r=(market:string,modal:number,date='2026-11-01'):Report=>({id:market+date,state:'Karnataka',district:'Dharwad',market,commodity:'Maize',variety:'Local',date,min_price:null,max_price:null,modal_price:modal,arrivals:null,arrival_unit:null,source_name:'Test fixture',source_url:'',retrieved_at:'',official:false,suspicious:false});
const k=(m:string)=>`Karnataka|Dharwad|${m}`;
describe('selling decision',()=>{
 it('20 quintals at 2,000 vs 2,200 gives gross 40,000 and 44,000',()=>{const {options}=rankOptions([r('Dharwad',2000),r('Hubballi',2200)],k('Dharwad'),20,{});expect(options.map(o=>o.gross)).toEqual([44000,40000]);});
 it('transport cost can make the higher-price market lose on net value',()=>{const {options}=rankOptions([r('Dharwad',2000),r('Hubballi',2200)],k('Dharwad'),20,{[k('Hubballi')]:{transport:5000,loading:0,unloading:0,other:0}});expect(options[0]!.report.market).toBe('Dharwad');expect(options[1]!.net).toBe(39000);});
 it('break-even extra transport equals price gain times quantity',()=>{const {options}=rankOptions([r('Dharwad',2000),r('Hubballi',2200)],k('Dharwad'),20,{});expect(options.find(o=>o.report.market==='Hubballi')!.breakEven).toBe(4000);});
 it('flags different reporting dates',()=>{const {options}=rankOptions([r('Dharwad',2000,'2026-11-01'),r('Hubballi',2200,'2026-10-30')],k('Dharwad'),20,{});expect(options.find(o=>!o.isStart)!.sameDate).toBe(false);});
 it('keeps only the latest report per market',()=>{expect(latestByMarket([r('A',1,'2026-01-01'),r('A',2,'2026-02-01')])[0]!.modal_price).toBe(2);});
 it('no opportunity without two markets on the same date',()=>{expect(sameDayOpportunity([r('A',2000,'2026-01-01'),r('B',2500,'2026-01-02')])).toBeNull();});
 it('counts best-price days only on shared dates',()=>{const w=winDays([r('A',1,'d1'),r('B',2,'d1'),r('A',3,'d2')],[k('A'),k('B')]);expect(w).toEqual({wins:{[k('A')]:0,[k('B')]:1},shared:1});});
});
