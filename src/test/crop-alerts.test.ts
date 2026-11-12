import {describe,it,expect} from 'vitest';
import {categorize,recognise} from '@/lib/crop-catalogue';
import {evaluateAlert,type PriceAlert} from '@/lib/alerts';
import type {Report} from '@/lib/agri-types';
const crops=['Maize','Bengal Gram(Gram)(Whole)','Onion','Tomato','Groundnut','Turmeric','Rose(Loose)','Arecanut(Betelnut/Supari)','Cotton','Apple','Green Chilli'];
describe('crop discovery',()=>{
 it('categorises official names',()=>{expect(categorize('Maize')).toBe('cereals');expect(categorize('Bengal Gram(Gram)(Whole)')).toBe('pulses');expect(categorize('Groundnut')).toBe('oilseeds');expect(categorize('Turmeric')).toBe('spices');expect(categorize('Rose(Loose)')).toBe('flowers');expect(categorize('Arecanut(Betelnut/Supari)')).toBe('plantation');expect(categorize('Cotton')).toBe('commercial');expect(categorize('Apple')).toBe('fruits');expect(categorize('Green Chilli')).toBe('vegetables');});
 it('recognises official, alias and custom crops',()=>{expect(recognise(crops,'maize').status).toBe('official');const a=recognise(crops,'makka');expect(a.status).toBe('alias');expect(a.match).toBe('Maize');expect(recognise(crops,'Dragon fruit xyz').status).toBe('custom');});
});
const alert:PriceAlert={id:'1',crop:'Maize',variety:'Local',marketKey:'K|D|M',market:'M',direction:'above',threshold:2200,createdAt:'2026-11-10T05:00:00Z'};
const r=(date:string,modal_price:number)=>({date,modal_price} as Report);
describe('price alerts',()=>{
 it('fires when a new report crosses the threshold',()=>{expect(evaluateAlert(alert,r('2026-11-12',2250)).triggered).toBe(true);});
 it('does not fire below threshold',()=>{expect(evaluateAlert(alert,r('2026-11-12',2100)).triggered).toBe(false);});
 it('ignores reports older than the alert',()=>{expect(evaluateAlert(alert,r('2026-11-01',2500)).triggered).toBe(false);});
 it('supports below alerts',()=>{expect(evaluateAlert({...alert,direction:'below',threshold:2000},r('2026-11-12',1950)).triggered).toBe(true);});
});
