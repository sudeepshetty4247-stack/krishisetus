// AGMARKNET 2.0 public backend (https://api.agmarknet.gov.in/v1). Verified 13 Nov 2026 from the cloud environment:
// /daily-price-arrival/filters → 200; market-report/daily, market-report/specific, daily-report-state and price-trend
// → 400 TOKEN_OR_CAPTCHA_REQUIRED; /prices-and-arrivals/commodity-price/lastweek → 200 with published prices.
// The last-week report gives ONE published price per market/commodity/variety/day (matches the data.gov.in modal
// price for the same report) and no min/max, so min/max are stored as null — never estimated.
import {canonicalCommodity,normaliseRecord,type DailyRecord,nextOfficialOffset} from './mandi-sync.server';

export const AGM2_SOURCE='AGMARKNET 2.0 last-week price';
export const AGM2_URL='https://agmarknet.gov.in/home';
const BASE='https://api.agmarknet.gov.in/v1';
export const AGM2_HEADERS={accept:'application/json, text/plain, */*',origin:'https://agmarknet.gov.in',referer:'https://agmarknet.gov.in/','user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'};
export const AGM2_BATCH=30;

type Filters={state_data:{state_id:number;state_name:string}[];market_data:{id:number;mkt_name:string;state_id:number|null;district_id:number|null}[];cmdt_data:{cmdt_id:number;cmdt_name:string}[]};
export type Agm2Index={state:Map<string,number>;market:Map<string,number>;commodity:Map<string,{id:number;name:string}>};
const norm=(s:string)=>s.toLowerCase().replace(/\s+/g,' ').trim();
export function buildIndex(f:Filters):Agm2Index{
 const state=new Map<string,number>(),market=new Map<string,number>(),commodity=new Map<string,{id:number;name:string}>();
 for(const s of f.state_data)if(s.state_id<100000)state.set(norm(s.state_name),s.state_id);
 for(const m of f.market_data)if(m.state_id!==null)market.set(`${m.state_id}|${norm(m.mkt_name)}`,m.id);
 for(const c of f.cmdt_data)commodity.set(norm(canonicalCommodity(c.cmdt_name)),{id:c.cmdt_id,name:canonicalCommodity(c.cmdt_name)});
 return {state,market,commodity};
}
export type Target={state:string;district:string;market:string;commodity:string};
export function resolveTarget(ix:Agm2Index,t:Target){
 const stateId=ix.state.get(norm(t.state));if(stateId===undefined)return null;
 const marketId=ix.market.get(`${stateId}|${norm(t.market)}`);const c=ix.commodity.get(norm(canonicalCommodity(t.commodity)));
 return marketId===undefined||!c?null:{stateId,marketId,commodityId:c.id,commodityName:c.name};
}
// Turns one last-week response into validated records. "NR" (not reported), non-quintal units and unknown rows are dropped.
export function parseLastWeek(resp:any,t:Target,commodityName:string,retrievedAt:string,today:string):{records:DailyRecord[];skipped:number}{
 const rows:any[]=resp?.success===true&&Array.isArray(resp.data)?resp.data:[];const records:DailyRecord[]=[];let skipped=0;
 for(const row of rows){
  const label=String(row?.variety??'');if(!label||label==='Unknown'||String(row?.unitOfPrice)!=='Rs./Quintal'){skipped++;continue;}
  const prefix=`${commodityName} - `;const variety=label.startsWith(prefix)?label.slice(prefix.length).trim():label.includes(' - ')?label.slice(label.indexOf(' - ')+3).trim():'';
  for(const [k,v] of Object.entries(row)){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(k))continue;
   if(typeof v!=='number'){skipped++;continue;}
   const r=normaliseRecord({date:k,state:t.state,district:t.district,market:t.market,commodity:commodityName,variety,grade:'',min_price:null,max_price:null,modal_price:v},retrievedAt,today);
   if(r)records.push(r);else skipped++;
  }
 }
 return {records,skipped};
}
let filterCache:{at:number;ix:Agm2Index}|null=null;
async function get(path:string,timeoutMs=8000){
 const res=await fetch(`${BASE}${path}`,{headers:AGM2_HEADERS,signal:AbortSignal.timeout(timeoutMs)});
 const text=await res.text();
 if(!res.ok)throw new Error(`HTTP ${res.status}: ${text.slice(0,160)}`);
 return JSON.parse(text);
}
async function index(){
 if(filterCache&&Date.now()-filterCache.at<6*3600000)return filterCache.ix;
 const f=await get('/daily-price-arrival/filters',10000);if(!f?.data?.market_data)throw new Error('filters response has no market list');
 filterCache={at:Date.now(),ix:buildIndex(f.data)};return filterCache.ix;
}

export async function syncAgmarknet2(){
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const lease=crypto.randomUUID();
 const {data:acquired,error}=await supabaseAdmin.rpc('acquire_ingestion_lease',{p_source:AGM2_SOURCE,p_lease_id:lease});
 if(error)throw new Error('Could not establish the ingestion lock; no retrieval started.');
 if(!acquired)return {status:'running',stored:0,received:0,rejected:0,reportDate:null as string|null,errors:[] as string[],message:'An AGMARKNET retrieval is already running.'};
 try{return await run(supabaseAdmin);}finally{await supabaseAdmin.rpc('release_ingestion_lease',{p_source:AGM2_SOURCE,p_lease_id:lease});}
}
async function run(db:any){
 const started=new Date().toISOString(),today=new Date(Date.now()+5.5*3600000).toISOString().slice(0,10);const errors:string[]=[];
 const {data:st}=await db.from('agri_sync_state').select('next_offset').eq('source',AGM2_SOURCE).maybeSingle();const offset=Number(st?.next_offset)||0;
 const {data:targets,error:tErr}=await db.rpc('agmarknet2_targets',{p_offset:offset,p_limit:AGM2_BATCH});
 if(tErr)errors.push(`targets: ${tErr.message}`);
 const list:(Target&{total:number})[]=targets||[];const total=Number(list[0]?.total)||0;
 let ix:Agm2Index|null=null;try{ix=await index();}catch(e){errors.push(`filters: ${e instanceof Error?e.message:e}`);}
 const records:DailyRecord[]=[];let requested=0,unmatched=0,failed=0,skipped=0;
 if(ix){let i=0;await Promise.all(Array.from({length:10},async()=>{while(i<list.length){const t=list[i++]!;const id=resolveTarget(ix!,t);if(!id){unmatched++;continue;}requested++;
  try{const d=await get(`/prices-and-arrivals/commodity-price/lastweek?marketId=${id.marketId}&stateId=${id.stateId}&commodityId=${id.commodityId}&includeExcel=false`);const p=parseLastWeek(d,t,id.commodityName,started,today);records.push(...p.records);skipped+=p.skipped;}
  catch(e){failed++;if(errors.length<20)errors.push(`${t.market}/${t.commodity}: ${e instanceof Error?e.message:e}`);}}}));}
 let stored=0;
 for(let k=0;k<records.length;k+=50){const {data,error}=await db.rpc('publish_official_reports',{records:records.slice(k,k+50),p_source:AGM2_SOURCE,p_url:AGM2_URL,p_dataset:`api.agmarknet.gov.in commodity-price/lastweek targets ${offset}-${offset+list.length} of ${total}`});if(error){errors.push(`store: ${error.message}`);break;}stored+=Number(data)||0;}
 const reportDate=records.reduce((m,r)=>r.date>m?r.date:m,'')||null;
 if(stored>0){const {error:e}=await db.rpc('refresh_agri_summary');if(e)errors.push(`summary: ${e.message}`);await db.rpc('evaluate_farmer_alerts');}
 const allFailed=requested>0&&failed===requested;
 const status=stored>0?(failed||errors.length?'partial':'success'):allFailed||!ix||tErr?'failed':'no_records';
 const next=allFailed||!ix?offset:nextOfficialOffset(offset,list.length,total);
 const message=`${status}: ${stored} reports stored · ${requested} market/crop requests (${failed} failed, ${unmatched} not in AGMARKNET 2.0 list) · targets ${offset}-${offset+list.length} of ${total}${reportDate?` · latest market report ${reportDate}`:''}${errors[0]?` · ${errors[0]}`:''}`;
 const finished=new Date().toISOString();
 await db.from('agri_sync_state').upsert({source:AGM2_SOURCE,status,...(stored>0?{last_success:finished}:{}),updated_at:finished,message,next_offset:next},{onConflict:'source'});
 await db.from('agri_source_runs').insert({source:AGM2_SOURCE,report_date:reportDate,started_at:started,finished_at:finished,status,requested,received:records.length+skipped,stored,rejected:skipped,duplicates:0,message,errors:errors.slice(0,50)});
 return {status,stored,received:records.length,rejected:skipped,reportDate,errors:errors.slice(0,10),message};
}
