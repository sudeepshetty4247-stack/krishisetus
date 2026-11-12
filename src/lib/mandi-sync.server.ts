// Daily AGMARKNET mandi reports published on data.gov.in (resource 9ef84268-d588-465a-a308-a864a43d0070).
// Direct official API is used when DATA_GOV_IN_API_KEY is configured; otherwise the GODL relay api.dharun.dev,
// which republishes the same resource with its dataset version. Every run is logged; failures never fake success.
import {z} from 'zod';
export const DAILY_SOURCE='data.gov.in daily mandi';
export const DAILY_URL='https://www.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const RELAY='https://api.dharun.dev/v1/mandi';
const OFFICIAL='https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const STATES=['Andaman and Nicobar','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh','Chattisgarh','Dadra and Nagar Haveli','Daman and Diu','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Keralam','Kerala','Ladakh','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','NCT of Delhi','Odisha','Pondicherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','Uttrakhand','West Bengal'];
const text=z.string().trim().min(1).max(200);
const price=z.coerce.number().positive().max(1e9);
export const canonicalCommodity=(name:string)=>name.replace(/\s+/g,' ').trim().replace(/\s+\(/g,'(').replace(/\)\s+\(/g,')(');
export const relayRow=z.object({date:z.string().date(),state:text,district:text,market:text,commodity:text.transform(canonicalCommodity),variety:z.string().trim().max(200).transform(v=>v||'Not specified'),grade:z.string().trim().max(100).default(''),min_price:price.nullable().catch(null),max_price:price.nullable().catch(null),modal_price:price});
export type DailyRecord=z.infer<typeof relayRow>&{retrieved_at:string;suspicious:boolean};
export function normaliseRecord(raw:unknown,retrievedAt:string,today:string):DailyRecord|null{
 const parsed=relayRow.safeParse(raw);if(!parsed.success)return null;const r=parsed.data;
 if(r.date>today)return null;
 if(r.min_price!==null&&r.min_price>r.modal_price)return null;
 if(r.max_price!==null&&r.max_price<r.modal_price)return null;
 // Wide spreads are kept but flagged for review; they never silently change prices.
 const suspicious=r.min_price!==null&&r.max_price!==null&&r.max_price>r.min_price*4;
 return {...r,retrieved_at:retrievedAt,suspicious};
}
async function getJson(url:string,init?:RequestInit):Promise<any>{
 let last='';
 for(let attempt=0;attempt<3;attempt++){
  try{const res=await fetch(url,{...init,signal:AbortSignal.timeout(20000)});
   if(res.ok)return await res.json();
   last=`[${res.status}] ${(await res.text()).slice(0,300)}`;
   if(res.status!==429&&res.status<500)break;
  }catch(e){last=e instanceof Error?e.message:String(e);}
  if(attempt<2)await new Promise(r=>setTimeout(r,800*2**attempt));
 }
 throw new Error(last||'request failed');
}
async function pool<T,R>(items:T[],size:number,fn:(t:T)=>Promise<R>):Promise<R[]>{
 const out:R[]=[];let i=0;
 await Promise.all(Array.from({length:Math.min(size,items.length)},async()=>{while(i<items.length){const k=i++;const item=items[k];if(item!==undefined)out[k]=await fn(item);}}));
 return out;
}
async function fromOfficial(key:string,errors:string[]):Promise<{rows:unknown[];dataset:string}|null>{
 const rows:unknown[]=[];let offset=0,total=Infinity;
 try{
  while(offset<total&&offset<60000){
   const d=await getJson(`${OFFICIAL}?api-key=${encodeURIComponent(key)}&format=json&limit=1000&offset=${offset}`);
   const recs:any[]=Array.isArray(d.records)?d.records:[];total=Number(d.total)||0;
   rows.push(...recs.map(r=>({date:toIso(r.arrival_date),state:r.state,district:r.district,market:r.market,commodity:r.commodity,variety:r.variety,grade:r.grade,min_price:r.min_price,max_price:r.max_price,modal_price:r.modal_price})));
   if(!recs.length)break;offset+=recs.length;
  }
   if(offset<total)errors.push(`data.gov.in: bounded download stopped at ${offset}/${total}; coverage is incomplete`);
   return {rows,dataset:`data.gov.in API ${new Date().toISOString().slice(0,10)}`};
 }catch(e){errors.push(`data.gov.in API: ${e instanceof Error?e.message:e}`);return null;}
}
function toIso(v:unknown){const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v??''));return m?`${m[3]}-${m[2]}-${m[1]}`:String(v??'');}
async function fromRelay(date:string|undefined,errors:string[]):Promise<{rows:unknown[];dataset:string}>{
 const list=await getJson(`${RELAY}/commodities`);
 const names:string[]=(list.data??[]).map((c:any)=>String(c.commodity)).filter(Boolean);
 const version=String(list.meta?.source?.version??'unknown');
 const q=(extra:string)=>`${RELAY}?limit=1000${date?`&date=${date}`:''}${extra}`;
 const rows:unknown[]=[];
 await pool(names,8,async name=>{
  try{const d=await getJson(q(`&commodity=${encodeURIComponent(name)}`));
   const recs=d.data??[];
   if(Number(d.meta?.total)>recs.length){
    // Keep each commodity's results local until complete; concurrent workers must not splice shared rows.
    const commodityRows:unknown[]=[];let got=0;
    for(const s of STATES){const p=await getJson(q(`&commodity=${encodeURIComponent(name)}&state=${encodeURIComponent(s)}`));commodityRows.push(...(p.data??[]));got+=(p.data??[]).length;if(Number(p.meta?.total)>(p.data??[]).length)errors.push(`${name}/${s}: provider limit truncates ${Number(p.meta.total)} rows`);}
    rows.push(...commodityRows);
    if(got<Number(d.meta.total))errors.push(`${name}: ${got}/${d.meta.total} rows after state split`);
   }else rows.push(...recs);
  }catch(e){errors.push(`${name}: ${e instanceof Error?e.message:e}`);}
 });
 return {rows,dataset:`data.gov.in 9ef84268 via api.dharun.dev relay version ${version}`};
}
export async function syncDailyMandi(opts:{date?:string|undefined}={}){
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const lease=crypto.randomUUID();
 const {data:acquired,error}=await supabaseAdmin.rpc('acquire_ingestion_lease',{p_source:DAILY_SOURCE,p_lease_id:lease});
 if(error)throw new Error('Could not establish the ingestion lock; no retrieval started.');
 if(!acquired)return {status:'running',stored:0,received:0,rejected:0,reportDate:null,errors:[],message:'An official price retrieval is already running.'};
 try{return await performDailySync(opts);}finally{const {error:release}=await supabaseAdmin.rpc('release_ingestion_lease',{p_source:DAILY_SOURCE,p_lease_id:lease});if(release)console.error('Ingestion lease release failed');}
}
async function performDailySync(opts:{date?:string|undefined}){
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const started=new Date().toISOString(),errors:string[]=[];
 const today=new Date(Date.now()+5.5*3600000).toISOString().slice(0,10);
 let fetched:{rows:unknown[];dataset:string}|null=null;
 const key=process.env['DATA_GOV_IN_API_KEY'];
 if(key&&!opts.date)fetched=await fromOfficial(key,errors);
 if(!fetched||!fetched.rows.length){try{fetched=await fromRelay(opts.date,errors);}catch(e){errors.push(`relay: ${e instanceof Error?e.message:e}`);}}
 const received=fetched?.rows.length??0;
 const valid=(fetched?.rows??[]).map(r=>normaliseRecord(r,started,today)).filter((r):r is DailyRecord=>!!r);
 const unique=new Map<string,DailyRecord>();
 for(const r of valid){const id=JSON.stringify([r.state,r.district,r.market,r.commodity,r.variety,r.grade,r.date]);const prev=unique.get(id);if(prev&&prev.modal_price!==r.modal_price)errors.push('Conflicting duplicate official price observation');else unique.set(id,r);}
 const records=[...unique.values()];const duplicates=valid.length-records.length;
 let stored=0;
 for(let i=0;fetched&&i<records.length;i+=100){
  let succeeded=false;
  for(let attempt=0;attempt<3;attempt++){
   const {data,error}=await supabaseAdmin.rpc('publish_official_reports',{records:records.slice(i,i+100) as never,p_source:DAILY_SOURCE,p_url:DAILY_URL,p_dataset:fetched.dataset});
   if(!error){stored+=Number(data)||0;succeeded=true;break;}
   if(attempt===2)errors.push(`store: ${error.message}`);
   else await new Promise(resolve=>setTimeout(resolve,400*2**attempt));
  }
  if(!succeeded)break;
 }
 const reportDate=records.reduce((m,r)=>r.date>m?r.date:m,'')||null;
 if(stored>0){
  // Retain every verified daily observation. Source failures and newer snapshots must not erase history.
  const {error:sumErr}=await supabaseAdmin.rpc('refresh_agri_summary');if(sumErr)errors.push(`summary: ${sumErr.message}`);
  const {error:alertError}=await supabaseAdmin.rpc('evaluate_farmer_alerts');if(alertError)errors.push('Account alert evaluation failed');
 }
 const status=stored>0?(errors.length||stored!==records.length?'partial':'success'):received?'failed':'no_records';
 const message=`${status}: ${stored} reports stored from ${received} received${reportDate?` · latest market report ${reportDate}`:''}${errors.length?` · ${errors[0]}`:''}`;
 const finished=new Date().toISOString();
 const {error:stateError}=await supabaseAdmin.from('agri_sync_state').upsert({source:DAILY_SOURCE,status,...(status==='success'?{last_success:finished}:{}),updated_at:finished,message,next_offset:0},{onConflict:'source',ignoreDuplicates:false});
 if(stateError)errors.push(`sync status: ${stateError.message}`);
 const finalStatus=errors.length&&stored>0?'partial':status;
 const {error:runError}=await supabaseAdmin.from('agri_source_runs').insert({source:DAILY_SOURCE,report_date:reportDate,started_at:started,finished_at:finished,status:finalStatus,requested:received,received,stored,rejected:received-valid.length,duplicates,message,errors:errors.slice(0,50)});
 if(runError)errors.push(`ingestion log: ${runError.message}`);
 return {status:errors.length&&stored>0?'partial':finalStatus,stored,received,rejected:received-valid.length,duplicates,reportDate,errors:errors.slice(0,10),message};
}
