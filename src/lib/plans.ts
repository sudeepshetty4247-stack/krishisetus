import {z} from 'zod';
import type {Report} from './agri-types';
import {zeroCosts,type Costs} from './selling';
export const quantityUnit=z.enum(['kg','quintal','tonne']);
export type QuantityUnit=z.infer<typeof quantityUnit>;
export function quintals(quantity:number,unit:QuantityUnit){if(!Number.isFinite(quantity)||quantity<=0)throw new Error('Quantity must be positive');return quantity*(unit==='kg'?.01:unit==='tonne'?10:1);}
export const planSchema=z.object({id:z.string(),savedAt:z.string(),crop:z.string(),variety:z.string(),quantity:z.number().positive(),unit:quantityUnit,location:z.string(),sellingDate:z.string(),marketKey:z.string(),costs:z.record(z.object({transport:z.number().nonnegative(),loading:z.number().nonnegative(),unloading:z.number().nonnegative(),other:z.number().nonnegative()})),reports:z.array(z.custom<Report>(r=>typeof r==='object'&&r!==null&&'modal_price' in r&&typeof r.modal_price==='number'&&r.modal_price>0))});
export type SellingPlan=z.infer<typeof planSchema>;
export const planStorage='krishisetu-selling-plans-v2';
export function readSellingPlans():SellingPlan[]{try{const parsed=z.array(planSchema).safeParse(JSON.parse(localStorage.getItem(planStorage)||'[]'));return parsed.success?parsed.data:[];}catch{return [];}}
export function saveSellingPlan(plan:SellingPlan){const valid=planSchema.parse(plan);const plans=readSellingPlans();localStorage.setItem(planStorage,JSON.stringify([valid,...plans.filter(p=>p.id!==valid.id)].slice(0,50)));}
export function planValue(price:number,quantity:number,unit:QuantityUnit,costs:Costs=zeroCosts){const gross=price*quintals(quantity,unit);return {gross,expenses:costs.transport+costs.loading+costs.unloading+costs.other,net:gross-costs.transport-costs.loading-costs.unloading-costs.other};}