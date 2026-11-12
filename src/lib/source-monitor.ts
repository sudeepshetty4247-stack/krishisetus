export function sourceHealth(startedAt:string|undefined,status:string|undefined,now=new Date()){
 if(!startedAt)return {state:'never_run' as const,missed:true};
 const age=now.getTime()-Date.parse(startedAt);
 if(!Number.isFinite(age)||age>4*3600000)return {state:'missed' as const,missed:true};
 return {state:status==='success'?'healthy' as const:'attention' as const,missed:false};
}
// A failed or partial run must not block a repair attempt for thirty minutes.
export function recentlyCompleted(startedAt:string|undefined,status:string|undefined,now=new Date()){
 const age=startedAt?now.getTime()-Date.parse(startedAt):NaN;
 return status==='success'&&Number.isFinite(age)&&age>=0&&age<30*60000;
}