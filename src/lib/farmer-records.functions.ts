import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {z} from 'zod';
import {planSchema} from './plans';
import {alertSchema} from './alerts';
import type {Json} from '@/integrations/supabase/types';
const kind=z.enum(['plan','alert']);
export const listFarmerRecords=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>kind.parse(v)).handler(async({data,context})=>{
 const {data:rows,error}=await context.supabase.from('farmer_records').select('payload').eq('owner_id',context.userId).eq('kind',data).order('updated_at',{ascending:false}).limit(data==='plan'?50:30);
 if(error)throw new Error('Saved records could not be loaded.');
 return (rows||[]).map(r=>r.payload);
});
export const putFarmerRecord=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>{
 const input=z.object({kind,payload:z.unknown()}).parse(v);
 return {kind:input.kind,payload:input.kind==='plan'?planSchema.parse(input.payload):alertSchema.parse(input.payload)};
}).handler(async({data,context})=>{
 const {error}=await context.supabase.from('farmer_records').upsert({owner_id:context.userId,kind:data.kind,id:data.payload.id,payload:data.payload as unknown as Json,updated_at:new Date().toISOString()},{onConflict:'owner_id,kind,id'});
 if(error)throw new Error('Could not save your record. Please retry.');return {saved:true};
});
export const deleteFarmerRecord=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({kind,id:z.string().min(1).max(200)}).parse(v)).handler(async({data,context})=>{
 const {error}=await context.supabase.from('farmer_records').delete().eq('owner_id',context.userId).eq('kind',data.kind).eq('id',data.id);
 if(error)throw new Error('Could not remove your record. Please retry.');return {deleted:true};
});