import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
// Signed-in manual refresh. Skips when the scheduled job already refreshed within 30 minutes.
export const refreshDailyPrices=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async()=>{
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {DAILY_SOURCE,syncDailyMandi}=await import('@/lib/mandi-sync.server');
 const {data}=await supabaseAdmin.from('agri_source_runs').select('started_at,message').eq('source',DAILY_SOURCE).order('started_at',{ascending:false}).limit(1).maybeSingle();
 if(data&&Date.now()-Date.parse(data.started_at)<30*60000)return {status:'recent',stored:0,message:`Already refreshed recently: ${data.message??''}`};
 return syncDailyMandi();
});
