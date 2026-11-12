import {createFileRoute} from '@tanstack/react-router';
import {authenticateCronRequest} from '@/integrations/supabase/cron-auth';
export const Route=createFileRoute('/api/public/jobs/mandi-sync')({server:{handlers:{POST:async({request})=>{
 const denied=await authenticateCronRequest(request);if(denied)return denied;
 let date:string|undefined;try{const body=await request.json() as {date?:unknown};if(typeof body.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(body.date))date=body.date;}catch{/* empty body = latest day */}
 const {syncDailyMandi}=await import('@/lib/mandi-sync.server');return Response.json(await syncDailyMandi({date}));
}}}});
