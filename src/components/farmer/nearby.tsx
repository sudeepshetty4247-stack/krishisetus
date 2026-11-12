import {useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {MapPin,Navigation,Search,LogIn} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {discoverMarkets} from '@/lib/geography.functions';
import {nearbyCopy} from '@/lib/nearby-copy';
import {useKrishi} from '../krishisetu-provider';
import {lovable} from '@/integrations/lovable';
import type {Coordinates} from '@/lib/geography';
type Place={id:string;name:string;address:string;latitude:number;longitude:number;straightLineKm:number;url:string};
export function NearbyMarkets(){
 const {lang,user}=useKrishi();const c=nearbyCopy(lang);const call=useServerFn(discoverMarkets);
 const [origin,setOrigin]=useState<Coordinates|null>(null);const [radius,setRadius]=useState<25|50|100|200>(50);const [town,setTown]=useState('');
 const [places,setPlaces]=useState<Place[]>([]);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [searched,setSearched]=useState(false);const [roads,setRoads]=useState<Record<string,number>>({});
 async function search(location:Coordinates){setBusy(true);setError('');setPlaces([]);setRoads({});try{const result=await call({data:{action:'nearby',origin:location,radius}});setPlaces(result.places);setSearched(true);}catch(e){setError(e instanceof Error?e.message:c.error);}finally{setBusy(false);}}
 function locate(){setError('');if(!navigator.geolocation){setError(c.denied);return;}setBusy(true);navigator.geolocation.getCurrentPosition(p=>{const location={latitude:p.coords.latitude,longitude:p.coords.longitude};setOrigin(location);if(user)void search(location);else setBusy(false);},()=>{setBusy(false);setError(c.denied);},{enableHighAccuracy:false,timeout:15000,maximumAge:300000});}
 async function manual(){setBusy(true);setError('');try{const result=await call({data:{action:'town',town}});const p=result.places[0];if(!p){setError(c.empty);return;}const location={latitude:p.latitude,longitude:p.longitude};setOrigin(location);await search(location);}catch(e){setError(e instanceof Error?e.message:c.error);}finally{setBusy(false);}}
 return <section className="ks-section ks-nearby" aria-label={c.find}><h2 className="mb-4">{c.find}</h2><div className="ks-location-grid">
  <Button variant="outline" disabled={busy} onClick={locate}><Navigation/>{c.locate}</Button>
  <label className="ks-manual-location">{c.manual}<input aria-label={c.manual} value={town} onChange={e=>setTown(e.target.value)} maxLength={160}/></label>
  <label className="ks-radius">{c.radius}<select aria-label={c.radius} value={radius} onChange={e=>setRadius(Number(e.target.value) as 25|50|100|200)}>{[25,50,100,200].map(k=><option key={k} value={k}>{k} {c.km}</option>)}</select></label>
  {user?<Button disabled={busy||(!origin&&town.trim().length<2)} onClick={()=>void(town.trim().length>=2?manual():origin?search(origin):undefined)}><Search/>{c.search}</Button>:<Button variant="outline" onClick={async()=>{const result=await lovable.auth.signInWithOAuth('lovable',{redirect_uri:window.location.origin});if(result.error)setError(result.error.message);}}><LogIn/>{c.signIn}</Button>}
 </div>{origin&&<p className="ks-fine">{c.location}</p>}{busy&&<p role="status">{c.loading}</p>}{error&&<p className="ks-notice warn" role="alert">{error}</p>}
 {searched&&!places.length&&!busy&&<p className="ks-notice">{c.empty}</p>}
 {!!places.length&&<><div className="ks-card-grid">{places.map(p=><article className="ks-option" key={p.id}><h3><MapPin className="inline size-4"/> {p.name}</h3><p className="ks-fine">{p.address}</p><p>{p.straightLineKm.toFixed(1)} {c.km}</p>{p.url&&<a className="ks-link" target="_blank" rel="noreferrer" href={p.url}>Google Maps</a>}{roads[p.id]!==undefined?<p>{(Number(roads[p.id])/1000).toFixed(1)} {c.km} · {c.road}</p>:<Button variant="outline" disabled={busy} onClick={async()=>{if(!origin)return;setBusy(true);try{const result=await call({data:{action:'route',origin,placeId:p.id}});if(result.distanceMeters!==null)setRoads(r=>({...r,[p.id]:Number(result.distanceMeters)}));}catch(e){setError(e instanceof Error?e.message:c.error);}finally{setBusy(false);}}}>{c.road}</Button>}</article>)}</div><p className="ks-fine mt-4">{c.limited}</p></>}
 </section>;
}