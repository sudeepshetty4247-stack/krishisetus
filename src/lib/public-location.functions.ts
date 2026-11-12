import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
export const searchPublicLocations=createServerFn({method:'POST'}).inputValidator((input:unknown)=>z.object({query:z.string().trim().min(3).max(100),language:z.enum(['en','kn','hi','te','ta','ml','mr']).default('en')}).parse(input)).handler(async({data})=>{
 const url=new URL('https://geocoding-api.open-meteo.com/v1/search');
 url.search=new URLSearchParams({name:data.query,count:'8',countryCode:'IN',language:data.language,format:'json'}).toString();
 try{const res=await fetch(url,{signal:AbortSignal.timeout(8000)});if(!res.ok)return {places:[],available:false};
 const result=await res.json() as {results?:{id:number;name:string;latitude:number;longitude:number;country_code:string;admin1?:string;admin2?:string}[]};
 return {available:true,places:(result.results||[]).filter(p=>p.country_code==='IN'&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)).map(p=>({id:String(p.id),name:p.name,state:p.admin1||'',district:(p.admin2||'').replace(/ district$/i,''),latitude:p.latitude,longitude:p.longitude}))};
 }catch{return {places:[],available:false};}
});

export const identifyPublicLocation=createServerFn({method:'POST'}).inputValidator((input:unknown)=>z.object({latitude:z.number().min(6).max(38),longitude:z.number().min(68).max(98)}).parse(input)).handler(async({data})=>{
 const url=new URL('https://nominatim.openstreetmap.org/reverse');url.search=new URLSearchParams({format:'jsonv2',lat:String(data.latitude),lon:String(data.longitude),zoom:'12'}).toString();
 try{const res=await fetch(url,{headers:{'User-Agent':'KRISHISETU farmer location lookup','Accept-Language':'en'},signal:AbortSignal.timeout(8000)});if(!res.ok)return {available:false,name:'',state:'',district:''};
 const result=await res.json() as {name?:string;address?:{village?:string;town?:string;city?:string;state?:string;state_district?:string;country_code?:string}};const a=result.address;
 if(a?.country_code!=='in')return {available:false,name:'',state:'',district:''};return {available:true,name:a.village||a.town||a.city||result.name||'',state:a.state||'',district:a.state_district||''};
 }catch{return {available:false,name:'',state:'',district:''};}
});