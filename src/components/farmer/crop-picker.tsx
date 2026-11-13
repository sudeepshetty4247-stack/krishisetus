import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Search,Wheat,X,PenLine,History,Star,CheckCircle2,Link2,Sprout} from 'lucide-react';
import {searchCommodities} from '@/lib/commodity-search';
import {byCategory,categories,pickerCopy,pushRecent,readRecent,recognise,type Category} from '@/lib/crop-catalogue';
import {useKrishi} from '../krishisetu-provider';
const POPULAR=['Maize','Bengal Gram(Gram)(Whole)','Onion','Tomato','Paddy(Common)','Cotton','Potato','Groundnut','Wheat','Soyabean'];
// Crop discovery: search (regional names, typos), recent, popular, category browsing and manual entry.
// A custom crop is accepted for plans but is never given a market price.
export function CropPicker({crops,value,onChange,placeholder,label,allowCustom=true}:{crops:string[];value:string;onChange:(v:string)=>void;placeholder:string;label?:string;allowCustom?:boolean}){
 const {lang}=useKrishi();const p=pickerCopy(lang);const id=useId();
 const [q,setQ]=useState('');const [open,setOpen]=useState(false);const [cat,setCat]=useState<Category|''>('');const [manual,setManual]=useState(false);const [recent,setRecent]=useState<string[]>([]);
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!open)return;const close=(e:PointerEvent)=>{if(root.current&&!root.current.contains(e.target as Node))setOpen(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[open]);
 useEffect(()=>setRecent(readRecent()),[]);
 const grouped=useMemo(()=>byCategory(crops),[crops]);
 const matches=useMemo(()=>q?searchCommodities(crops,q,10):[],[crops,q]);
 const rec=useMemo(()=>manual&&q?recognise(crops,q):null,[manual,q,crops]);
 const pick=(v:string)=>{onChange(v);pushRecent(v);setRecent(readRecent());setOpen(false);setQ('');setManual(false);setCat('');};
 if(value){const known=crops.includes(value);return <div className={`ks-crop-picked ${known?'':'custom'}`}><Wheat/><div><b>{value}</b><small className={`ks-crop-status ${known?'ok':'custom'}`}>{known?<><CheckCircle2/>{p.official} · {p.hasData}</>:<><Sprout/>{p.custom}</>}</small></div><button type="button" aria-label={p.change} onClick={()=>{onChange('');setOpen(true);}}><X/></button></div>;}
 const chip=(m:string,icon?:React.ReactNode)=><button key={m} type="button" className="ks-crop-chipbtn" onClick={()=>pick(m)}>{icon}{m}</button>;
 return <div ref={root} className="ks-crop-picker">{label&&<span className="ks-crop-picker-label">{label}</span>}
  <div className="ks-crop-input">{manual?<PenLine/>:<Search/>}<input role="combobox" aria-expanded={open} aria-controls={id} aria-label={manual?p.manualHint:placeholder} placeholder={manual?p.manualHint:placeholder} value={q} onChange={e=>{setQ(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);if(e.key==='Enter'){e.preventDefault();if(manual&&q.trim())pick(rec?.match&&rec.status==='official'?rec.match:q.trim());else if(matches[0])pick(matches[0]);}}}/>{(q||manual)&&<button type="button" aria-label="Clear" onClick={()=>{setQ('');setManual(false);}}><X/></button>}</div>
  {open&&<div id={id} role="listbox" className="ks-crop-panel">
   {manual?<div className="ks-crop-manual">
     {rec&&rec.suggestions.length>0&&<><small>{p.didYouMean}</small><div className="ks-crop-chips">{rec.suggestions.map(s=>chip(s,rec.status==='alias'&&s===rec.match?<Link2/>:<CheckCircle2/>))}</div></>}
     {q.trim()&&(rec?.status!=='official')&&<button type="button" className="ks-crop-custom" onClick={()=>pick(q.trim().slice(0,80))}><Sprout/>{p.useCustom.replace('{x}',q.trim().slice(0,80))}<small>{p.custom}</small></button>}
    </div>
   :q?<ul className="ks-crop-list">{matches.length?matches.map(m=><li key={m}><button type="button" role="option" aria-selected={false} onClick={()=>pick(m)}><Wheat/>{m}<small>{p.cats[byCat(m,grouped)]}</small></button></li>):<li className="ks-crop-empty">{crops.length?p.noData:'…'}</li>}</ul>
   :<div className="ks-crop-browse">
     {recent.length>0&&<><small><History/>{p.recent}</small><div className="ks-crop-chips">{recent.map(m=>chip(m))}</div></>}
     <small><Star/>{p.popular}</small><div className="ks-crop-chips">{POPULAR.filter(x=>crops.includes(x)).map(m=>chip(m))}</div>
     <small>{p.browse}</small><div className="ks-crop-cats">{categories.filter(k=>grouped[k].length).map(k=><button key={k} type="button" className={cat===k?'on':''} onClick={()=>setCat(cat===k?'':k)}>{p.cats[k]} <span>{grouped[k].length}</span></button>)}</div>
     {cat&&<div className="ks-crop-chips scroll">{grouped[cat].map(m=>chip(m))}</div>}
    </div>}
   {allowCustom&&!manual&&<button type="button" className="ks-crop-manual-btn" onClick={()=>{setManual(true);setOpen(true);}}><PenLine/>{p.manual}</button>}
  </div>}
 </div>;
}
function byCat(m:string,g:Record<Category,string[]>):Category{return (categories.find(k=>g[k].includes(m))||'other');}
