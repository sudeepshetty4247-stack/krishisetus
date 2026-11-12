export function istTimestamp(value:string|null|undefined){
 if(!value||!Number.isFinite(Date.parse(value)))return '—';
 return new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(value))+' IST';
}
export function reportedDate(value:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return '—';
 return new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric'}).format(new Date(value+'T00:00:00+05:30'));
}
export function ageInIST(value:string,now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 return Math.max(0,Math.round((Date.parse(today+'T00:00:00Z')-Date.parse(value+'T00:00:00Z'))/86400000));
}