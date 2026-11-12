import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import Papa from 'papaparse';
import type {Json} from '@/integrations/supabase/types';

export const importReports=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({text:z.string().max(5*1024*1024),source:z.string().trim().min(1).max(200),url:z.string().url().max(1000),filename:z.string().max(200)}).parse(input)).handler(async({data,context})=>{
 const {data:roles,error:roleError}=await context.supabase.from('user_roles').select('role').eq('user_id',context.userId);
 if(roleError||!roles?.some(r=>r.role==='admin'||r.role==='researcher'))throw new Error('Authorized research or administrator access is required for uploads.');
 const parsed=Papa.parse<Record<string,string>>(data.text,{header:true,skipEmptyLines:true,transformHeader:h=>h.trim().toLowerCase().replace(/[\s-]+/g,'_')});
 if(parsed.errors.length)throw new Error('Invalid CSV format');
 if(parsed.data.length>10000)throw new Error('Split files into at most 10,000 records per import');
 const keys=new Set<string>();const errors:{row:number;reason:string}[]=[];let duplicates=0;
 const reports: {state:string;district:string;market:string;commodity:string;variety:string;date:string;min_price:number|null;max_price:number|null;modal_price:number;arrivals:number|null;arrival_unit:string|null}[]=[];
 for(const [i,r]of parsed.data.entries()){
  const text=(key:string)=>(r[key]||'').trim().replace(/\s+/g,' ');
  const dateRaw=text('arrival_date')||text('date');const match=dateRaw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);const date=match?`${match[3]}-${match[2]}-${match[1]}`:dateRaw;
  const min=text('min_price')?Number(text('min_price').replaceAll(',','')):null;const max=text('max_price')?Number(text('max_price').replaceAll(',','')):null;const modal=Number(text('modal_price').replaceAll(',',''));const unit=text('price_unit').toLowerCase().replaceAll(' ','');
  const item={state:text('state'),district:text('district'),market:text('market'),commodity:text('commodity'),variety:text('variety'),date,min_price:min,max_price:max,modal_price:modal,arrivals:text('arrivals')?Number(text('arrivals')):null,arrival_unit:text('arrival_unit')||null};
  if(![item.state,item.district,item.market,item.commodity,item.variety].every(s=>s.length>0&&s.length<=200)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>new Date().toISOString().slice(0,10)||!Number.isFinite(modal)||modal<=0||modal>=1e9||(min!==null&&(!Number.isFinite(min)||min<0||min>modal))||(max!==null&&(!Number.isFinite(max)||max<modal))||!['inr/quintal','rs/quintal','₹/quintal','inr/qtl'].includes(unit)||(item.arrivals!==null&&(!Number.isFinite(item.arrivals)||item.arrivals<0||!item.arrival_unit))){errors.push({row:i+2,reason:'Invalid geography, variety, date, price, unit or arrivals'});continue;}
  const key=JSON.stringify([item.state,item.district,item.market,item.commodity,item.variety,date]);if(keys.has(key)){duplicates++;continue;}keys.add(key);reports.push(item);
 }
 const {data:imp,error}=await context.supabase.from('agri_imports').insert({owner_id:context.userId,source_name:data.source,source_url:data.url,filename:data.filename,raw_text:data.text,accepted:reports.length,rejected:errors.length,duplicates,errors}).select('id').single();if(error||!imp)throw new Error(error?.message||'Import failed');
 for(let i=0;i<reports.length;i+=250){const {error:write}=await context.supabase.from('agri_reports').insert(reports.slice(i,i+250).map(r=>({...r,import_id:imp.id,owner_id:context.userId,official:false,source_name:data.source,source_url:data.url})));if(write){await context.supabase.from('agri_imports').delete().eq('id',imp.id);throw new Error('Import rolled back: '+write.message);}}
 return {id:imp.id,accepted:reports.length,rejected:errors.length,duplicates,errors:errors.slice(0,50)};
});

export const sourceCheck=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.enum(['ceda','agmarknet','data_gov','python','enam','rems']).parse(input)).handler(async({data})=>{
 let status='not_configured',message='';let url='';
 if(data==='ceda'){url='https://api.ceda.ashoka.edu.in/v1/agmarknet/commodities';message='CEDA production base verified: /v1. Authorized API key required; no data is retrieved without it.';}
 else if(data==='agmarknet'){url='https://api.agmarknet.gov.in/v1/daily-price-arrival/filters';message='Public AGMARKNET 2.0 contract. Catalogue access does not prove historical report coverage.';}
 else if(data==='data_gov'){url='https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?format=json&limit=1';message='Authorized data.gov.in API key required for retrieval.';}
 else if(data==='python'){url=process.env['KRISHI_PYTHON_URL']?new URL('/service/health',process.env['KRISHI_PYTHON_URL']).toString():'';message='No reachable Python service configured. Python training does not run inside the browser.';}
 else message='No officially documented programmatic connector has been verified. Authorized exports can be imported.';
 if(url){try{const key=process.env['UDC_CEDA_AGRICULTURAL_DATA_API_KEY'];const auth=process.env['LOVABLE_API_KEY'];const connected=data==='ceda'&&!!key&&!!auth;const response=await fetch(connected?'https://connector-gateway.lovable.dev/udc_ceda_agricultural_data/agmarknet/commodities':url,{...(connected?{headers:{Authorization:`Bearer ${auth}`,'X-Connection-Api-Key':key}}:{}),signal:AbortSignal.timeout(15000)});status=response.ok?'reachable':`http_${response.status}`;message=response.ok?'Endpoint reachable; this is a connection test, not a completed data download.':`${message} Endpoint returned HTTP ${response.status}.`;}catch{status='unreachable';message+=' Connection timed out or failed.';}}
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');await supabaseAdmin.from('agri_source_checks').insert({source:data,status,message});return {source:data,status,message,checked_at:new Date().toISOString()};
});

export const pythonAction=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({action:z.enum(['train','analytics','compare','backtest','forecast','models','job','explain']),payload:z.record(z.unknown())}).parse(input)).handler(async({data,context})=>{
 if(data.action==='train'){
  const {data:roles,error}=await context.supabase.from('user_roles').select('role').eq('user_id',context.userId);
  if(error||!roles?.some(r=>r.role==='admin'||r.role==='researcher'))throw new Error('Authorized research access is required to start training.');
 }
 const origin=process.env['KRISHI_PYTHON_URL'];const token=process.env['KRISHI_PYTHON_TOKEN'];
 if(!origin||!token)return {available:false,error:'Python service is not configured. A reachable Python service is required for training, forecasts and analytical calculations.'};
 const target=new URL('/service/'+data.action,origin);if(target.protocol!=='https:'&&target.hostname!=='127.0.0.1')throw new Error('Python service requires HTTPS');
 let rows:unknown[]=[];
 if(['train','analytics','compare','backtest'].includes(data.action)){
  const filters=z.object({state:z.string().max(200).optional(),district:z.string().max(200).optional(),market:z.string().max(200).optional(),commodity:z.string().min(1).max(200),variety:z.string().min(1).max(200),source:z.string().min(1).max(200),start:z.string().optional(),end:z.string().optional()}).parse(data.payload['filters']);
  let query=context.supabase.from('agri_reports').select('*');for(const [k,v]of Object.entries(filters)){if(!v)continue;if(k==='source')query=query.eq('source_name',v);else if(k==='start')query=query.gte('date',v);else if(k==='end')query=query.lte('date',v);else query=query.eq(k as 'state'|'district'|'market'|'commodity'|'variety',v);}
  const all:Record<string,Json>[]=[];for(let offset=0;offset<10000;offset+=1000){const {data:reports,error}=await query.order('date').order('id').range(offset,offset+999);if(error)throw new Error(error.message);all.push(...(reports||[]));if((reports?.length||0)<1000)break;if(offset===9000)throw new Error('Narrow the date range to fewer than 10,000 reports; analysis must not silently truncate input.');}rows=all;
 }
 try{const response=await fetch(target,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({...data.payload,records:rows,owner:context.userId}),signal:AbortSignal.timeout(25000)});if(!response.ok){const text=await response.text();console.error(`Python [${response.status}]: ${text}`);let message=text;try{message=String((JSON.parse(text) as {error?:string}).error||text);}catch{/* retain error */}return {available:false,error:`Python [${response.status}]: ${message}`};}const result=await response.json() as {[key:string]:Json};return {available:true,result};}catch{return {available:false,error:'Python service did not respond. No successful calculation or training run is claimed.'};}
});