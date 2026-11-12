import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {z} from 'zod';
import {distanceKm} from './geography';
const coordinates=z.object({latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180)});
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('town'),town:z.string().trim().min(2).max(160)}),
 z.object({action:z.literal('nearby'),origin:coordinates,radius:z.union([z.literal(25),z.literal(50),z.literal(100),z.literal(200)]),town:z.string().trim().max(160).optional()}),
 z.object({action:z.literal('route'),origin:coordinates,placeId:z.string().regex(/^[A-Za-z0-9_-]+$/).max(200)})
]);
type Place={id:string;displayName?:{text?:string};formattedAddress?:string;location?:{latitude:number;longitude:number};googleMapsUri?:string};
export const discoverMarkets=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>schema.parse(input)).handler(async({data})=>{
 const key=process.env['GOOGLE_MAPS_API_KEY'],auth=process.env['LOVABLE_API_KEY'];
 if(!key||!auth)throw new Error('Google Maps connection is not configured.');
 const headers={Authorization:`Bearer ${auth}`,'X-Connection-Api-Key':key,'Content-Type':'application/json'};
 const base='https://connector-gateway.lovable.dev/google_maps';
 let path:string,body:unknown,mask:string;
 if(data.action==='town'){
  path='/places/v1/places:searchText';mask='places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri';
  body={textQuery:`${data.town}, India`,pageSize:5,regionCode:'IN'};
 }else if(data.action==='nearby'){
  const latitudeDelta=data.radius/111,longitudeDelta=Math.min(180,data.radius/(111*Math.max(.05,Math.cos(data.origin.latitude*Math.PI/180))));
  path='/places/v1/places:searchText';mask='places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri';
  body={textQuery:`APMC agricultural mandi market ${data.town||''} India`,pageSize:20,locationBias:{rectangle:{low:{latitude:Math.max(-90,data.origin.latitude-latitudeDelta),longitude:Math.max(-180,data.origin.longitude-longitudeDelta)},high:{latitude:Math.min(90,data.origin.latitude+latitudeDelta),longitude:Math.min(180,data.origin.longitude+longitudeDelta)}}}};
 }else{
  path='/routes/directions/v2:computeRoutes';mask='routes.distanceMeters,routes.duration';
  body={origin:{location:{latLng:data.origin}},destination:{placeId:data.placeId},travelMode:'DRIVE'};
 }
 const response=await fetch(base+path,{method:'POST',headers:{...headers,'X-Goog-FieldMask':mask},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 if(!response.ok){
  const text=await response.text();console.error(`Google Maps [${response.status}]: ${text}`);
  if(response.status===403){
   let reason='';try{const error=JSON.parse(text) as {error?:{details?:{reason?:string}[]}};reason=error.error?.details?.find(d=>d.reason)?.reason||'';}catch{/* preserve provider text */}
   if(reason==='API_KEY_HTTP_REFERRER_BLOCKED')throw new Error('Google Maps server key is referrer-restricted. Set its application restrictions to None or IP addresses in Google Cloud Console.');
   if(reason==='API_KEY_SERVICE_BLOCKED')throw new Error('Google Maps server key does not allow this API. Enable Places API (New) or Routes API in Google Cloud Console.');
  }
  throw new Error(`Google Maps request failed [${response.status}]: ${text}`);
 }
 if(data.action==='nearby'||data.action==='town'){
  const result=await response.json() as {places?:Place[]};
  return {places:(result.places||[]).flatMap(p=>{if(!p.location||!p.displayName?.text)return [];const km=data.action==='nearby'?distanceKm(data.origin,p.location):0;return data.action==='town'||km<=data.radius?[{id:p.id,name:p.displayName.text,address:p.formattedAddress||'',latitude:p.location.latitude,longitude:p.location.longitude,straightLineKm:km,url:p.googleMapsUri||''}]:[]}).sort((a,b)=>a.straightLineKm-b.straightLineKm),distanceMeters:null,durationSeconds:null,limited:true};
 }
 const result=await response.json() as {routes?:{distanceMeters?:number;duration?:string}[]};const route=result.routes?.[0];
 const duration=route?.duration?.match(/^(\d+(?:\.\d+)?)s$/);if(!route||!duration)throw new Error('No supported driving route was returned.');
 return {places:[],distanceMeters:route.distanceMeters??0,durationSeconds:Number(duration[1]),limited:false};
});