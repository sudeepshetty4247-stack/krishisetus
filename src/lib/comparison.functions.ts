import {createServerFn} from '@tanstack/react-start';
import {createClient} from '@supabase/supabase-js';
import type {Database} from '@/integrations/supabase/types';
import type {ModelRun} from '@/components/farmer/data';

export const getComparisonRecords=createServerFn({method:'GET'}).handler(async()=>{
 const url=process.env['SUPABASE_URL'];const key=process.env['SUPABASE_PUBLISHABLE_KEY'];
 if(!url||!key)throw new Error('Saved evaluation records are temporarily unavailable.');
 const client=createClient<Database>(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>{
  const headers=new Headers(init?.headers);if(key.startsWith('sb_')&&headers.get('Authorization')===`Bearer ${key}`)headers.delete('Authorization');headers.set('apikey',key);return fetch(input,{...init,headers});
 }}});
 const records:ModelRun[]=[];
 for(let offset=0;offset<2000;offset+=100){
  const {data,error}=await client.from('ml_runs').select('*').order('created_at',{ascending:false}).order('id').range(offset,offset+99);
  if(error)throw new Error('Saved evaluation records could not be retrieved. Please retry.');
  records.push(...(data||[]) as unknown as ModelRun[]);
  if((data?.length||0)<100)return records;
 }
 throw new Error('Evaluation catalogue exceeds the safe retrieval limit; no partial comparison is shown.');
});