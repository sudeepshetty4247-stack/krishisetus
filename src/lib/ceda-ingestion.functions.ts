import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {z} from 'zod';
const schema=z.object({commodity_id:z.number().int().positive(),state_id:z.number().int().positive(),district_id:z.number().int().positive(),market_id:z.number().int().positive().optional(),from_date:z.string().date(),to_date:z.string().date()});
export const retrieveCedaReports=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>schema.parse(input)).handler(async({data})=>{
 if(data.from_date>data.to_date||Date.parse(data.to_date)-Date.parse(data.from_date)>366*86400000)throw new Error('Choose a source interval of at most one year.');
 const key=process.env['UDC_CEDA_AGRICULTURAL_DATA_API_KEY'],auth=process.env['LOVABLE_API_KEY'];if(!key||!auth)throw new Error('CEDA is not connected.');
 const headers:Record<string,string>={Authorization:`Bearer ${auth}`,'X-Connection-Api-Key':key,'Content-Type':'application/json'};
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 try {
 async function request(action:string,body?:unknown):Promise<Record<string,unknown>[]>{
  const invoke=()=>fetch('https://connector-gateway.lovable.dev/udc_ceda_agricultural_data/agmarknet/'+action,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000)});
  let res:Response;
  try{res=await invoke();}catch{res=await invoke();}
  if(res.status>=500){await new Promise(resolve=>setTimeout(resolve,1000));res=await invoke();}
  if(!res.ok){console.error('CEDA ingestion',res.status,await res.text());throw new Error(`CEDA report retrieval failed (${res.status}). No update is claimed.`);}
  const parsed=await res.json() as {output?:{type?:string;data?:Record<string,unknown>[];message?:string}};
  if(parsed.output?.type==='error'||!Array.isArray(parsed.output?.data))throw new Error('CEDA response schema is unsupported.');return parsed.output.data;
 }
 const [commodities,geographies,markets]=await Promise.all([request('commodities'),request('geographies'),request('markets',{commodity_id:data.commodity_id,state_id:data.state_id,district_id:data.district_id,indicator:'price'})]);
 const commodity=commodities.find(r=>r['commodity_id']===data.commodity_id),geo=geographies.find(r=>r['census_state_id']===data.state_id&&r['census_district_id']===data.district_id);
 if(!commodity||!geo)throw new Error('Source catalogue could not resolve geography or crop.');
 const records=await request('prices',{commodity_id:data.commodity_id,state_id:data.state_id,district_id:[data.district_id],...(data.market_id?{market_id:[data.market_id]}:{}),from_date:data.from_date,to_date:data.to_date});
 if(records.length>20000)throw new Error('Source returned too many observations; retrieve a shorter interval.');
 const accepted=[];let rejected=0;
 for(const raw of records){
  const market=markets.find(r=>r['market_id']===raw['market_id']);const date=String(raw['date']||'').slice(0,10);const modal=Number(raw['modal_price']),minimum=raw['min_price']==null?null:Number(raw['min_price']),maximum=raw['max_price']==null?null:Number(raw['max_price']);
  if(raw['commodity_id']!==data.commodity_id||raw['census_state_id']!==data.state_id||raw['census_district_id']!==data.district_id||(data.market_id&&raw['market_id']!==data.market_id)||!market||!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<data.from_date||date>data.to_date||!Number.isFinite(modal)||modal<=0||(minimum!==null&&(!Number.isFinite(minimum)||minimum>modal))||(maximum!==null&&(!Number.isFinite(maximum)||maximum<modal))){rejected++;continue;}
  accepted.push({commodity_id:data.commodity_id,state_id:data.state_id,district_id:data.district_id,market_id:Number(raw['market_id']),commodity:String(commodity['commodity_name']),state:String(geo['census_state_name']),district:String(geo['census_district_name']),market:String(market['market_name']),date,min_price:minimum,max_price:maximum,modal_price:modal,variety:typeof raw['variety']==='string'?raw['variety']:null,price_unit:typeof raw['price_unit']==='string'?raw['price_unit']:null,raw_response:raw as Record<string,string|number|null>,retrieved_at:new Date().toISOString()});
 }
 for(let i=0;i<accepted.length;i+=250){const {error}=await supabaseAdmin.from('ceda_observations').upsert(accepted.slice(i,i+250),{onConflict:'commodity_id,state_id,district_id,market_id,date'});if(error)throw new Error(error.message);}
 await supabaseAdmin.from('agri_source_checks').insert({source:'ceda',status:accepted.length?'stored':'no_records',message:`${accepted.length} historical source observations stored; ${rejected} rejected. Missing varieties/units are preserved and excluded from variety-specific selling rankings.`});
 return {stored:accepted.length,rejected,message:accepted.length?'Source observations stored. Variety and unit completeness are shown separately.':'Source returned no records for this interval; no successful refresh is claimed.'};
 }catch(error){
  const message=error instanceof Error?error.message:'Source retrieval failed.';
  await supabaseAdmin.from('agri_source_checks').insert({source:'ceda',status:'failed',message:`Report download failed; no successful refresh is claimed. ${message}`});
  throw new Error(message);
 }
});