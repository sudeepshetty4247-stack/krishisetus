import type {Report} from './agri-types';
import {ageInIST} from './price-time';
export function todayTickerRows<T extends {date:string}>(rows:T[],now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 return rows.filter(row=>row.date===today);
}
export function tickerItems(rows:Report[],now=new Date()){
 const groups=new Map<string,Report[]>();
 for(const r of rows){if(!r.official)continue;const key=[r.state,r.district,r.market,r.commodity,r.variety,r.source_name].join('|');groups.set(key,[...(groups.get(key)||[]),r]);}
 return [...groups.values()].flatMap(list=>{
  const sorted=[...list].sort((a,b)=>b.date.localeCompare(a.date));const latest=sorted[0];if(!latest||ageInIST(latest.date,now)>7)return [];
  const previous=sorted.find(r=>r.date<latest.date);
  return [{report:latest,change:previous?latest.modal_price-previous.modal_price:null,percent:previous?(latest.modal_price-previous.modal_price)/previous.modal_price*100:null,reports:list.length,previousDate:previous?.date??null}];
 }).sort((a,b)=>Math.abs(b.percent??0)-Math.abs(a.percent??0)||b.reports-a.reports||b.report.date.localeCompare(a.report.date)).slice(0,16);
}