import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';

const querySchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('commodities')}),
 z.object({action:z.literal('geographies')}),
 z.object({action:z.literal('markets'),commodity_id:z.number().int().positive(),state_id:z.number().int().positive(),district_id:z.number().int().positive(),indicator:z.enum(['price','quantity'])}),
 z.object({action:z.enum(['prices','quantities']),commodity_id:z.number().int().positive(),state_id:z.number().int().nonnegative(),district_id:z.array(z.number().int().positive()).max(20).optional(),market_id:z.array(z.number().int().positive()).max(20).optional(),from_date:z.string().date(),to_date:z.string().date()})
]);
export const cedaQuery=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>querySchema.parse(input)).handler(async({data})=>{
 const key=process.env['UDC_CEDA_AGRICULTURAL_DATA_API_KEY'];const auth=process.env['LOVABLE_API_KEY'];
 if(!key||!auth)return {ok:false,status:503,message:'CEDA connection is not configured.',records:[] as Record<string,string|number>[]};
 const {action,...body}=data;
 if('from_date' in body&&(body.from_date>body.to_date||Date.parse(body.to_date)-Date.parse(body.from_date)>366*86400000))throw new Error('Choose a valid date range of at most one year.');
 try{
  const response=await fetch('https://connector-gateway.lovable.dev/udc_ceda_agricultural_data/agmarknet/'+action,{method:action==='commodities'||action==='geographies'?'GET':'POST',headers:{Authorization:`Bearer ${auth}`,'X-Connection-Api-Key':key,'Content-Type':'application/json'},...((action==='commodities'||action==='geographies')?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(25000)});
  const result=await response.json() as {output?:{type?:string;message?:string;data?:Record<string,string|number>[]};message?:string;data?:Record<string,string|number>[]};
  return {ok:response.ok&&result.output?.type!=='error',status:response.status,message:result.output?.message||result.message||response.statusText,records:result.output?.data||result.data||[]};
 }catch{return {ok:false,status:504,message:'CEDA request timed out. No records have been substituted.',records:[] as Record<string,string|number>[]};}
});