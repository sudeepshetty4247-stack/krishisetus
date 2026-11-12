import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {Link,useNavigate} from '@tanstack/react-router';
import {ArrowRight,CalendarDays,CheckCircle2,Download,IndianRupee,Info,Leaf,MapPin,Save,Scale,Share2,ShieldCheck,TrendingDown,TrendingUp,Minus,Trophy,Truck,Wheat,X,AlertTriangle,Database,Clock} from 'lucide-react';
import {ResponsiveContainer,LineChart,Line,XAxis,YAxis,Tooltip,CartesianGrid,Legend} from 'recharts';
import {useServerFn} from '@tanstack/react-start';
import {Button} from '@/components/ui/button';
import heroImage from '@/assets/maize-field.jpg';
import {useKrishi} from '../krishisetu-provider';
import {useCopy} from './shell';
import {useCatalog,useCoverageAll,useLatest,useCropReports,useMarketReports} from './data';
import {latestByMarket,marketKey,rankOptions,priceStats,winDays,zeroCosts,comparisonKey,comparableReport,type Costs,type Option} from '@/lib/selling';
import type {Report} from '@/lib/agri-types';
import {pythonAction} from '@/lib/agri.functions';
import {NearbyMarkets} from './nearby';
import {PriceTimestamps} from './price-timestamps';
import {CropPicker} from './crop-picker';
import {useFilteredReports} from './data';
import {SellingPlans} from './selling-plan';
import {saveSellingPlan} from '@/lib/plans';
import {ageInIST,istTimestamp} from '@/lib/price-time';
type C=ReturnType<typeof useCopy>;
export const rupee=(n:number)=>`₹${Math.round(n).toLocaleString('en-IN')}`;
const lineColors=['var(--primary)','var(--harvest)','var(--leaf)','var(--chart-4)','var(--chart-5)'];
function Fresh({date,c}:{date:string;c:C}){const d=ageInIST(date);return <span className={`ks-fresh ${d>7?'old':''}`}><CalendarDays/>{c.reportedOn} {date} · {d===0?c.today:`${d} ${c.daysOld}`}</span>;}
function Notice({children,tone='info'}:{children:ReactNode;tone?:'info'|'warn'|'error'}){return <div className={`ks-notice ${tone}`}>{tone==='info'?<Info/>:<AlertTriangle/>}<div>{children}</div></div>;}
function Section({title,eyebrow,children,action}:{title:string;eyebrow?:string;children:ReactNode;action?:ReactNode}){return <section className="ks-section"><div className="ks-section-head"><div>{eyebrow&&<div className="ks-eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>{action}</div>{children}</section>;}
function PriceCard({r,c,onClick,extra}:{r:Report;c:C;onClick?:()=>void;extra?:ReactNode}){return <Button type="button" variant="ghost" className="ks-price-card" onClick={onClick} disabled={!onClick}><div className="ks-price-top"><span className="ks-crop-chip"><Wheat/>{r.commodity}{r.variety&&r.variety!=='Other'?` · ${r.variety}`:''}</span>{!r.official&&<span className="ks-tag">private</span>}</div><div className="ks-price-market"><MapPin/>{r.market}<small>{r.district}, {r.state}</small></div><div className="ks-price-value">{rupee(r.modal_price)}<small>{c.perQuintal}</small></div>{(r.min_price!=null||r.max_price!=null)&&<div className="ks-minmax">{c.min} {r.min_price!=null?rupee(r.min_price):'—'} · {c.max} {r.max_price!=null?rupee(r.max_price):'—'}</div>}{extra}<PriceTimestamps report={r}/><div className="ks-source">{c.source}: {r.source_name}</div></Button>;}
function HistoryChart({rows,keyOf,c}:{rows:Report[];keyOf:(r:Report)=>string;c:C}){const series=[...new Set(rows.map(keyOf))].slice(0,5);const byDate=new Map<string,Record<string,number|string>>();for(const r of rows){const k=keyOf(r);if(!series.includes(k))continue;const o=byDate.get(r.date)||{date:r.date};o[k]=r.modal_price;byDate.set(r.date,o);}const data=[...byDate.values()].sort((a,b)=>String(a['date']).localeCompare(String(b['date'])));if(data.length<2)return <Notice>{c.noHistory}</Notice>;return <div className="ks-chart"><ResponsiveContainer width="100%" height={320}><LineChart data={data} margin={{top:10,right:16,left:8,bottom:0}}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fontSize:13}} minTickGap={28}/><YAxis tick={{fontSize:13}} tickFormatter={v=>`₹${v}`} width={70} domain={['auto','auto']}/><Tooltip formatter={(v:number)=>rupee(v)}/><Legend/>{series.map((s,i)=><Line key={s} type="monotone" dataKey={s} name={s} stroke={lineColors[i]} strokeWidth={2.5} dot={false} connectNulls/>)}</LineChart></ResponsiveContainer></div>;}
function Loading({c}:{c:C}){return <div className="ks-loading">{c.loadingText}</div>;}

/* ---------------- HOME ---------------- */
// Live Indian time; rendered after hydration so server and browser markup match.
function IstClock(){const [now,setNow]=useState<Date|null>(null);useEffect(()=>{setNow(new Date());const t=setInterval(()=>setNow(new Date()),1000);return ()=>clearInterval(t);},[]);if(!now)return null;return <span className="ks-clock"><Clock/>{new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',weekday:'short',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(now)} IST</span>;}
export function FarmerHome(){const c=useCopy();const nav=useNavigate();const cat=useCatalog();const latest=useLatest(200);const cov=useCoverageAll();
 const [crop,setCrop]=useState('');const [qty,setQty]=useState('20');
 const crops=cat.data?.commodities||[];const homeReports=useCropReports(crop);const rows=crop?(homeReports.data||[]):latest.data||[];const cards=latestByMarket(rows).slice(0,6);
 return <>
  <section className="ks-hero"><img src={heroImage} alt="" className="ks-hero-img"/><div className="ks-wrap ks-hero-grid">
   <div className="ks-hero-text"><div className="ks-eyebrow light">KRISHISETU · India · <IstClock/></div><h1>KRISHISETU</h1><p>{c.homeIntro}</p></div>
   <form className="ks-quick" onSubmit={e=>{e.preventDefault();void nav({to:'/find-market',search:{crop:crop||undefined,qty:Number(qty)||undefined,market:undefined}});}}>
    <h2><Scale/>{c.find}</h2>
    <div className="ks-quick-field">{c.qCrop}<CropPicker crops={crops} value={crop} onChange={setCrop} placeholder={c.searchCrop}/></div>
    <label>{c.qQty}<div className="ks-qty"><input type="number" min="0.1" step="0.1" inputMode="decimal" value={qty} onChange={e=>setQty(e.target.value)}/><span>{c.quintals}</span></div><small>{c.quintalHint}</small></label>
    <Button type="submit" variant="harvest" size="lg" className="ks-big-btn" disabled={!crop||!(Number(qty)>0)}>{c.findBtn}<ArrowRight/></Button>
    {!crops.length&&!cat.isLoading&&<small className="ks-quick-note">{c.noCrops}</small>}
   </form></div></section>
  <div className="ks-wrap">
   <Section title={crop?`${crop} · ${c.latestTitle}`:c.latestTitle} eyebrow={c.reportedOnly} action={<Link to="/markets" className="ks-link">{c.prices}<ArrowRight/></Link>}>
    {(crop?homeReports.isLoading:latest.isLoading)?<Loading c={c}/>:(crop?homeReports.error:latest.error)?<Notice tone="error">{c.error}</Notice>:cards.length?<div className="ks-card-grid">{cards.map(r=><PriceCard key={r.id} r={r} c={c} onClick={()=>void nav({to:'/markets',search:{crop:r.commodity,market:r.market}})}/>)}</div>:<Notice tone="warn">{c.latestNone}</Notice>}
   </Section>
   <Section title={c.howTitle}><div className="ks-steps">{[c.how1,c.how2,c.how3].map((s,i)=><div key={s} className="ks-step"><span>{i+1}</span><p>{s}</p></div>)}</div></Section>
   <details className="ks-disclosure"><summary>{c.trustTitle}</summary><div className="ks-trust">
    <div><ShieldCheck/><h3>{c.source}</h3><p>{[...new Set(rows.map(r=>r.source_name))].join(', ')||'CEDA / AGMARKNET · data.gov.in'}</p></div>
    <div><CalendarDays/><h3>{c.lastUpdate}</h3><p>{cov.data?.last_update?istTimestamp(cov.data.last_update):c.noUpdate}</p></div>
    <div><Database/><h3>{c.coverage}</h3><p>{cov.data?.records?`${cov.data.records.toLocaleString('en-IN')} ${c.records} · ${cov.data.earliest} → ${cov.data.latest}`:c.latestNone.split('.')[0]+'.'}</p></div>
    <div><IndianRupee/><h3>{c.calcTitle}</h3><p>{c.calcText}</p></div>
    <div><TrendingUp/><h3>{c.fcTitle}</h3><p>{c.fcText}</p></div>
   </div></details>
  </div></>;}

/* ---------------- FIND BEST MARKET ---------------- */
type Saved={id:string;savedAt:string;crop:string;variety:string;qty:number;start:string;rows:{market:string;date:string;price:number;gross:number;expenses:number;net:number}[]};
export const loadPlans=():Saved[]=>{try{return JSON.parse(localStorage.getItem('krishisetu-plans')||'[]');}catch{return [];}};
function reportText(s:Saved,c:C){return [`KRISHISETU — ${s.crop} (${s.variety}), ${s.qty} ${c.quintals}`,`${c.yourMarket}: ${s.start}`,'',...s.rows.map(r=>`${r.market} | ${r.date} | ${rupee(r.price)}${c.perQuintal} | ${c.gross} ${rupee(r.gross)} | ${c.expenses} ${rupee(r.expenses)} | ${c.net} ${rupee(r.net)}`),'',c.noGuarantee].join('\n');}
function downloadText(s:Saved,c:C){const blob=new Blob([reportText(s,c)],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`krishisetu-${s.crop}-${s.savedAt.slice(0,10)}.txt`;a.click();URL.revokeObjectURL(a.href);}
export function FindMarketPage({initial}:{initial:{crop?:string|undefined;qty?:number|undefined;market?:string|undefined}}){const c=useCopy();const cat=useCatalog();
 const [crop,setCrop]=useState(initial.crop||'');const [qty,setQty]=useState(String(initial.qty||20));const [variety,setVariety]=useState('');const [state,setState]=useState('');const [start,setStart]=useState('');const [costs,setCosts]=useState<Record<string,Costs>>({});const [msg,setMsg]=useState('');const [selectedReport,setSelectedReport]=useState<Report|null>(null);
 const reports=useCropReports(crop);const rows=selectedReport?.commodity===crop?[selectedReport,...(reports.data||[]).filter(r=>r.id!==selectedReport.id)]:reports.data||[];
 const varieties=[...new Set(rows.map(r=>r.variety))];const v=variety&&varieties.includes(variety)?variety:varieties[0]||'';
 const sources=[...new Set(rows.filter(r=>r.variety===v).map(r=>r.source_name))];
 const source=selectedReport?.commodity===crop&&selectedReport.variety===v?selectedReport.source_name:sources[0];
 const allLatest=useMemo(()=>latestByMarket(rows.filter(r=>r.variety===v&&r.source_name===source)),[rows,v,source]);
 // Default comparison stays within the starting market's state; farmers can widen it with the state selector.
 const effState=state||(start?start.split('|')[0]:'')||'';const latest=useMemo(()=>allLatest.filter(r=>!effState||r.state===effState),[allLatest,effState]);
 const states=[...new Set(rows.map(r=>r.state))].sort();
 const initialReport=initial.market?latest.find(r=>r.market===initial.market):undefined;
 const startKey=start||(initialReport?marketKey(initialReport):'');
 const q=Number(qty);const {options,start:startOpt,excluded}=rankOptions(latest,startKey,q,costs);
 const bestNet=options[0];const bestPrice=[...options].sort((a,b)=>b.report.modal_price-a.report.modal_price)[0];
 const setCost=(k:string,f:keyof Costs,val:string)=>setCosts(o=>({...o,[k]:{...(o[k]||zeroCosts),[f]:Math.max(0,Number(val)||0)}}));
 const toSaved=():Saved=>({id:crypto.randomUUID(),savedAt:new Date().toISOString(),crop,variety:v,qty:q,start:startOpt?.report.market||'',rows:options.map(o=>({market:o.report.market,date:o.report.date,price:o.report.modal_price,gross:o.gross,expenses:o.expenses,net:o.net}))});
 const crops=cat.data?.commodities||[];
 return <div className="ks-wrap ks-flow">
  <div className="ks-page-head"><h1>{c.find}</h1><p>{c.sellingIntro}</p></div>
  <div className="ks-sell-inputs"><Step n={1} title={c.sCrop} c={c}>{cat.isLoading?<Loading c={c}/>:crops.length?<CropPicker crops={crops} value={crop} onChange={x=>{setCrop(x);setStart('');setVariety('');}} placeholder={c.searchCrop}/>:<Notice tone="warn">{c.noCrops}</Notice>}</Step>
  <Step n={2} title={c.sQty} c={c}><label className="ks-qty big"><input aria-label={c.qQty} type="number" min="0.1" step="0.1" inputMode="decimal" value={qty} onChange={e=>setQty(e.target.value)}/><span>{c.quintals}</span></label><small className="ks-hint">{c.quintalHint}</small>{!(q>0)&&<Notice tone="error">{c.qQty}</Notice>}</Step></div>
  {crop&&!cat.isLoading&&crops.length>0&&!crops.includes(crop)&&<CustomCropPlan crop={crop} qty={Number(qty)} c={c}/>}
  {crop&&crops.includes(crop)&&<Step n={3} title={c.sLoc} c={c}>{reports.isLoading?<Loading c={c}/>:reports.error?<Notice tone="error">{c.error}</Notice>:!latest.length&&!rows.length?<Notice tone="warn">{c.noMarkets}</Notice>:<div className="ks-form-row">
   {varieties.length>1&&<label>{c.variety}<select value={v} onChange={e=>{setVariety(e.target.value);setStart('');}}>{varieties.map(x=><option key={x}>{x}</option>)}</select></label>}
   <label>{c.chooseState}<select value={state} onChange={e=>{setState(e.target.value);setStart('');}}><option value="">{c.any}</option>{states.map(x=><option key={x}>{x}</option>)}</select></label>
   <label>{c.chooseMarket}<select value={startKey} onChange={e=>setStart(e.target.value)}><option value="">{c.chooseMarket}</option>{allLatest.filter(r=>!state||r.state===state).map(r=><option key={marketKey(r)} value={marketKey(r)}>{r.market} ({r.district})</option>)}</select></label>
  </div>}{!startKey&&latest.length>0&&<Notice>{c.startPrompt}</Notice>}{startKey&&!startOpt&&<Notice tone="warn">{c.noCompatible}</Notice>}<details className="ks-disclosure ks-nearby-toggle"><summary><MapPin/>{c.nearbyOptional}</summary><NearbyMarkets crop={crop||undefined} variety={v||undefined} onPick={(l,r)=>{setSelectedReport(r);setState(l.state);setVariety(r.variety);setStart(marketKey(l));}}/></details></Step>}
  {crop&&startOpt&&q>0&&bestNet&&bestPrice&&<>
   <Step n={4} title={`${c.sMarkets} (${options.length})`} c={c}>
    <div className="ks-result"><div><small>{c.yourResult} · {bestNet.report.date}</small><h3>{bestNet.report.market} — {rupee(bestNet.net)}</h3><p>{c.netSimple} · {c.noGuarantee}</p></div></div>
    {excluded>0&&<Notice tone="warn">{excluded} · {c.dateWarn}</Notice>}
    {ageInIST(bestNet.report.date)>7&&<Notice tone="warn">{c.reportedOn}: {bestNet.report.date} · {c.noGuarantee}</Notice>}
    <div className="ks-highlights"><Highlight icon={<Trophy/>} label={c.bestNet} o={bestNet} c={c} value={rupee(bestNet.net)}/><Highlight icon={<IndianRupee/>} label={c.bestPrice} o={bestPrice} c={c} value={`${rupee(bestPrice.report.modal_price)}${c.perQuintal}`}/></div>
    <div className="ks-option-grid">{options.map((o,i)=><OptionCard key={o.key} o={o} rank={i+1} c={c} costs={costs[o.key]||zeroCosts} setCost={(f,val)=>setCost(o.key,f,val)}/>)}</div>
    <small className="ks-hint">{c.costHint}</small>
   </Step>
   <details className="ks-disclosure"><summary>{c.resultDetails}</summary><Step n={5} title={c.sResult} c={c}><div className="ks-result"><CheckCircle2/><div><p className="ks-lead">{ageInIST(bestNet.report.date)>7?`${c.reportedOn}: ${bestNet.report.date} · ${c.noGuarantee}`:c.resultText}</p><h3>{bestNet.report.market} — {rupee(bestNet.net)}</h3>
    <p className="ks-why"><b>{c.why}</b> {bestNet.isStart?`${c.yourMarket}: ${rupee(bestNet.report.modal_price)}${c.perQuintal} × ${q} = ${rupee(bestNet.gross)} − ${rupee(bestNet.expenses)}.`:`${rupee(bestNet.report.modal_price)} vs ${rupee(startOpt.report.modal_price)}${c.perQuintal} (${c.yourMarket}) × ${q} ${c.quintals} = +${rupee(bestNet.gross-startOpt.gross)} ${c.gross}; ${c.expenses} ${rupee(bestNet.expenses)} vs ${rupee(startOpt.expenses)} → +${rupee(bestNet.advantage)} ${c.net}.`}</p>
    {!bestNet.sameDate&&<Notice tone="warn">{c.dateWarn}</Notice>}<p className="ks-fine">{c.noGuarantee}</p></div></div>
    <div className="ks-table-wrap"><table className="ks-table"><thead><tr><th>#</th><th>APMC</th><th>{c.reportedOn}</th><th>{c.price}</th><th>{c.gross}</th><th>{c.expenses}</th><th>{c.net}</th></tr></thead><tbody>{options.map((o,i)=><tr key={o.key} className={o.isStart?'start':''}><td>{i+1}</td><td>{o.report.market}{o.isStart&&<small> · {c.yourMarket}</small>}</td><td>{o.report.date}{!o.sameDate&&' ⚠'}</td><td>{rupee(o.report.modal_price)}</td><td>{rupee(o.gross)}</td><td>{rupee(o.expenses)}</td><td><b>{rupee(o.net)}</b></td></tr>)}</tbody></table></div>
   </Step></details><div className="ks-actions"><Button variant="default" size="lg" onClick={()=>{const s=toSaved();saveSellingPlan({id:s.id,savedAt:s.savedAt,crop,variety:v,quantity:q,unit:'quintal',location:startOpt.report.market,sellingDate:'',marketKey:bestNet.key,costs,reports:latest});localStorage.setItem('krishisetu-plans',JSON.stringify([s,...loadPlans()].slice(0,50)));setMsg(c.saved);}}><Save/>{c.save}</Button><Button variant="outline" size="lg" onClick={()=>downloadText(toSaved(),c)}><Download/>{c.download}</Button><Button variant="outline" size="lg" onClick={async()=>{const text=reportText(toSaved(),c);if(navigator.share){try{await navigator.share({title:'KRISHISETU',text});}catch{/* cancelled */}}else{await navigator.clipboard.writeText(text);setMsg(c.copied);}}}><Share2/>{c.share}</Button>{msg&&<span className="ks-ok"><CheckCircle2/>{msg}</span>}</div>
   </>}
  {crop&&startOpt&&rows.length>0&&<details className="ks-disclosure"><summary>{c.showHistory}</summary><HistoryChart rows={rows.filter(r=>r.variety===v&&r.source_name===source)} keyOf={r=>`${r.market} · ${r.grade||'—'}`} c={c}/></details>}
 </div>;}
// Farmer-entered crop without official reports: save a draft plan with no price, never an invented one.
function CustomCropPlan({crop,qty,c}:{crop:string;qty:number;c:C}){const [loc,setLoc]=useState('');const [done,setDone]=useState(false);
 return <Notice tone="warn"><p><b>{crop}</b> — {c.noMarkets}</p><p className="ks-fine">{c.noGuarantee}</p><div className="ks-form-row"><label>{c.qLoc}<input value={loc} maxLength={200} onChange={e=>setLoc(e.target.value)}/></label><Button disabled={!loc.trim()||!(qty>0)} onClick={()=>{saveSellingPlan({id:crypto.randomUUID(),savedAt:new Date().toISOString(),crop,variety:'',quantity:qty,unit:'quintal',location:loc.trim(),sellingDate:'',marketKey:'',costs:{},reports:[]});setDone(true);}}><Save/>{c.save}</Button>{done&&<Link to="/selling-assistant" className="ks-ok"><CheckCircle2/>{c.saved}</Link>}</div></Notice>;}
function Step({n,title,children,c}:{n:number;title:string;children:ReactNode;c:C}){return <section className="ks-flow-step"><div className="ks-flow-n"><small>{c.step}</small>{n}</div><div className="ks-flow-body"><h2>{title}</h2>{children}</div></section>;}
function Highlight({icon,label,o,c,value}:{icon:ReactNode;label:string;o:Option;c:C;value:string}){return <div className="ks-highlight">{icon}<div><small>{label}</small><b>{o.report.market}</b><span>{value}</span><Fresh date={o.report.date} c={c}/></div></div>;}
function OptionCard({o,rank,c,costs,setCost}:{o:Option;rank:number;c:C;costs:Costs;setCost:(f:keyof Costs,v:string)=>void}){return <article className={`ks-option ${rank===1?'best':''} ${o.isStart?'start':''}`}><header><span className="ks-rank">{rank}</span><div><h3>{o.report.market}</h3><small>{o.report.district}, {o.report.state}{o.isStart&&` · ${c.yourMarket}`}</small></div></header>
 <div className="ks-option-price">{rupee(o.report.modal_price)}<small>{c.perQuintal}</small></div><Fresh date={o.report.date} c={c}/>{!o.sameDate&&<p className="ks-warn-line"><AlertTriangle/>{c.dateWarn}</p>}
 <details className="ks-disclosure ks-price-disclosure"><summary>{c.priceDetails}</summary><PriceTimestamps report={o.report}/></details>
 <dl><dt>{c.gross}</dt><dd>{rupee(o.gross)}</dd><dt>{c.expenses}</dt><dd>− {rupee(o.expenses)}</dd><dt className="net">{c.net}</dt><dd className="net">{rupee(o.net)}</dd></dl>
 <div className="ks-costs">{(['transport','loading','unloading','other'] as const).map(f=><label key={f}>{f==='transport'?<Truck/>:null}{c[f]}<input type="number" min="0" inputMode="numeric" placeholder="₹ 0" value={costs[f]||''} onChange={e=>setCost(f,e.target.value)}/></label>)}</div>
 {!o.isStart&&<p className="ks-be">{o.breakEven!=null&&o.breakEven>0?<><b>{c.breakEven}: {rupee(o.breakEven)}</b><br/><small>{c.breakEvenText}</small></>:<small>{c.noBreakEven}</small>}</p>}
 <small className="ks-source">{c.source}: {o.report.source_name}</small></article>;}

/* ---------------- MARKET PRICES ---------------- */
export function PricesPage({initialCrop='',initialMarket=''}:{initialCrop?:string;initialMarket?:string}={}){const c=useCopy();const [search,setSearch]=useState(initialCrop);const [state,setState]=useState('');const [district,setDistrict]=useState('');const [open,setOpen]=useState(initialMarket);const all=useLatest(1500);
 const latestQ=useFilteredReports({search:search.trim().length>=2?search.trim():undefined,state:state||undefined,district:district||undefined},1500);const rows=all.data||[];const filtered=latestQ.data||[];
 const groups=new Map<string,Report[]>();for(const r of filtered){const k=marketKey(r)+'|'+r.commodity+'|'+r.variety;groups.set(k,[...(groups.get(k)||[]),r]);}
 const cards=[...groups.values()].map(g=>g.sort((a,b)=>b.date.localeCompare(a.date))).slice(0,60);
 return <div className="ks-wrap"><div className="ks-page-head"><h1>{c.prices}</h1><p>{c.freshNote}</p></div>
  <div className="ks-searchbar"><input type="search" placeholder={c.searchCrop} value={search} onChange={e=>setSearch(e.target.value)} aria-label={c.searchCrop}/><select value={state} onChange={e=>{setState(e.target.value);setDistrict('');}} aria-label={c.chooseState}><option value="">{c.chooseState}</option>{[...new Set(rows.map(r=>r.state))].sort().map(x=><option key={x}>{x}</option>)}</select><select value={district} onChange={e=>setDistrict(e.target.value)} aria-label={c.chooseDistrict} disabled={!state}><option value="">{c.chooseDistrict}</option>{[...new Set(rows.filter(r=>r.state===state).map(r=>r.district))].sort().map(x=><option key={x}>{x}</option>)}</select></div>
  {latestQ.isLoading?<Loading c={c}/>:latestQ.error?<Notice tone="error">{c.error}</Notice>:!cards.length?<Notice tone="warn">{c.latestNone}</Notice>:<div className="ks-card-grid">{cards.map(g=>{const r=g[0];if(!r)return null;const p=g.find(previous=>previous.date<r.date&&previous.source_name===r.source_name);const ch=p?r.modal_price-p.modal_price:null;return <PriceCard key={r.id} r={r} c={c} onClick={()=>setOpen(r.market)} extra={ch!=null&&<div className={`ks-change ${ch>0?'up':ch<0?'down':''}`}>{ch>0?<TrendingUp/>:ch<0?<TrendingDown/>:<Minus/>}{ch>0?'+':''}{rupee(ch)} <small>{c.change} ({p?.date})</small></div>}/>;})}</div>}
  {open&&<MarketDetail market={open} c={c} onClose={()=>setOpen('')}/>}
 </div>;}
function MarketDetail({market,c,onClose}:{market:string;c:C;onClose:()=>void}){const q=useMarketReports(market);const rows=q.data||[];const crops=[...new Set(rows.map(r=>`${r.commodity} · ${r.variety}`))];const [crop,setCrop]=useState('');const sel=crop||crops[0]||'';const sub=rows.filter(r=>`${r.commodity} · ${r.variety}`===sel);
 return <div className="ks-overlay" role="dialog" aria-modal="true" aria-label={c.details} onClick={onClose}><div className="ks-sheet" onClick={e=>e.stopPropagation()}><header><div><div className="ks-eyebrow">{c.details}</div><h2><MapPin/>{market}</h2></div><Button variant="ghost" size="icon" onClick={onClose} aria-label={c.close}><X/></Button></header>
  {q.isLoading?<Loading c={c}/>:<><h3>{c.cropsHere}</h3><div className="ks-chips">{crops.map(x=><button key={x} className={x===sel?'on':''} onClick={()=>setCrop(x)}>{x}</button>)}</div><h3>{c.history}</h3><HistoryChart rows={sub} keyOf={()=>sel} c={c}/>
  <div className="ks-table-wrap"><table className="ks-table"><thead><tr><th>{c.reportedOn}</th><th>{c.min}</th><th>{c.max}</th><th>{c.modal}</th><th>{c.arrivals}</th><th>{c.source}</th></tr></thead><tbody>{sub.slice(0,60).map(r=><tr key={r.id}><td>{r.date}</td><td>{r.min_price!=null?rupee(r.min_price):'—'}</td><td>{r.max_price!=null?rupee(r.max_price):'—'}</td><td><b>{rupee(r.modal_price)}</b></td><td>{r.arrivals!=null?`${r.arrivals} ${r.arrival_unit||''}`:'—'}</td><td>{r.source_url?<a href={r.source_url} target="_blank" rel="noreferrer">{r.source_name}</a>:r.source_name}</td></tr>)}</tbody></table></div></>}
 </div></div>;}

/* ---------------- COMPARE ---------------- */
export function ComparePage(){const c=useCopy();const cat=useCatalog();const [crop,setCrop]=useState('');const [variety,setVariety]=useState('');const [picked,setPicked]=useState<string[]>([]);const q=useCropReports(crop);const rows=q.data||[];
 const varieties=[...new Set(rows.map(r=>r.variety))];const v=variety||varieties[0]||'';const ref=rows.find(r=>r.variety===v&&comparableReport(r));const sub=rows.filter(r=>r.variety===v&&comparableReport(r)&&r.source_name===ref?.source_name&&(r.grade||'')===(ref?.grade||''));const latest=latestByMarket(sub);const chosen=sub.filter(r=>picked.includes(marketKey(r)));const {wins,shared}=winDays(sub,picked);
 const lat=latestByMarket(chosen);const dates=new Set(lat.map(r=>comparisonKey(r)));
 return <div className="ks-wrap"><div className="ks-page-head"><h1>{c.compare}</h1><p>{c.compareHint}</p></div>
  <div className="ks-searchbar"><CropPicker crops={cat.data?.commodities||[]} value={crop} onChange={x=>{setCrop(x);setPicked([]);setVariety('');}} placeholder={c.searchCrop}/>{varieties.length>1&&<select value={v} onChange={e=>{setVariety(e.target.value);setPicked([]);}} aria-label={c.variety}>{varieties.map(x=><option key={x}>{x}</option>)}</select>}</div>
  {!crop?<Notice>{c.chooseFirst}</Notice>:q.isLoading?<Loading c={c}/>:!latest.length?<Notice tone="warn">{c.noMarkets}</Notice>:<>
   <div className="ks-chips big">{latest.map(r=>{const k=marketKey(r);const on=picked.includes(k);return <button key={k} className={on?'on':''} disabled={!on&&picked.length>=5} onClick={()=>setPicked(p=>on?p.filter(x=>x!==k):[...p,k])}>{on&&<CheckCircle2/>}{r.market}<small>{r.district}</small></button>;})}</div>
   {picked.length>=2?<>{dates.size>1&&<Notice tone="warn">{c.dateWarn}</Notice>}
    <div className="ks-table-wrap"><table className="ks-table"><thead><tr><th>APMC</th><th>{c.latestPrice}</th><th>{c.reportedOn}</th><th>{c.average}</th><th>{c.volatility}</th><th>{c.arrivals}</th><th>{c.wins}</th></tr></thead><tbody>{picked.map(k=>{const g=chosen.filter(r=>marketKey(r)===k);const st=priceStats(g.map(r=>r.modal_price));const l=lat.find(r=>marketKey(r)===k);const arr=g.filter(r=>r.arrivals!=null);return <tr key={k}><td><b>{l?.market}</b></td><td>{l?rupee(l.modal_price):'—'}</td><td>{l?.date}</td><td>{st?rupee(st.mean):'—'}</td><td>{st?.cv!=null?`${(st.cv*100).toFixed(1)}%`:'—'}</td><td>{arr.length?`${Math.round(arr.reduce((a,r)=>a+(r.arrivals||0),0)/arr.length)} ${arr[0]?.arrival_unit||''}`:'—'}</td><td>{shared?`${wins[k]} / ${shared}`:'—'}</td></tr>;})}</tbody></table></div>
    <p className="ks-fine">{shared} {c.sharedDays}. {c.volatility}: SD / mean.</p>
    <HistoryChart rows={chosen} keyOf={r=>r.market} c={c}/></>:<Notice>{c.compareHint}</Notice>}
  </>}</div>;}

/* ---------------- TRENDS ---------------- */
export function TrendsPage(){const c=useCopy();const {user}=useKrishi();const cat=useCatalog();const [crop,setCrop]=useState('');const [market,setMarket]=useState('');const [h,setH]=useState(7);const q=useCropReports(crop);const rows=q.data||[];const markets=[...new Set(rows.map(r=>r.market))];const m=market||markets[0]||'';const sub=rows.filter(r=>r.market===m);const v=sub[0]?.variety;const series=sub.filter(r=>r.variety===v).sort((a,b)=>a.date.localeCompare(b.date));
 const run=useServerFn(pythonAction);const [fc,setFc]=useState<{state:'idle'|'busy'|'none'|'service'|'ok';data?:Record<string,unknown>}>({state:'idle'});
 const recent=series.slice(-10).map(r=>r.modal_price),older=series.slice(-20,-10).map(r=>r.modal_price);const ra=priceStats(recent)?.mean,oa=priceStats(older)?.mean;const dir=ra&&oa?(ra-oa)/oa>0.02?'up':(ra-oa)/oa<-0.02?'down':'stable':null;
 async function forecast(){if(!sub[0])return;setFc({state:'busy'});try{const res=await run({data:{action:'forecast',payload:{horizon:h,filters:{state:sub[0].state,district:sub[0].district,market:m,commodity:crop,variety:v||'',source:sub[0].source_name}}}});if(!res.available)setFc({state:'service'});else if(!res.result||(res.result as Record<string,unknown>)['error'])setFc({state:'none'});else setFc({state:'ok',data:res.result as Record<string,unknown>});}catch{setFc({state:'none'});}}
 return <div className="ks-wrap"><div className="ks-page-head"><h1>{c.trends}</h1><p>{c.forecastHelp}</p></div>
  <div className="ks-searchbar"><CropPicker crops={cat.data?.commodities||[]} value={crop} onChange={x=>{setCrop(x);setMarket('');setFc({state:'idle'});}} placeholder={c.searchCrop}/><select value={m} onChange={e=>{setMarket(e.target.value);setFc({state:'idle'});}} disabled={!markets.length} aria-label={c.chooseMarket}>{markets.map(x=><option key={x}>{x}</option>)}</select><div className="ks-seg" role="group" aria-label={c.period}>{[7,14,30].map(d=><Button variant="ghost" size="sm" key={d} className={h===d?'on':''} onClick={()=>{setH(d);setFc({state:'idle'});}}>{d} {c.days}</Button>)}</div></div>
  {!crop?<Notice>{c.chooseFirst}</Notice>:q.isLoading?<Loading c={c}/>:!series.length?<Notice tone="warn">{c.noMarkets}</Notice>:<>
   {dir&&<div className={`ks-trend ${dir}`}>{dir==='up'?<TrendingUp/>:dir==='down'?<TrendingDown/>:<Minus/>}<div><b>{c[dir]}</b><small>{c.actual}: {rupee(oa??0)} → {rupee(ra??0)} ({series.at(-1)?.date})</small></div></div>}
   <Section title={`${c.history} — ${m}`}><HistoryChart rows={series} keyOf={()=>c.actual} c={c}/></Section>
   
   <Button variant="outline" disabled={!user||fc.state==='busy'} onClick={forecast}><TrendingUp/>{fc.state==='busy'?c.loadingText:c.forecastCheck} · {h} {c.days}</Button>
   {!user&&<Notice>{c.fcSignIn}</Notice>}{(fc.state==='service'||fc.state==='none')&&<Notice tone="warn">{c.forecastHelp}</Notice>}
   {fc.state==='ok'&&typeof fc.data?.['forecast']==='number'&&<Notice>{c.estimate}: {rupee(fc.data['forecast'])} · {c.reportedOn}: {String(fc.data['latest_observation']||'—')} · {c.noGuarantee}</Notice>}
  </>}</div>;}

/* ---------------- PLAN ---------------- */
export function PlanPage(){return <SellingPlans/>;}

/* ---------------- HOW / ABOUT ---------------- */
export function HowPage(){const c=useCopy();return <div className="ks-wrap"><div className="ks-page-head"><h1>{c.how}</h1><p>{c.promise}</p></div><div className="ks-steps">{[c.how1,c.how2,c.how3].map((s,i)=><div key={s} className="ks-step"><span>{i+1}</span><p>{s}</p></div>)}</div><div className="ks-trust"><div><IndianRupee/><h3>{c.calcTitle}</h3><p>{c.calcText}</p></div><div><Truck/><h3>{c.breakEven}</h3><p>{c.breakEvenText} {c.distanceNote}</p></div><div><TrendingUp/><h3>{c.fcTitle}</h3><p>{c.fcText}</p></div><div><CalendarDays/><h3>{c.reportedOn}</h3><p>{c.freshNote}</p></div></div></div>;}
export function AboutPage(){const c=useCopy();return <div className="ks-wrap"><div className="ks-page-head"><h1>{c.about}</h1></div><div className="ks-about"><p className="ks-lead">{c.aboutText}</p><p>{c.noGuarantee}</p><Button asChild size="lg" variant="harvest"><Link to="/find-market" search={{}}>{c.find}<ArrowRight/></Link></Button></div></div>;}
