import {z} from 'zod';
import type {Report} from './agri-types';
import {privateStorageKey} from './private-storage';
// Guest price alerts: thresholds checked against the latest official report of one crop/variety at one market.
export const alertSchema=z.object({id:z.string(),crop:z.string().min(1),variety:z.string(),marketKey:z.string().min(1),market:z.string(),direction:z.enum(['above','below']),threshold:z.number().positive(),createdAt:z.string().datetime(),evaluation:z.object({checkedAt:z.string(),reportDate:z.string(),price:z.number(),triggered:z.boolean(),delivery:z.literal('in_app_only')}).optional()});
export type PriceAlert=z.infer<typeof alertSchema>;
const KEY='krishisetu-price-alerts-v1';
export function readAlerts(owner:string|null=null):PriceAlert[]{try{const p=z.array(alertSchema).safeParse(JSON.parse(localStorage.getItem(privateStorageKey(KEY,owner))||'[]'));return p.success?p.data:[];}catch{return [];}}
export function writeAlerts(a:PriceAlert[],owner:string|null=null){localStorage.setItem(privateStorageKey(KEY,owner),JSON.stringify(z.array(alertSchema).parse(a).slice(0,30)));}
export type AlertState={alert:PriceAlert;report?:Report|undefined;triggered:boolean};
// Only a report dated on or after the alert's creation day can trigger it; older history never fires an alert.
export function evaluateAlert(alert:PriceAlert,latest:Report|undefined):AlertState{
 if(!latest)return {alert,triggered:false};
 const createdDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(alert.createdAt));
 const fresh=latest.date>=createdDay;
 const hit=alert.direction==='above'?latest.modal_price>=alert.threshold:latest.modal_price<=alert.threshold;
 return {alert,report:latest,triggered:fresh&&hit};
}
