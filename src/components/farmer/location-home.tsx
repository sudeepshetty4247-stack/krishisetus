import {useEffect,useMemo,useRef,useState} from 'react';
import {Link,useNavigate} from '@tanstack/react-router';
import {useServerFn} from '@tanstack/react-start';
import {useQuery} from '@tanstack/react-query';
import {Navigation,MapPin,Scale,IndianRupee,TrendingUp,ClipboardList,ArrowRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import hero from '@/assets/maize-field.jpg';
import {searchPublicLocations,identifyPublicLocation} from '@/lib/public-location.functions';
import {distanceKm,verifiedYard,type Coordinates} from '@/lib/geography';
import {supabase} from '@/integrations/supabase/client';
import {latestByMarket,marketKey,comparableReport,comparisonKey} from '@/lib/selling';
import type {Report} from '@/lib/agri-types';
import {useKrishi} from '../krishisetu-provider';
import {useCopy} from './shell';
import {nearbyCopy} from '@/lib/nearby-copy';
import {useCatalog,useMarketLocations,useCoverageAll} from './data';
import {CropPicker} from './crop-picker';
import {PriceTimestamps} from './price-timestamps';
import {ageInIST} from '@/lib/price-time';
type Place={id:string;name:string;state:string;district:string;latitude:number;longitude:number};
const money=(n:number|null)=>n==null?'—':`₹${Math.round(n).toLocaleString('en-IN')}`;
export function LocationHome(){
 const {lang}=useKrishi();const c=useCopy(),lc=nearbyCopy(lang);const nav=useNavigate();const catalogue=useCatalog(),locations=useMarketLocations(),coverage=useCoverageAll();const search=useServerFn(searchPublicLocations),identify=useServerFn(identifyPublicLocation);
 const [text,setText]=useState(''),[places,setPlaces]=useState<Place[]>([]),[origin,setOrigin]=useState<(Coordinates&{label:string;state:string;district:string;gps:boolean})|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[crop,setCrop]=useState(''),[variety,setVariety]=useState(''),[qty,setQty]=useState('20'),[radius,setRadius]=useState(50),[picked,setPicked]=useState<string[]>([]);
 const generation=useRef(0);
 useEffect(()=>{const seq=++generation.current;setPlaces([]);setBusy(false);if(text.trim().length<3||origin?.label===text)return;const timer=setTimeout(async()=>{setBusy(true);try{const r=await search({data:{query:text,language:lang}});if(seq!==generation.current)return;setPlaces(r.places);setError(r.available?'':lc.error);}catch{if(seq===generation.current)setError(lc.error);}finally{if(seq===generation.current)setBusy(false);}},450);return()=>clearTimeout(timer);},[text,lang,origin?.label,search,lc.error]);
 const near=useMemo(()=>origin?(locations.data||[]).filter(l=>distanceKm(origin,l)<=radius):[],[origin,locations.data,radius]);
 const prices=useQuery({enabled:!!origin&&!!crop,queryKey:['home-location-prices',origin,crop,near.map(m=>marketKey(m)).join('|')],queryFn:async()=>{
  if(!origin)return [] as Report[];
  let q=supabase.from('agri_reports').select('*').eq('official',true).eq('suspicious',false).eq('commodity',crop).order('date',{ascending:false}).limit(1000);
  // Coordinates and district fallback are separate: a district report is never labelled a nearby yard.
  if(near.length)q=q.in('market',near.map(m=>m.market));else if(origin.district)q=q.eq('district',origin.district);else return [] as Report[];
  if(origin.state)q=q.eq('state',origin.state);
  const {data,error}=await q;if(error)throw error;const reports=(data||[]) as unknown as Report[];return near.length?reports.filter(r=>near.some(l=>marketKey(l)===marketKey(r))):reports;
 }});
 const varieties=[...new Set((prices.data||[]).map(r=>r.variety))];const rows=latestByMarket((prices.data||[]).filter(r=>!variety||r.variety===variety)).slice(0,12);
 const selected=rows.filter(r=>picked.includes(r.id));const first=selected[0];const canCompare=selected.length>=2&&!!first&&selected.every(r=>comparableReport(r)&&comparisonKey(r)===comparisonKey(first));
 function choose(p:Place){setOrigin({...p,label:p.name,gps:false});setText(p.name);setPlaces([]);setPicked([]);setVariety('');setError('');}
 function locate(){setError('');if(!navigator.geolocation){setError(lc.denied);return;}setBusy(true);navigator.geolocation.getCurrentPosition(async p=>{
  const point={latitude:p.coords.latitude,longitude:p.coords.longitude};setText('');setPicked([]);setOrigin({...point,label:lc.location,state:'',district:'',gps:true});
  try{const place=await identify({data:point});if(place.available)setOrigin({...point,label:[place.name,place.district].filter(Boolean).join(' · '),state:place.state,district:place.district,gps:true});}catch{/* retain actual GPS point without guessing an address */}finally{setBusy(false);}
 },()=>{setBusy(false);setError(lc.denied);},{timeout:15000,maximumAge:300000,enableHighAccuracy:true});}
 return <>
  <section className="ks-hero ks-location-hero"><img src={hero} className="ks-hero-img" alt=""/><div className="ks-wrap ks-location-intro"><h1>KRISHISETU</h1><p>{c.homeIntro}</p>
   <div className="ks-home-location"><Button variant="harvest" size="lg" disabled={busy} onClick={locate}><Navigation/>{lc.locate}</Button><label className="ks-home-search">{lc.manual}<input type="search" role="combobox" aria-label={lc.manual} aria-expanded={places.length>0} value={text} autoComplete="off" placeholder={lang==='en'?'Enter your village, town or district':lc.manual} onChange={e=>{setText(e.target.value);setOrigin(null);setPicked([]);}}/>
    {!!places.length&&<div className="ks-home-suggestions" role="listbox">{places.map(p=><Button key={p.id} role="option" aria-selected={false} variant="ghost" onClick={()=>choose(p)}><MapPin/><span><b>{p.name}</b><small>{p.district}, {p.state}</small></span></Button>)}</div>}
   </label></div>
   {busy&&<p role="status">{lc.loading}</p>}{error&&<p role="alert" className="ks-notice warn">{error}</p>}
  </div></section>
  <div className="ks-wrap">
   <section className="ks-section"><div className="ks-section-head"><h2><MapPin className="inline"/> {origin?.label||lc.find}</h2>{origin&&<label>{lc.radius}<select aria-label={lc.radius} value={radius} onChange={e=>setRadius(Number(e.target.value))}>{[25,50,100,200].map(x=><option key={x} value={x}>{x} {lc.km}</option>)}</select></label>}</div>{rows.some(r=>ageInIST(r.date)>7)&&<p className="ks-fine">{c.reportedOnly} · {c.dateWarn}</p>}
    <div className="ks-home-crop-row"><label>{c.qCrop}<CropPicker crops={catalogue.data?.commodities||[]} value={crop} onChange={x=>{setCrop(x);setVariety('');setPicked([]);}} placeholder={c.searchCrop}/></label><label>{c.variety}<select aria-label={c.variety} disabled={!varieties.length} value={variety} onChange={e=>{setVariety(e.target.value);setPicked([]);}}><option value="">{c.variety}</option>{varieties.map(v=><option key={v}>{v}</option>)}</select></label><label>{c.qQty}<div className="ks-qty"><input aria-label={c.qQty} type="number" min="0.1" step="0.1" value={qty} onChange={e=>setQty(e.target.value)}/><span>{c.quintals}</span></div></label></div>
    {!origin?<p className="ks-fine">{lc.manual} · {lc.locate}</p>:!crop?<p className="ks-notice">{c.chooseFirst}</p>:prices.isLoading?<p role="status">{lc.loading}</p>:prices.error?<p role="alert">{c.error}</p>:!rows.length?<p className="ks-notice">{c.noMarkets}</p>:<>
     <div className="ks-card-grid">{rows.map(r=>{const loc=near.find(l=>marketKey(l)===marketKey(r));const km=loc&&origin&&verifiedYard(loc)?distanceKm(origin,loc):null;const checked=picked.includes(r.id);return <article className="ks-option ks-home-market" key={r.id}><h3>{r.market}</h3><small>{r.district}, {r.state}</small>{km!==null&&<p>{km.toFixed(1)} {lc.km} · {origin.gps?'GPS':'Town centre'} · {lang==='kn'?'ನೇರ ರೇಖೆ':'straight line'}</p>}{!loc&&<small>{lang==='kn'?'ಜಿಲ್ಲೆಯ ವರದಿ; ಹತ್ತಿರದ ದೂರ ಪರಿಶೀಲಿಸಿಲ್ಲ':'District report · nearby distance not verified'}</small>}<p>{r.commodity} · {r.variety}</p><b className="ks-option-price">{money(r.modal_price)}<small>{c.perQuintal}</small></b><p className="ks-minmax">{c.min} {money(r.min_price)} · {c.max} {money(r.max_price)}</p><p className="ks-fine">{c.reportedOn} {r.date}</p><details className="ks-home-source"><summary>{c.source}</summary><PriceTimestamps report={r}/><small>{r.source_name}</small></details><label className="ks-home-pick"><input type="checkbox" checked={checked} disabled={!checked&&(!comparableReport(r)||picked.length>=5||(first&&comparisonKey(first)!==comparisonKey(r)))} onChange={()=>setPicked(p=>checked?p.filter(id=>id!==r.id):[...p,r.id])}/>{c.compare}</label><Button variant="outline" onClick={()=>void nav({to:'/find-market',search:{crop:r.commodity,qty:Number(qty)||20,market:marketKey(r),reportId:r.id}})}><IndianRupee/>{c.find}</Button></article>;})}</div>
     {canCompare&&<div className="ks-table-wrap"><table className="ks-table"><thead><tr><th>{c.yourMarket}</th><th>{c.modal}</th><th>{c.reportedOn}</th><th>{c.gross}</th></tr></thead><tbody>{selected.map(r=><tr key={r.id}><td>{r.market}</td><td>{money(r.modal_price)}</td><td>{r.date}</td><td>{Number(qty)>0?money(r.modal_price*Number(qty)):'—'}</td></tr>)}</tbody></table></div>}
    </>}
   </section>
   <section className="ks-section"><div className="ks-home-actions"><Button asChild variant="outline"><Link to="/comparison"><Scale/>{c.compare}</Link></Button><Button asChild variant="outline"><Link to="/find-market" search={{crop:crop||undefined,qty:Number(qty)||20,market:undefined}}><IndianRupee/>{c.find}<ArrowRight/></Link></Button><Button asChild variant="outline"><Link to="/forecast"><TrendingUp/>{c.trends}</Link></Button><Button asChild variant="outline"><Link to="/selling-assistant"><ClipboardList/>{c.plan}</Link></Button></div><p className="ks-fine">{c.reportedOn}: {coverage.data?.latest||c.noUpdate} · {c.freshNote}</p><small className="ks-fine">Locations: Open-Meteo / GeoNames · © OpenStreetMap contributors</small></section>
  </div>
 </>;
}