import {z} from 'zod';
const row=z.object({state:z.string().min(1).max(200),district:z.string().min(1).max(200),market:z.string().min(1).max(200),commodity:z.string().min(1).max(200),variety:z.string().min(1).max(200),date:z.string().date(),min_price:z.number().nonnegative().nullable(),max_price:z.number().positive().nullable(),modal_price:z.number().positive().max(1e9),price_unit:z.literal('INR/quintal'),arrivals:z.number().nonnegative().nullable(),arrival_unit:z.string().nullable(),source_name:z.literal('AGMARKNET'),source_url:z.literal('https://agmarknet.gov.in'),retrieved_at:z.string().datetime({offset:true}),suspicious:z.boolean()}).refine(r=>(r.min_price===null||r.min_price<=r.modal_price)&&(r.max_price===null||r.max_price>=r.modal_price)&&r.date<=new Date().toISOString().slice(0,10)&&(r.arrivals===null||!!r.arrival_unit),'Invalid source prices, date or arrival units');
export async function syncOfficialBatch(){
 const origin=process.env['KRISHI_PYTHON_URL'],token=process.env['KRISHI_PYTHON_TOKEN'];
 if(!origin||!token)return {available:false,message:'No deployed Python ingestion service is configured.'};
 const target=new URL('/service/official-reports',origin);if(target.protocol!=='https:')throw new Error('Official sync requires an HTTPS Python service');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {data:state,error:stateError}=await supabaseAdmin.from('agri_sync_state').select('next_offset').eq('source','agmarknet').maybeSingle();if(stateError)throw stateError;
 const offset=state?.next_offset||0;
 const response=await fetch(target,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({offset,limit:1000}),signal:AbortSignal.timeout(20000)});
 if(!response.ok){const text=await response.text();console.error(`Python source sync [${response.status}]: ${text}`);throw new Error(`Official sync failed [${response.status}]: ${text}`);}
 const batch=z.object({contract_version:z.literal(1),source_verified:z.literal(true),records:z.array(row).max(1000),total:z.number().int().nonnegative(),offset:z.number().int().nonnegative()}).parse(await response.json());
 if(batch.offset!==offset)throw new Error('Python source cursor does not match hosted cursor');
 const next=offset+batch.records.length,complete=next>=batch.total;
 if(!complete&&!batch.records.length)throw new Error('Source pagination stopped before completing its snapshot');
 const {data:count,error}=await supabaseAdmin.rpc('publish_agmarknet_batch',{records:batch.records,expected_offset:offset,next_offset:next,finished:complete});if(error)throw error;
 return {available:true,message:`${count} verified reports published.`,complete,total:batch.total};
}