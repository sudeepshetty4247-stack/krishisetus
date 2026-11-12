import {useMemo,useState} from 'react';
import {Bell,BellRing,Plus,X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useKrishi} from '../krishisetu-provider';
import {useCatalog,useCropReports} from './data';
import {CropPicker} from './crop-picker';
import {useCopy} from './shell';
import {latestByMarket,marketKey} from '@/lib/selling';
import {evaluateAlert,type PriceAlert} from '@/lib/alerts';
import {usePrivateRecords} from './use-private-records';
import {freshness,freshnessText} from '@/lib/price-time';
const money=(n:number)=>'₹'+Math.round(n).toLocaleString('en-IN');
type AT={title:string;sub:string;add:string;above:string;below:string;price:string;market:string;none:string;hit:string;wait:string;latest:string;noReport:string};
const T:Record<string,AT>&{en:AT}={en:{title:'Price alerts',sub:'Get notified on this device when a new official report crosses your price. Checked whenever you open KRISHISETU.',add:'Add alert',above:'At or above',below:'At or below',price:'Price (₹/quintal)',market:'Market',none:'No alerts yet.',hit:'Reached',wait:'Waiting',latest:'Latest report',noReport:'No report yet for this market'},
 kn:{title:'ಬೆಲೆ ಎಚ್ಚರಿಕೆಗಳು',sub:'ಹೊಸ ಅಧಿಕೃತ ವರದಿ ನಿಮ್ಮ ಬೆಲೆಯನ್ನು ತಲುಪಿದಾಗ ಈ ಸಾಧನದಲ್ಲಿ ತಿಳಿಸಲಾಗುತ್ತದೆ. KRISHISETU ತೆರೆದಾಗ ಪರಿಶೀಲಿಸಲಾಗುತ್ತದೆ.',add:'ಎಚ್ಚರಿಕೆ ಸೇರಿಸಿ',above:'ಇದಕ್ಕಿಂತ ಹೆಚ್ಚು',below:'ಇದಕ್ಕಿಂತ ಕಡಿಮೆ',price:'ಬೆಲೆ (₹/ಕ್ವಿಂಟಾಲ್)',market:'ಮಾರುಕಟ್ಟೆ',none:'ಇನ್ನೂ ಎಚ್ಚರಿಕೆಗಳಿಲ್ಲ.',hit:'ತಲುಪಿದೆ',wait:'ಕಾಯುತ್ತಿದೆ',latest:'ಇತ್ತೀಚಿನ ವರದಿ',noReport:'ಈ ಮಾರುಕಟ್ಟೆಗೆ ವರದಿ ಇಲ್ಲ'},
 hi:{title:'भाव अलर्ट',sub:'जब नई आधिकारिक रिपोर्ट आपका भाव पार करे, इस डिवाइस पर सूचना। KRISHISETU खोलने पर जाँच होती है।',add:'अलर्ट जोड़ें',above:'इतना या अधिक',below:'इतना या कम',price:'भाव (₹/क्विंटल)',market:'मंडी',none:'अभी कोई अलर्ट नहीं।',hit:'पहुँचा',wait:'प्रतीक्षा',latest:'नवीनतम रिपोर्ट',noReport:'इस मंडी की रिपोर्ट नहीं'},
 te:{title:'ధర హెచ్చరికలు',sub:'కొత్త అధికారిక ధర మీ లక్ష్యాన్ని చేరినప్పుడు ఇక్కడ తెలుస్తుంది. SMS లేదా ఇమెయిల్ పంపబడదు.',add:'హెచ్చరిక జోడించండి',above:'ఇంత లేదా ఎక్కువ',below:'ఇంత లేదా తక్కువ',price:'ధర (₹/క్వింటాల్)',market:'మార్కెట్',none:'హెచ్చరికలు ఇంకా లేవు.',hit:'చేరుకుంది',wait:'వేచి ఉంది',latest:'తాజా నివేదిక',noReport:'ఈ మార్కెట్‌కు నివేదిక లేదు'},
 ta:{title:'விலை அறிவிப்புகள்',sub:'புதிய அதிகாரப்பூர்வ விலை உங்கள் இலக்கை அடையும்போது இங்கே தெரியும். SMS அல்லது மின்னஞ்சல் அனுப்பப்படாது.',add:'அறிவிப்பைச் சேர்',above:'இது அல்லது அதிகம்',below:'இது அல்லது குறைவு',price:'விலை (₹/குவிண்டால்)',market:'சந்தை',none:'அறிவிப்புகள் இன்னும் இல்லை.',hit:'அடைந்தது',wait:'காத்திருக்கிறது',latest:'சமீபத்திய அறிக்கை',noReport:'இந்தச் சந்தைக்கு அறிக்கை இல்லை'},
 ml:{title:'വില അറിയിപ്പുകൾ',sub:'പുതിയ ഔദ്യോഗിക വില ലക്ഷ്യത്തിലെത്തുമ്പോൾ ഇവിടെ കാണാം. SMS അല്ലെങ്കിൽ ഇമെയിൽ അയയ്ക്കില്ല.',add:'അറിയിപ്പ് ചേർക്കുക',above:'ഇത്രയോ കൂടുതലോ',below:'ഇത്രയോ കുറവോ',price:'വില (₹/ക്വിന്റൽ)',market:'വിപണി',none:'അറിയിപ്പുകൾ ഇനിയും ഇല്ല.',hit:'എത്തി',wait:'കാത്തിരിക്കുന്നു',latest:'പുതിയ റിപ്പോർട്ട്',noReport:'ഈ വിപണിക്ക് റിപ്പോർട്ട് ഇല്ല'},
 mr:{title:'भाव सूचना',sub:'नवीन अधिकृत भाव तुमच्या लक्ष्याला पोहोचल्यावर येथे दिसेल. SMS किंवा ईमेल पाठवला जात नाही.',add:'सूचना जोडा',above:'इतका किंवा अधिक',below:'इतका किंवा कमी',price:'भाव (₹/क्विंटल)',market:'बाजार',none:'अद्याप सूचना नाहीत.',hit:'पोहोचला',wait:'प्रतीक्षेत',latest:'नवीनतम अहवाल',noReport:'या बाजाराचा अहवाल नाही'}};
export function AlertsPanel(){const {lang}=useKrishi();const t=T[lang]||T.en;const records=usePrivateRecords('alert');const alerts=records.rows as PriceAlert[];const [error,setError]=useState(false);const c=useCopy();const cat=useCatalog();

 const [crop,setCrop]=useState('');const [mk,setMk]=useState('');const [dir,setDir]=useState<'above'|'below'>('above');const [price,setPrice]=useState('');
 const reports=useCropReports(crop);const latest=useMemo(()=>latestByMarket(reports.data||[]),[reports.data]);
 const add=async()=>{const r=latest.find(x=>marketKey(x)+'|'+x.variety===mk);const n=Number(price);if(!r||!Number.isFinite(n)||!(n>0))return;try{await records.save({id:crypto.randomUUID(),crop,variety:r.variety,marketKey:marketKey(r),market:r.market,source:r.source_name,grade:r.grade||'',direction:dir,threshold:n,createdAt:new Date().toISOString()});setPrice('');setError(false);}catch{setError(true);}};
 return <section className="ks-section"><div className="ks-section-head"><div><h2><Bell/> {t.title}</h2><p className="ks-fine">{t.sub}</p></div></div>
  <div className="ks-alert-form"><div><CropPicker crops={cat.data?.commodities||[]} value={crop} onChange={x=>{setCrop(x);setMk('');}} placeholder={c.searchCrop} allowCustom={false}/></div>
   <label>{t.market}<select value={mk} onChange={e=>setMk(e.target.value)} disabled={!latest.length}><option value="">—</option>{latest.map(r=><option key={marketKey(r)+r.variety} value={marketKey(r)+'|'+r.variety}>{r.market} · {r.variety} ({money(r.modal_price)}, {r.date})</option>)}</select></label>
   <label>{dir==='above'?t.above:t.below}<select value={dir} onChange={e=>setDir(e.target.value as 'above'|'below')}><option value="above">{t.above}</option><option value="below">{t.below}</option></select></label>
   <label>{t.price}<input type="number" min="1" inputMode="numeric" value={price} onChange={e=>setPrice(e.target.value)}/></label>
   <Button onClick={add} disabled={!mk||!(Number(price)>0)}><Plus/>{t.add}</Button></div>
  {(error||records.error)&&<p role="alert">{c.error}</p>}<div className="ks-alert-list" style={{marginTop:'1rem'}}>{!alerts.length?<p className="ks-fine">{t.none}</p>:alerts.map(a=><AlertRow key={a.id} a={a} t={t} lang={lang} onRemove={()=>{void records.erase(a.id).catch(()=>setError(true));}}/>)}</div>
 </section>;}
function AlertRow({a,t,lang,onRemove}:{a:PriceAlert;t:AT;lang:string;onRemove:()=>void}){const c=useCopy();const q=useCropReports(a.crop);const latest=(q.data||[]).filter(r=>marketKey(r)===a.marketKey&&r.variety===a.variety&&(a.source===undefined||r.source_name===a.source)&&(a.grade===undefined||(r.grade||'')===a.grade)).sort((x,y)=>y.date.localeCompare(x.date))[0];const s=evaluateAlert(a,latest);
 return <div className={`ks-alert ${s.triggered?'hit':''}`}>{s.triggered?<BellRing/>:<Bell/>}<b>{a.crop} · {a.market}</b><span>{a.direction==='above'?'≥':'≤'} {money(a.threshold)}</span>
  <span>{s.report?<>{t.latest}: <b>{money(s.report.modal_price)}</b> · {s.report.date} ({(freshnessText[lang]||freshnessText['en'])?.[freshness(s.report.date)]})</>:t.noReport}</span>
  <span className="ks-tag">{s.triggered||a.evaluation?.triggered?t.hit:t.wait}</span><Button variant="ghost" size="icon" aria-label={c.remove} onClick={onRemove}><X/></Button></div>;}
