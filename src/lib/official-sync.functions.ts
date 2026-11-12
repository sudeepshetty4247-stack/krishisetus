import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
export const syncOfficial=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const {data,error}=await context.supabase.from('user_roles').select('role').eq('user_id',context.userId).eq('role','admin');
 if(error||!data?.length)throw new Error('Administrator permission is required for official publication.');
 const {syncOfficialBatch}=await import('./official-sync.server');return syncOfficialBatch();
});