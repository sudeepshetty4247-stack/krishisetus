import {describe,it,expect} from 'vitest';
import {buildIndex,resolveTarget,parseLastWeek} from '@/lib/agmarknet2.server';
// Real response from api.agmarknet.gov.in commodity-price/lastweek (APMC Hubballi, Maize), 13 Nov 2026.
const real={success:true,message:'Data fetched successfully.',data:[{variety:'Maize - Local','2026-11-11':3129.0,'2026-11-10':'NR','2026-11-09':'NR','2026-11-08':'NR','2026-11-07':'NR','2026-11-06':3128.0,'2026-11-05':3099.0,unitOfPrice:'Rs./Quintal'}]};
const t={state:'Karnataka',district:'Dharwad',market:'APMC Hubballi',commodity:'Maize'};
describe('AGMARKNET 2.0 last-week parsing',()=>{
 it('keeps only published days and never invents min/max',()=>{
  const {records,skipped}=parseLastWeek(real,t,'Maize','2026-11-13T05:00:00Z','2026-11-13');
  expect(records.map(r=>[r.date,r.modal_price])).toEqual([['2026-11-11',3129],['2026-11-06',3128],['2026-11-05',3099]]);
  expect(records.every(r=>r.min_price===null&&r.max_price===null&&r.variety==='Local'&&r.market==='APMC Hubballi')).toBe(true);
  expect(skipped).toBe(4);
 });
 it('rejects unknown rows and non-quintal units',()=>{
  expect(parseLastWeek({success:true,data:[{variety:'Unknown','2026-11-11':'NR',unitOfPrice:'NR'}]},t,'Maize','x','2026-11-13').records).toHaveLength(0);
  expect(parseLastWeek({success:true,data:[{variety:'Maize - Local','2026-11-11':30,unitOfPrice:'Rs./Kg'}]},t,'Maize','x','2026-11-13').records).toHaveLength(0);
  expect(parseLastWeek({success:false},t,'Maize','x','2026-11-13').records).toHaveLength(0);
 });
 it('drops future dates',()=>{expect(parseLastWeek({success:true,data:[{variety:'Maize - Local','2026-11-14':3000,unitOfPrice:'Rs./Quintal'}]},t,'Maize','x','2026-11-13').records).toHaveLength(0);});
 it('maps official names to AGMARKNET 2.0 ids exactly',()=>{
  const ix=buildIndex({state_data:[{state_id:100000,state_name:'All States/UTs'},{state_id:16,state_name:'Karnataka'}],market_data:[{id:108,mkt_name:'APMC Hubballi',state_id:16,district_id:252}],cmdt_data:[{cmdt_id:4,cmdt_name:'Maize'},{cmdt_id:6,cmdt_name:'Bengal Gram(Gram)(Whole)'}]});
  expect(resolveTarget(ix,t)).toEqual({stateId:16,marketId:108,commodityId:4,commodityName:'Maize'});
  expect(resolveTarget(ix,{...t,commodity:'Bengal Gram (Gram)(Whole)'})?.commodityId).toBe(6);
  expect(resolveTarget(ix,{...t,market:'APMC Dharwad'})).toBeNull();
 });
});
