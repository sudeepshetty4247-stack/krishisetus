export type Coordinates={latitude:number;longitude:number};
export function verifiedYard(l:Coordinates&{match_quality:string}){return l.match_quality==='market_yard'&&Number.isFinite(l.latitude)&&Number.isFinite(l.longitude)&&Math.abs(l.latitude)<=90&&Math.abs(l.longitude)<=180;}
export function yardDistance(a:Coordinates,b:Coordinates&{match_quality:string}){return verifiedYard(b)?distanceKm(a,b):null;}
export function distanceKm(a:Coordinates,b:Coordinates){
 const rad=(n:number)=>n*Math.PI/180;
 const dLat=rad(b.latitude-a.latitude),dLon=rad(b.longitude-a.longitude);
 const h=Math.sin(dLat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}