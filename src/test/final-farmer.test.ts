import {it,expect} from 'vitest';
import {quintals,planValue} from '../lib/plans';
import {ageInIST,istTimestamp} from '../lib/price-time';
import {tickerItems} from '../lib/ticker';
import type {Report} from '../lib/agri-types';
it('20 quintals, 2000 kg and 2 tonnes produce identical gross',()=>{expect(quintals(20,'quintal')).toBe(20);expect(quintals(2000,'kg')).toBe(20);expect(quintals(2,'tonne')).toBe(20);});
it('net deducts transport loading unloading and other estimates',()=>expect(planValue(2000,20,'quintal',{transport:3000,loading:100,unloading:200,other:50})).toEqual({gross:40000,expenses:3350,net:36650}));
it('uses Indian midnight for report age and retrieval time',()=>{expect(ageInIST('2026-11-12',new Date('2026-11-12T19:00:00Z'))).toBe(1);expect(istTimestamp('2026-11-12T13:00:00Z')).toContain('6:30 pm');});
it('ticker ranks actual price movement not price level and excludes private/stale rows',()=>{
 const base={state:'Karnataka',district:'Dharwad',market:'Dharwad',commodity:'Maize',variety:'Local',source_name:'TEST ONLY',official:true} as Report;
 const rows=[{...base,id:'a',date:'2026-11-12',modal_price:2100},{...base,id:'b',date:'2026-11-11',modal_price:2000},{...base,id:'c',market:'Hubballi',date:'2026-11-12',modal_price:3000},{...base,id:'d',market:'Hubballi',date:'2026-11-11',modal_price:2990},{...base,id:'e',market:'Private',official:false,date:'2026-11-12',modal_price:9000}];
 const items=tickerItems(rows,new Date('2026-11-12T12:00:00Z'));expect(items[0]?.report.market).toBe('Dharwad');expect(items[0]?.change).toBe(100);expect(items).toHaveLength(2);
});