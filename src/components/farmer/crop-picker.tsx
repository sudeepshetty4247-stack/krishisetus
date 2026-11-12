import {useId,useMemo,useState} from 'react';
import {Search,Wheat,X} from 'lucide-react';
import {searchCommodities} from '@/lib/commodity-search';
// Searchable crop selector: partial names, regional names and typos. Never disabled while the catalogue loads.
export function CropPicker({crops,value,onChange,placeholder,label,popular=['Maize','Bengal Gram(Gram)(Whole)','Onion','Tomato','Paddy(Common)','Cotton']}:{crops:string[];value:string;onChange:(v:string)=>void;placeholder:string;label?:string;popular?:string[]}){
 const [q,setQ]=useState('');const [open,setOpen]=useState(false);const id=useId();
 const matches=useMemo(()=>q?searchCommodities(crops,q,10):popular.filter(p=>crops.includes(p)),[crops,q,popular]);
 if(value)return <div className="ks-crop-picked"><Wheat/><b>{value}</b><button type="button" aria-label="Change crop" onClick={()=>{onChange('');setQ('');setOpen(true);}}><X/></button></div>;
 return <div className="ks-crop-picker">{label&&<span className="ks-crop-picker-label">{label}</span>}
  <div className="ks-crop-input"><Search/><input role="combobox" aria-expanded={open} aria-controls={id} aria-label={placeholder} placeholder={placeholder} value={q} onChange={e=>{setQ(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onKeyDown={e=>{if(e.key==='Enter'&&matches[0]){e.preventDefault();onChange(matches[0]);}}}/></div>
  {open&&<ul id={id} role="listbox" className="ks-crop-options">{matches.length?matches.map(m=><li key={m}><button type="button" role="option" aria-selected={false} onClick={()=>{onChange(m);setOpen(false);}}><Wheat/>{m}</button></li>):<li className="ks-crop-empty">{crops.length?'—':'…'}</li>}</ul>}
 </div>;
}
