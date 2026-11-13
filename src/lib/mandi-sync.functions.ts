import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {recentlyCompleted} from './source-monitor';
// Signed-in manual refresh of the next AGMARKNET 2.0 batch. Skips when the scheduled job just ran.
export const refreshDailyPrices=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async()=>{
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {AGM2_SOURCE,syncAgmarknet2}=await import('@/lib/agmarknet2.server');
 const {data}=await supabaseAdmin.from('agri_source_runs').select('started_at,status,message').eq('source',AGM2_SOURCE).order('started_at',{ascending:false}).limit(1).maybeSingle();
 if(data&&recentlyCompleted(data.started_at,data.status))return {status:'recent',stored:0,message:`Already refreshed recently: ${data.message??''}`};
 const r=await syncAgmarknet2();return {status:r.status,stored:r.stored,message:r.message};
});
