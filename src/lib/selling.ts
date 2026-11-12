import type {Report} from './agri-types';
export type Costs={transport:number;loading:number;unloading:number;other:number};
export const zeroCosts:Costs={transport:0,loading:0,unloading:0,other:0};
export const marketKey=(r:Pick<Report,'state'|'district'|'market'>)=>`${r.state}|${r.district}|${r.market}`;
const sum=(c:Costs)=>c.transport+c.loading+c.unloading+c.other;
export function validCosts(c:Costs){return Object.values(c).every(v=>Number.isFinite(v)&&v>=0);}
export function comparableReport(r:Report){return !r.suspicious&&Number.isFinite(r.modal_price)&&r.modal_price>0&&!!r.variety&&r.variety!=='Not specified'&&r.price_unit==='INR/quintal';}
export const comparisonKey=(r:Report)=>JSON.stringify([r.date,r.commodity,r.variety,r.grade||'',r.price_unit,r.source_name]);
/** Latest report per market; input may be in any order. */
export function latestByMarket(rows:Report[]){const m=new Map<string,Report>();for(const r of rows){const k=marketKey(r);const o=m.get(k);if(!o||r.date>o.date)m.set(k,r);}return [...m.values()];}
export type Option={key:string;report:Report;gross:number;expenses:number;net:number;advantage:number;breakEven:number|null;sameDate:boolean;isStart:boolean};
/** Same formula as local-system decisions.py: net = modal*qty - expenses; break-even extra transport = (alt-start)*qty - extra non-transport costs. */
export function rankOptions(latest:Report[],startKey:string,qty:number,costs:Record<string,Costs>):{options:Option[];start:Option|null;excluded:number}{
 if(!Number.isFinite(qty)||!(qty>0)||Object.values(costs).some(c=>!validCosts(c)))return {options:[],start:null,excluded:latest.length};
 const startR=latest.find(r=>marketKey(r)===startKey&&comparableReport(r))||null;const sc=costs[startKey]||zeroCosts;
 if(!startR)return {options:[],start:null,excluded:latest.length};
 const compatible=latest.filter(r=>comparableReport(r)&&comparisonKey(r)===comparisonKey(startR));
 const startNet=startR?startR.modal_price*qty-sum(sc):0;
 const options=compatible.map(r=>{const k=marketKey(r);const c=costs[k]||zeroCosts;const gross=r.modal_price*qty;const net=gross-sum(c);
  const be=startR&&k!==startKey?(r.modal_price-startR.modal_price)*qty-((c.loading+c.unloading+c.other)-(sc.loading+sc.unloading+sc.other))+sc.transport:null;
  return {key:k,report:r,gross,expenses:sum(c),net,advantage:startR?net-startNet:0,breakEven:be,sameDate:!startR||r.date===startR.date,isStart:k===startKey};}).sort((a,b)=>b.net-a.net);
 return {options,start:options.find(o=>o.isStart)||null,excluded:latest.length-compatible.length};
}
/** Largest same-date, same crop/variety/source spread between two markets. */
export function sameDayOpportunity(rows:Report[]){const g=new Map<string,Report[]>();for(const r of rows){if(!comparableReport(r))continue;const k=comparisonKey(r);g.set(k,[...(g.get(k)||[]),r]);}
 let best:{low:Report;high:Report;diff:number}|null=null;for(const list of g.values()){if(list.length<2)continue;const s=[...list].sort((a,b)=>a.modal_price-b.modal_price);const low=s[0],high=s[s.length-1];if(!low||!high||marketKey(low)===marketKey(high))continue;const diff=high.modal_price-low.modal_price;if(diff>0&&(!best||diff>best.diff))best={low,high,diff};}return best;}
export function priceStats(prices:number[]){if(!prices.length)return null;const mean=prices.reduce((a,b)=>a+b,0)/prices.length;const sd=Math.sqrt(prices.reduce((a,b)=>a+(b-mean)**2,0)/prices.length);return {mean,cv:prices.length>1?sd/mean:null};}
/** Count, on dates where all chosen markets reported, how often each had the highest modal price. */
export function winDays(rows:Report[],keys:string[]){const byDate=new Map<string,Map<string,number>>();for(const r of rows){const k=marketKey(r);if(!keys.includes(k)||!comparableReport(r))continue;const group=comparisonKey(r);const d=byDate.get(group)||new Map();d.set(k,r.modal_price);byDate.set(group,d);}
 const wins:Record<string,number>=Object.fromEntries(keys.map(k=>[k,0]));let shared=0;for(const d of byDate.values()){if(d.size!==keys.length)continue;shared++;const top=Math.max(...d.values());for(const [k,v]of d)if(v===top)wins[k]=(wins[k]||0)+1;}return {wins,shared};}
export function freshnessDays(date:string,now=new Date()){return Math.max(0,Math.floor((now.getTime()-new Date(date+'T00:00:00').getTime())/86400000));}
