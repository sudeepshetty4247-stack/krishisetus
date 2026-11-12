import {useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {Button} from '@/components/ui/button';
import {Download,RefreshCw} from 'lucide-react';
import {cedaQuery} from '@/lib/ceda.functions';
import {useKrishi} from './krishisetu-provider';
import {websiteCopy} from '@/lib/website-copy';
import Papa from 'papaparse';

type Row=Record<string,string|number>;
export function CedaPanel(){
 const {user,lang}=useKrishi();const w=websiteCopy(lang);const call=useServerFn(cedaQuery);
 const [commodities,setCommodities]=useState<Row[]>([]);const [geographies,setGeographies]=useState<Row[]>([]);const [markets,setMarkets]=useState<Row[]>([]);const [rows,setRows]=useState<Row[]>([]);
 const [commodity,setCommodity]=useState(0);const [state,setState]=useState(0);const [district,setDistrict]=useState(0);const [market,setMarket]=useState(0);const [start,setStart]=useState('');const [end,setEnd]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 async function discover(){setBusy(true);try{const [c,g]=await Promise.all([call({data:{action:'commodities'}}),call({data:{action:'geographies'}})]);setCommodities(c.records);setGeographies(g.records);setMessage(!c.ok?c.message:!g.ok?g.message:'');}catch(e){setMessage(e instanceof Error?e.message:'CEDA request failed');}finally{setBusy(false);}}
 const states=[...new Map(geographies.map(r=>[Number(r['census_state_id']),String(r['census_state_name'])])).entries()];
 return <section className="import-section"><div className="section-heading"><h2>CEDA · AGMARKNET</h2><Button variant="outline" disabled={!user||busy} onClick={()=>void discover()}><RefreshCw/>{busy?w.loading:w.refresh}</Button></div><div className="filter-row">
 <label className="field">{w.intelligence}<select value={commodity} onChange={e=>{setCommodity(Number(e.target.value));setMarkets([]);setMarket(0);}}><option value={0}>—</option>{commodities.map(r=><option key={r['commodity_id']} value={r['commodity_id']}>{r['commodity_name']}</option>)}</select></label>
 <label className="field">{w.state}<select value={state} onChange={e=>{setState(Number(e.target.value));setDistrict(0);setMarkets([]);setMarket(0);}}><option value={0}>—</option>{states.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
 <label className="field">{w.district}<select value={district} onChange={e=>{setDistrict(Number(e.target.value));setMarkets([]);setMarket(0);}}><option value={0}>—</option>{geographies.filter(r=>Number(r['census_state_id'])===state).map(r=><option key={r['census_district_id']} value={r['census_district_id']}>{r['census_district_name']}</option>)}</select></label>
 <Button disabled={!user||busy||!commodity||!state||!district} variant="outline" onClick={async()=>{setBusy(true);try{const r=await call({data:{action:'markets',commodity_id:commodity,state_id:state,district_id:district,indicator:'price'}});setMarkets(r.records);setMessage(r.message);}catch(e){setMessage(String(e));}finally{setBusy(false);}}}>APMC <RefreshCw/></Button>
 <label className="field">APMC<select value={market} onChange={e=>setMarket(Number(e.target.value))}><option value={0}>—</option>{markets.map(r=><option key={r['market_id']} value={r['market_id']}>{r['market_name']}</option>)}</select></label>
 <label className="field">{w.start}<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label className="field">{w.end}<input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label>
 <Button disabled={!user||busy||!commodity||!state||!district||!market||!start||!end||start>end} onClick={async()=>{setBusy(true);try{const r=await call({data:{action:'prices',commodity_id:commodity,state_id:state,district_id:[district],market_id:[market],from_date:start,to_date:end}});setRows(r.records);setMessage(r.message);}catch(e){setMessage(String(e));}finally{setBusy(false);}}}>{busy?w.loading:w.show}</Button>
 <Button variant="outline" disabled={!rows.length} onClick={()=>{const url=URL.createObjectURL(new Blob([Papa.unparse(rows)],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download='ceda-source-response.csv';a.click();URL.revokeObjectURL(url);}}><Download/>{w.export}</Button></div>
 {message&&<p role="status" className="feedback">{message}</p>}
 {rows.length>0&&<div className="table-scroll"><table className="coverage-table"><thead><tr>{Object.keys(rows[0]||{}).map(k=><th key={k}>{k}</th>)}</tr></thead><tbody>{rows.slice(0,100).map((r,i)=><tr key={i}>{Object.keys(rows[0]||{}).map(k=><td key={k}>{String(r[k]??'—')}</td>)}</tr>)}</tbody></table></div>}
 <p className="fine-print">{lang==='kn'?'ಮೂಲದ ಪ್ರತಿಕ್ರಿಯೆಯಲ್ಲಿ ತಳಿ ಅಥವಾ ಘಟಕ ಇಲ್ಲದಿದ್ದರೆ, ಅವನ್ನು ಊಹಿಸದೆ ಪ್ರತ್ಯೇಕವಾಗಿ ಇಡಲಾಗುತ್ತದೆ.':'Source responses without explicit variety or unit remain separate from comparable reports; these fields are never invented.'}</p></section>;
}