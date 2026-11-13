import {createFileRoute} from '@tanstack/react-router';
import {authenticateCronRequest} from '@/integrations/supabase/cron-auth';
// Primary source: AGMARKNET 2.0. data.gov.in runs only when the India proxy is configured (direct calls are refused abroad).
export const Route=createFileRoute('/api/public/jobs/mandi-sync')({server:{handlers:{POST:async({request})=>{
 const denied=await authenticateCronRequest(request);if(denied)return denied;
 try{await request.text();}catch{/* body not used */}
 const {syncAgmarknet2}=await import('@/lib/agmarknet2.server');
 const agmarknet=await syncAgmarknet2();
 let datagov=null;
 if(process.env['MANDI_PROXY_URL']&&process.env['MANDI_PROXY_TOKEN']){const {syncDailyMandi}=await import('@/lib/mandi-sync.server');datagov=await syncDailyMandi({});}
 return Response.json({agmarknet,datagov});
}}}});
