import {useEffect,useMemo,useRef,useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {useQuery} from '@tanstack/react-query';
import {MapPin,Navigation,LogIn,Route as RouteIcon} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {discoverMarkets} from '@/lib/geography.functions';
import {nearbyCopy} from '@/lib/nearby-copy';
import {useKrishi} from '../krishisetu-provider';
import {lovable} from '@/integrations/lovable';
import {supabase} from '@/integrations/supabase/client';
import {distanceKm,type Coordinates} from '@/lib/geography';
import {normalise} from '@/lib/commodity-search';
import {reportedDate,freshness,freshnessText} from '@/lib/price-time';
import {useMarketLocations,type MarketLocation} from './data';
import type {Report} from '@/lib/agri-types';
type Suggestion={key:string;label:string;detail:string;point:Coordinates;kind:'market'|'district'|'place'};
const kmLabel=(q:string)=>q==='market_yard'?'APMC yard':q==='town_centre'?'town centre':'approximate';
// Market positions come from geocoded official market names (market_locations). Distances are straight-line
// unless the farmer requests a road route. Prices are joined only on the exact reported market identity.
export function NearbyMarkets({crop,onPick}:{crop?:string;onPick?:(m:MarketLocation&{km:number})=>void}){
 const {lang,user}=useKrishi();const c=nearbyCopy(lang);const kn=lang==='kn';const call=useServerFn(discoverMarkets);const locs=useMarketLocations();
 const [origin,setOrigin]=useState<{point:Coordinates;label:string}|null>(null);const [radius,setRadius]=useState<25|50|100|200>(50);const [text,setText]=useState('');
 const [places,setPlaces]=useState<Suggestion[]>([]);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [roads,setRoads]=useState<Record<string,{km:number;min:number}>>({});const [open,setOpen]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);const latest=useRef('');
 const local=useMemo(()=>{const q=normalise(text);if(q.length<2)return [] as Suggestion[];const all=locs.data||[];const out:Suggestion[]=[];
  for(const l of all){if(normalise(l.market).includes(q))out.push({key:'m'+l.state+l.district+l.market,label:l.market,detail:`${l.district}, ${l.state} · APMC`,point:l,kind:'market'});}
  const districts=new Map<string,MarketLocation[]>();for(const l of all){if(normalise(l.district).startsWith(q)||normalise(l.state).startsWith(q)){const k=l.state+'|'+l.district;districts.set(k,[...(districts.get(k)||[]),l]);}}
  for(const [k,list] of districts){const lat=list.reduce((a,l)=>a+l.latitude,0)/list.length,lng=list.reduce((a,l)=>a+l.longitude,0)/list.length;out.push({key:'d'+k,label:list[0]!.district,detail:`${list[0]!.state} · ${kn?'ಜಿಲ್ಲೆ ಕೇಂದ್ರ (ಮಾರುಕಟ್ಟೆಗಳ ಸರಾಸರಿ)':'district (centre of its markets)'}`,point:{latitude:lat,longitude:lng},kind:'district'});}
  return out.slice(0,6);},[text,locs.data,kn]);
 useEffect(()=>{if(timer.current)clearTimeout(timer.current);setPlaces([]);const q=text.trim();if(!user||q.length<3||origin?.label===q)return;
  timer.current=setTimeout(async()=>{latest.current=q;try{const r=await call({data:{action:'town',town:q}});if(latest.current!==q)return;setPlaces(r.places.map(p=>({key:'p'+p.id,label:p.name,detail:p.address,point:{latitude:p.latitude,longitude:p.longitude},kind:'place' as const})));}catch(e){setError(e instanceof Error?e.message:c.error);}},500);
  return ()=>{if(timer.current)clearTimeout(timer.current);};},[text,user]); // eslint-disable-line react-hooks/exhaustive-deps
 const suggestions=[...local,...places].slice(0,10);
 const nearby=useMemo(()=>{if(!origin)return [];return (locs.data||[]).map(l=>({...l,km:distanceKm(origin.point,l)})).filter(l=>l.km<=radius).sort((a,b)=>a.km-b.km).slice(0,40);},[origin,locs.data,radius]);
 const prices=useQuery({enabled:nearby.length>0,queryKey:['nearby-prices',crop||'',nearby.map(n=>n.market).join('|')],queryFn:async()=>{let q=supabase.from('agri_reports').select('*').in('market',nearby.map(n=>n.market)).order('date',{ascending:false}).limit(3000);if(crop)q=q.eq('commodity',crop);const {data,error}=await q;if(error)throw error;return (data||[]) as unknown as Report[];}});
 const byMarket=useMemo(()=>{const m=new Map<string,Report[]>();for(const r of prices.data||[]){const k=r.state+'|'+r.district+'|'+r.market;m.set(k,[...(m.get(k)||[]),r]);}return m;},[prices.data]);
 function locate(){setError('');if(!navigator.geolocation){setError(c.denied);return;}setBusy(true);navigator.geolocation.getCurrentPosition(p=>{setBusy(false);setOrigin({point:{latitude:p.coords.latitude,longitude:p.coords.longitude},label:kn?'ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಸ್ಥಳ':'Your current location'});},()=>{setBusy(false);setError(c.denied);},{enableHighAccuracy:false,timeout:15000,maximumAge:300000});}
 const ft=freshnessText[lang]??freshnessText['en']!;
 return <section className="ks-section ks-nearby" aria-label={c.find}><h2 className="mb-4">{c.find}</h2>
  <div className="ks-location-grid">
   <Button variant="outline" disabled={busy} onClick={locate}><Navigation/>{c.locate}</Button>
   <div className="ks-manual-location ks-autocomplete"><label htmlFor="ks-loc-input">{kn?'ಯಾವುದೇ ಸ್ಥಳ: ಗ್ರಾಮ, ಊರು, ಜಿಲ್ಲೆ, APMC, ರಾಜ್ಯ':'Any location: village, town, district, APMC or state'}</label>
    <input id="ks-loc-input" role="combobox" aria-expanded={open&&suggestions.length>0} value={text} maxLength={160} autoComplete="off" onFocus={()=>setOpen(true)} onChange={e=>{setText(e.target.value);setOpen(true);}} placeholder={kn?'ಉದಾ: ಧಾರವಾಡ, ಹುಬ್ಬಳ್ಳಿ':'e.g. Dharwad, Hubballi'}/>
    {open&&suggestions.length>0&&<ul className="ks-suggest" role="listbox">{suggestions.map(s=><li key={s.key}><button type="button" role="option" aria-selected={false} onClick={()=>{setOrigin({point:s.point,label:s.label});setText(s.label);setOpen(false);setRoads({});}}><MapPin/><span><b>{s.label}</b><small>{s.detail}{s.kind==='place'?' · Google Maps':''}</small></span></button></li>)}</ul>}
    {!user&&<small className="ks-fine">{kn?'ಗ್ರಾಮಗಳ ಹುಡುಕಾಟಕ್ಕೆ ಸೈನ್ ಇನ್ ಮಾಡಿ; ಮಾರುಕಟ್ಟೆ/ಜಿಲ್ಲೆ ಹೆಸರುಗಳು ಸೈನ್ ಇನ್ ಇಲ್ಲದೆ ಕೆಲಸ ಮಾಡುತ್ತವೆ.':'Village search needs sign-in; market and district names work without it.'} <button type="button" className="ks-link" onClick={async()=>{const r=await lovable.auth.signInWithOAuth('lovable',{redirect_uri:window.location.origin});if(r.error)setError(r.error.message);}}><LogIn className="inline size-4"/> {c.signIn}</button></small>}
   </div>
   <label className="ks-radius">{c.radius}<select aria-label={c.radius} value={radius} onChange={e=>setRadius(Number(e.target.value) as 25|50|100|200)}>{[25,50,100,200].map(k=><option key={k} value={k}>{k} {c.km}</option>)}</select></label>
  </div>
  {busy&&<p role="status">{c.loading}</p>}{error&&<p className="ks-notice warn" role="alert">{error}</p>}
  {origin&&<p className="ks-fine">{kn?'ಆರಂಭ':'From'}: <b>{origin.label}</b> · {nearby.length} {kn?'ಮಾರುಕಟ್ಟೆಗಳು':'markets'} ≤ {radius} km · {kn?'ನೇರ ರೇಖೆಯ ದೂರ (ರಸ್ತೆ ದೂರ ಬಟನ್ ಒತ್ತಿ)':'straight-line distance (press Road distance for driving)'}</p>}
  {origin&&!nearby.length&&!locs.isLoading&&<p className="ks-notice">{kn?'ಈ ದೂರದಲ್ಲಿ ಸ್ಥಳ ಪರಿಶೀಲಿಸಿದ ಮಾರುಕಟ್ಟೆ ಇಲ್ಲ. ದೂರ ಹೆಚ್ಚಿಸಿ. ಸದ್ಯ ಕರ್ನಾಟಕದ ಮಾರುಕಟ್ಟೆಗಳ ಸ್ಥಳಗಳು ಮಾತ್ರ ಲಭ್ಯ.':'No located market within this distance. Increase the distance. Market locations are currently available for Karnataka APMCs only.'}</p>}
  {!!nearby.length&&<div className="ks-card-grid">{nearby.map(l=>{const k=l.state+'|'+l.district+'|'+l.market;const reps=byMarket.get(k)||[];const top=reps[0];const crops=new Set(reps.map(r=>r.commodity));const road=roads[k];
   return <article className="ks-option" key={k}><h3><MapPin className="inline size-4"/> {l.market}</h3><p className="ks-fine">{l.district}, {l.state} · {kn?'ಸ್ಥಳ':'location'}: {kmLabel(l.match_quality)}</p>
    <p><b>{l.km.toFixed(1)} km</b> <small>{kn?'ನೇರ ರೇಖೆ':'straight line'}</small>{road&&<> · <b>{road.km.toFixed(1)} km</b> <small>{kn?'ರಸ್ತೆ':'road'}, {Math.round(road.min)} min</small></>}</p>
    {top?<><p>{crop?<>{top.commodity} · {top.variety}: <b>₹{Math.round(top.modal_price).toLocaleString('en-IN')}/qtl</b></>:<>{crops.size} {kn?'ಬೆಳೆಗಳು ವರದಿಯಾಗಿವೆ':'crops reported'}</>}</p><p className="ks-fine">{kn?'ವರದಿ':'Reported'} {reportedDate(top.date)} · {ft[freshness(top.date)]} · {top.source_name}</p></>:<p className="ks-fine">{prices.isLoading?c.loading:(kn?'ಈ ಬೆಳೆಗೆ ಇಲ್ಲಿ ವರದಿ ಇಲ್ಲ':'No report for this crop here')}</p>}
    <div className="ks-actions">{onPick&&top&&<Button size="sm" onClick={()=>onPick(l)}>{kn?'ಆರಂಭ ಮಾರುಕಟ್ಟೆಯಾಗಿ ಬಳಸಿ':'Use as my market'}</Button>}
    {!road&&user&&origin&&<Button size="sm" variant="outline" disabled={busy} onClick={async()=>{const pid=(l as MarketLocation&{place_id?:string}).place_id;setBusy(true);try{const {data}=await supabase.from('market_locations').select('place_id').eq('state',l.state).eq('district',l.district).eq('market',l.market).maybeSingle();const id=pid||data?.place_id;if(!id)throw new Error('No verified place for routing.');const r=await call({data:{action:'route',origin:origin.point,placeId:id}});if(r.distanceMeters!==null)setRoads(x=>({...x,[k]:{km:Number(r.distanceMeters)/1000,min:Number(r.durationSeconds)/60}}));}catch(e){setError(e instanceof Error?e.message:c.error);}finally{setBusy(false);}}}><RouteIcon/>{c.road}</Button>}</div>
   </article>;})}</div>}
 </section>;
}
