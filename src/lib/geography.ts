export type Coordinates={latitude:number;longitude:number};
export function verifiedYard(l:Coordinates&{match_quality:string}){return l.match_quality==='market_yard'&&Number.isFinite(l.latitude)&&Number.isFinite(l.longitude)&&Math.abs(l.latitude)<=90&&Math.abs(l.longitude)<=180;}
export function yardDistance(a:Coordinates,b:Coordinates&{match_quality:string}){return verifiedYard(b)?distanceKm(a,b):null;}
export const RADIUS_OPTIONS=[25,50,100,200,300,500,1000] as const;
export function currentNearbyReports<T extends {date:string}>(rows:T[],now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const day=Date.parse(today+'T00:00:00Z');
 return rows.filter(r=>{const age=(day-Date.parse(r.date+'T00:00:00Z'))/86400000;return age>=0&&age<=7;});
}
// Nearest verified yards within the chosen radius, capped so one price request stays bounded.
export function nearestYards<T extends Coordinates&{match_quality:string}>(origin:Coordinates,locations:T[],radius:number,limit=150){
 return locations.filter(verifiedYard).map(location=>({location,km:distanceKm(origin,location)})).filter(x=>x.km<=radius).sort((a,b)=>a.km-b.km).slice(0,limit).map(x=>x.location);
}
export function distanceKm(a:Coordinates,b:Coordinates){
 const rad=(n:number)=>n*Math.PI/180;
 const dLat=rad(b.latitude-a.latitude),dLon=rad(b.longitude-a.longitude);
 const h=Math.sin(dLat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}