import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
export const predictYield=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({state:z.string().min(1).max(200),district:z.string().min(1).max(200),crop:z.string().min(1).max(200),season:z.string().min(1).max(100),year:z.number().int().min(1997).max(2100)}).parse(input)).handler(async({data,context})=>{
 const origin=process.env['KRISHI_PYTHON_URL'];const token=process.env['KRISHI_PYTHON_TOKEN'];
 if(!origin||!token)return {available:false,error:'The trained yield model is saved, but online prediction is not connected to the Python service.'};
 const target=new URL('/v1/yield/predict',origin);if(target.protocol!=='https:'&&target.hostname!=='127.0.0.1')throw new Error('Yield service requires HTTPS');
 try{const r=await fetch(target,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,'X-Owner-ID':context.userId},body:JSON.stringify(data),signal:AbortSignal.timeout(25000)});if(!r.ok)return {available:false,error:r.status===422?'This combination or year is not supported by the evaluated yield dataset.':'Yield prediction is unavailable; no estimate was generated.'};const v=z.object({available:z.literal(true),predicted_yield:z.number().finite().nonnegative(),unit:z.literal('tonnes/hectare'),model:z.string(),basis:z.string()}).parse(await r.json());return v;}catch{return {available:false,error:'Yield service did not respond; no replacement estimate was generated.'};}
});
