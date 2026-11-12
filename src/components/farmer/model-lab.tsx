import {useMemo,useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {ResponsiveContainer,ComposedChart,LineChart,Line,XAxis,YAxis,Tooltip,CartesianGrid,Legend,BarChart,Bar,Area,ReferenceLine} from 'recharts';
import {FlaskConical,RefreshCw,AlertTriangle,CheckCircle2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useKrishi} from '../krishisetu-provider';
import {useModelRuns,useSourceRuns,useMarketLocations,marketBase,type ModelRun,type HorizonReport,type Metric} from './data';
import {refreshDailyPrices} from '@/lib/mandi-sync.functions';
import {istTimestamp,reportedDate} from '@/lib/price-time';
import {pythonHistory} from '@/lib/agri.functions';
import {distanceKm,verifiedYard} from '@/lib/geography';
import {backtestStrategies,marketAnalytics} from '@/lib/research-analytics';
const r0=(n:number|null|undefined)=>n==null||!Number.isFinite(n)?'—':`₹${Math.round(n).toLocaleString('en-IN')}`;
const f2=(n:number|null|undefined,d=2)=>n==null||!Number.isFinite(n)?'—':n.toFixed(d);
const MODELS=['Naive','Seasonal naive','ARIMA','SARIMA','Random Forest','XGBoost'];
export function modelStatus(h:HorizonReport|undefined,name:string){if(!h||h.status!=='trained')return h?.status==='insufficient_data'?'Insufficient data':'Not trained';if(h.failures?.[name]||h.failures?.[name+' test'])return 'Validation failed';return h.test?.[name]?'Trained':'Not trained';}
function MetricRow({name,h}:{name:string;h:HorizonReport}){const v:Metric|undefined=h.validation[name],t:Metric|undefined=h.test[name],r:Metric|undefined=h.recent_26_weeks?.[name];const sel=h.selected===name;
 return <tr className={sel?'start':''}><td><b>{name}</b>{sel&&<small> · selected</small>}</td><td>{modelStatus(h,name)}</td><td>{r0(v?.MAE)}</td><td>{r0(v?.RMSE)}</td><td>{f2(v?.sMAPE,1)}%</td><td>{f2(v?.R2)}</td><td>{r0(t?.MAE)}</td><td>{r0(t?.RMSE)}</td><td>{f2(t?.sMAPE,1)}%</td><td>{f2(t?.R2)}</td><td>{r0(r?.MAE)}</td></tr>;}
export function RunDetail({run}:{run:ModelRun}){const rep=run.report;const keys=Object.keys(rep.horizons||{});const [hk,setHk]=useState(keys.find(k=>rep.horizons[k]?.status==='trained')||keys[0]||'1');const h=rep.horizons[hk];
 if(rep.error)return <div className="ks-notice warn"><AlertTriangle/><div>{rep.error}</div></div>;
 const chart=(h?.predictions||[]).map(p=>({week:p.week,actual:p.actual,predicted:p.predicted,residual:Math.round(p.actual-p.predicted)}));
 return <div className="ks-lab-detail">
  <div className="ks-lab-facts">
   <div><small>Training dataset</small><b>{rep.raw_rows.toLocaleString('en-IN')} reports · {rep.daily_reports} report days · {rep.observed_weeks} weeks</b></div>
   <div><small>Training period</small><b>{rep.train_period[0]} → {rep.train_period[1]}</b></div>
   <div><small>Validation period</small><b>{rep.validation_period[0]} → {rep.validation_period[1]}</b></div>
   <div><small>Test period (walk-forward)</small><b>{rep.test_period[0]} → {rep.test_period[1]}</b></div>
   <div><small>Latest dataset observation</small><b>{reportedDate(rep.period[1])}</b></div>
   <div><small>Trained</small><b>{istTimestamp(rep.trained_at)} · {rep.training_seconds}s · data v{rep.dataset_version}</b></div>
  </div>
  <p className="ks-fine">{rep.frequency}. Source: {rep.source}. Grades: daily median of reported grades. Features: {rep.features.join(', ')}.</p>
  <div className="ks-seg" role="group" aria-label="Forecast horizon">{keys.map(k=><button key={k} className={k===hk?'on':''} onClick={()=>setHk(k)}>{Number(k)*7} days ({k} wk)</button>)}</div>
  {!h||h.status!=='trained'?<div className="ks-notice warn"><AlertTriangle/><div>{h?.reason||'Not trained'}</div></div>:<>
   <div className="ks-table-wrap"><table className="ks-table"><thead><tr><th>Model</th><th>Status</th><th>Val MAE</th><th>Val RMSE</th><th>Val sMAPE</th><th>Val R²</th><th>Test MAE</th><th>Test RMSE</th><th>Test sMAPE</th><th>Test R²</th><th>Recent 26 wk MAE</th></tr></thead><tbody>{MODELS.map(m=><MetricRow key={m} name={m} h={h}/>)}</tbody></table></div>
   <div className="ks-lab-why"><CheckCircle2/><div><b>Selected: {h.selected}.</b> {h.selection_reason} Samples train/validation/test: {h.samples.train}/{h.samples.validation}/{h.samples.test}. {h.baseline_beaten?'Beats the naive baseline on the final test.':'Does not beat the naive baseline on the final test — treat as baseline-level skill.'} {h.deterioration_ratio!=null&&<>Recent-period MAE is {f2(h.deterioration_ratio)}× the full-test MAE{h.deterioration_ratio>1.25?' — performance deteriorated recently.':'.'}</>}</div></div>
   <h3>Actual vs predicted (final walk-forward test)</h3>
   <div className="ks-chart"><ResponsiveContainer width="100%" height={300}><LineChart data={chart}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3"/><XAxis dataKey="week" minTickGap={30} tick={{fontSize:12}}/><YAxis tickFormatter={v=>`₹${v}`} width={70} domain={['auto','auto']} tick={{fontSize:12}}/><Tooltip formatter={(v:number)=>r0(v)}/><Legend/><Line dataKey="actual" name="Actual weekly price" stroke="var(--primary)" strokeWidth={2.5} dot={false}/><Line dataKey="predicted" name={`${h.selected} prediction`} stroke="var(--harvest)" strokeWidth={2} strokeDasharray="6 4" dot={false}/></LineChart></ResponsiveContainer></div>
   <h3>Residuals (actual − predicted)</h3>
   <p className="ks-fine">Mean {r0(h.residuals?.mean)} · SD {r0(h.residuals?.std)} · lag-1 autocorrelation {f2(h.residuals?.lag1_autocorrelation)}</p>
   <div className="ks-chart"><ResponsiveContainer width="100%" height={180}><BarChart data={chart}><XAxis dataKey="week" hide/><YAxis width={60} tick={{fontSize:12}}/><ReferenceLine y={0} stroke="var(--border)"/><Tooltip/><Bar dataKey="residual" fill="var(--leaf)"/></BarChart></ResponsiveContainer></div>
   {h.feature_importance?<div className="ks-lab-two"><div><h3>Feature importance</h3><Bars rows={h.feature_importance.slice(0,10).map(f=>({k:f.feature,v:f.importance}))}/></div><div><h3>Mean |SHAP| on test weeks (₹)</h3><Bars rows={(h.shap_mean_abs||[]).slice(0,10).map(f=>({k:f.feature,v:f.value}))}/><p className="ks-fine">SHAP explains the model's output, not causation.</p></div></div>:<p className="ks-fine">The selected model is {h.selected}; tree feature importance and SHAP apply only when Random Forest or XGBoost is selected.{h.parameters&&` Fitted parameters: ${Object.entries(h.parameters).map(([k,v])=>`${k}=${v.toFixed(3)}`).join(', ')}.`}</p>}
   <ForecastBox h={h}/>
  </>}
 </div>;}
function Bars({rows}:{rows:{k:string;v:number}[]}){return <div className="ks-chart"><ResponsiveContainer width="100%" height={Math.max(160,rows.length*26)}><BarChart data={rows} layout="vertical" margin={{left:20}}><XAxis type="number" tick={{fontSize:12}}/><YAxis type="category" dataKey="k" width={110} tick={{fontSize:12}}/><Tooltip/><Bar dataKey="v" fill="var(--primary)"/></BarChart></ResponsiveContainer></div>;}
export function ForecastBox({h}:{h:HorizonReport}){const f=h.forecast;const {lang}=useKrishi();const kn=lang==='kn';
 return <div className="ks-forecast-box"><h3>{kn?'ಮಾದರಿ ಅಂದಾಜು':'Model estimate'} · {h.horizon_days} {kn?'ದಿನ':'days'}</h3>
  <p><b>{r0(f.price)}</b>/qtl {kn?'ವಾರದ ಸರಾಸರಿ':'weekly average'} · {kn?'ವ್ಯಾಪ್ತಿ':'range'} {r0(f.lower)} – {r0(f.upper)} · {h.selected}</p>
  <p className="ks-fine">{kn?'ಮೂಲ ವಾರ':'Origin week'} {f.origin_week} → {kn?'ಗುರಿ ವಾರ':'target week'} {f.target_week} · {kn?'ಕೊನೆಯ ನಿಜ ಬೆಲೆ':'latest actual'} {r0(f.latest_actual)} ({reportedDate(f.latest_report_date)}) · {h.interval.method}</p>
  <div className="ks-notice warn"><AlertTriangle/><div>{kn?'ಇದು ಐತಿಹಾಸಿಕ ಮೂಲದ ಅಂದಾಜು; ಇಂದಿನ ಮುನ್ಸೂಚನೆ ಅಲ್ಲ. ಈ ಮಾರುಕಟ್ಟೆಯ ನಿರಂತರ ಇತ್ತೀಚಿನ ವಾರದ ವರದಿಗಳು ಮತ್ತು ಪೈಥಾನ್ ಸೇವೆ ಬೇಕು.':`Historical-origin estimate, not a current forecast. A current forecast needs continuous weekly reports for this market since ${reportedDate(f.latest_report_date)} and a running Python service.`}</div></div></div>;}
function SourcePanel(){const runs=useSourceRuns();const {user,refresh}=useKrishi();const call=useServerFn(refreshDailyPrices);const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);
 return <section className="ks-section"><div className="ks-section-head"><div><div className="ks-eyebrow">Data engine</div><h2>Source retrieval log</h2></div>{user&&<Button disabled={busy} onClick={async()=>{setBusy(true);try{const r=await call();setMsg(r.message);await runs.refetch();await refresh();}catch(e){setMsg(e instanceof Error?e.message:'Refresh failed');}finally{setBusy(false);}}}><RefreshCw/>Refresh daily prices now</Button>}</div>
  {msg&&<p role="status" className="ks-notice">{msg}</p>}
  <p className="ks-fine">Daily AGMARKNET reports (data.gov.in resource 9ef84268…) are retrieved every 3 hours. Historical variety-wise reports (2021 → 20 Apr 2026) come from the GODL compilation of data.gov.in. CEDA price requests currently time out; AGMARKNET 2.0 returns 403; direct data.gov.in needs an API key.</p>
  <div className="ks-table-wrap"><table className="ks-table"><thead><tr><th>Started (IST)</th><th>Source</th><th>Status</th><th>Market report date</th><th>Received</th><th>Stored</th><th>Rejected</th><th>Errors</th></tr></thead><tbody>{(runs.data||[]).map(r=><tr key={r.id}><td>{istTimestamp(r.started_at)}</td><td>{r.source}</td><td>{r.status}</td><td>{r.report_date?reportedDate(r.report_date):'—'}</td><td>{r.received}</td><td>{r.stored}</td><td>{r.rejected}</td><td>{Array.isArray(r.errors)&&r.errors.length?String(r.errors[0]).slice(0,80):'—'}</td></tr>)}</tbody></table></div>
 </section>;}
function Analytics({runs}:{runs:ModelRun[]}){const crops=[...new Set(runs.map(r=>r.commodity))];const [crop,setCrop]=useState(crops[0]||'');const locs=useMarketLocations();const group=runs.filter(r=>r.commodity===crop&&r.report.history);
 const a=useMemo(()=>marketAnalytics(group.map(r=>({market:r.market,history:r.report.history}))),[group]);
 const [start,setStart]=useState('');const [perKm,setPerKm]=useState('0');const s=start||group[0]?.market||'';
 const coords=(m:ModelRun)=>{const l=(locs.data||[]).find(x=>x.state===m.state&&x.district===m.district&&marketBase(x.market)===m.market&&verifiedYard(x));return l?{latitude:l.latitude,longitude:l.longitude}:null;};
 const startRun=group.find(g=>g.market===s);const sc=startRun?coords(startRun):null;
 const dist=Object.fromEntries(group.map(g=>{const c=coords(g);return [g.market,sc&&c?distanceKm(sc,c):null];}));
 const bt=useMemo(()=>backtestStrategies(group.map(r=>({market:r.market,history:r.report.history})),s,dist,Number(perKm)||0),[group,s,JSON.stringify(dist),perKm]);
 if(!crops.length)return null;
 return <section className="ks-section"><div className="ks-section-head"><div><div className="ks-eyebrow">Research analytics</div><h2>Market spread, consistency, seasonality and strategy backtest</h2></div><select value={crop} onChange={e=>setCrop(e.target.value)} aria-label="Crop">{crops.map(c=><option key={c}>{c}</option>)}</select></div>
  {group.length<2?<p className="ks-notice">At least two trained market histories are needed for cross-market analysis.</p>:<>
  <div className="ks-table-wrap"><table className="ks-table"><thead><tr><th>Market</th><th>Weeks</th><th>Mean price</th><th>Volatility (CV)</th><th>Consistency index</th><th>Best season month</th><th>Seasonal advantage</th></tr></thead><tbody>{a.markets.map(m=><tr key={m.market}><td><b>{m.market}</b></td><td>{m.weeks}</td><td>{r0(m.mean)}</td><td>{f2(m.cv*100,1)}%</td><td>{f2(m.consistency*100,0)}%</td><td>{m.bestMonth}</td><td>{f2(m.seasonalAdvantage*100,1)}%</td></tr>)}</tbody></table></div>
  <p className="ks-fine">Consistency index = share of shared weeks a market's price was at or above the cross-market median. Seasonal advantage = best calendar month's mean vs the market's overall mean. Average weekly spread between highest and lowest market: {r0(a.meanSpread)} over {a.sharedWeeks} shared weeks.</p>
  <h3>Historical selling-strategy backtest (no look-ahead)</h3>
  <div className="ks-form-row"><label>Starting market<select value={s} onChange={e=>setStart(e.target.value)}>{group.map(g=><option key={g.market}>{g.market}</option>)}</select></label><label>Cost assumption ₹ per quintal per km (your own estimate)<input type="number" min="0" step="0.1" value={perKm} onChange={e=>setPerKm(e.target.value)}/></label></div>
  {bt?<div className="ks-table-wrap"><table className="ks-table"><thead><tr><th>Strategy</th><th>Weeks</th><th>Average realised net ₹/qtl</th><th>vs staying at start</th></tr></thead><tbody>{bt.map(b=><tr key={b.strategy}><td><b>{b.strategy}</b></td><td>{b.weeks}</td><td>{r0(b.meanNet)}</td><td>{r0(b.vsStart)}</td></tr>)}</tbody></table></div>:<p className="ks-notice">Distances unavailable for these markets.</p>}
  <p className="ks-fine">Each week the strategy picks a market using only the previous week's reported prices and realises that market's current-week price minus distance × cost. Distances are straight-line between geocoded markets. Cost assumption is yours; loading, commission and waiting costs are excluded. Past results do not guarantee future returns.</p></>}
 </section>;}
function HistoricalService(){const {user}=useKrishi();const call=useServerFn(pythonHistory);const [crop,setCrop]=useState('Maize');const [state,setState]=useState('');const [page,setPage]=useState(0);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [rows,setRows]=useState<Record<string,unknown>[]>([]);const [more,setMore]=useState(false);
 async function load(offset:number){setBusy(true);setMessage('');try{const r=await call({data:{commodity:crop,state,market:'',limit:100,offset}});if(!r.available){setRows([]);setMessage(r.error||'Historical service unavailable');setMore(false);return;}const result=r.result;setRows((result?.['records']||[]) as Record<string,unknown>[]);setMore(result?.['has_more']===true);setPage(offset);setMessage(`Historical dataset cutoff: ${String(result?.['latest_dataset_observation']||'Unknown')} · ${String(result?.['source']||'')}`);}catch{setMessage('Historical service unavailable');setRows([]);}finally{setBusy(false);}}
 return <section className="ks-section"><h2>Nationwide historical observations</h2><div className="ks-form-row"><label>Crop<input value={crop} maxLength={200} onChange={e=>setCrop(e.target.value)}/></label><label>State<input value={state} maxLength={200} onChange={e=>setState(e.target.value)}/></label><Button disabled={!user||busy||!crop.trim()} onClick={()=>load(0)}><RefreshCw/>Retrieve history</Button></div>{message&&<p className="ks-notice" role="status">{message}</p>}{rows.length>0&&<><div className="ks-table-wrap"><table className="ks-table"><thead><tr>{['Date','State','Market','Crop','Variety','Modal ₹/qtl'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{['date','state','market','commodity','variety','modal_price'].map(k=><td key={k}>{String(r[k]??'—')}</td>)}</tr>)}</tbody></table></div><div className="ks-actions"><Button variant="outline" disabled={busy||page===0} onClick={()=>load(page-100)}>Previous</Button><Button variant="outline" disabled={busy||!more} onClick={()=>load(page+100)}>Next</Button></div></>}</section>;}
export function ModelLabPage(){const runs=useModelRuns();const list=runs.data||[];const [id,setId]=useState('');const sel=list.find(r=>r.id===id)||list[0];
 return <div className="ks-lab"><div className="ks-page-head"><h1><FlaskConical className="inline"/> Model comparison laboratory</h1><p>Executed Python results on genuine AGMARKNET history: Naive, Seasonal naive, ARIMA, SARIMA, Random Forest and XGBoost, chronological validation and walk-forward testing. No metric on this page is typed by hand.</p></div>
  {runs.isLoading?<p role="status">Loading model runs…</p>:!list.length?<p className="ks-notice">Not trained: no model run has been published yet.</p>:<>
   <div className="ks-table-wrap"><table className="ks-table"><thead><tr><th>Crop</th><th>Market</th><th>Variety</th><th>Status</th><th>Weeks</th><th>History</th><th>7-day best</th><th>14-day best</th><th>28-day best</th></tr></thead><tbody>{list.map(r=><tr key={r.id} className={r.id===sel?.id?'start':''} onClick={()=>setId(r.id)} style={{cursor:'pointer'}}><td><button type="button" className="ks-link" onClick={()=>setId(r.id)}>{r.commodity}</button></td><td>{r.market}, {r.district}</td><td>{r.variety}</td><td>{r.status}</td><td>{r.observations}</td><td>{r.period_start} → {r.period_end}</td>{['1','2','4'].map(k=>{const h=r.report.horizons?.[k];return <td key={k}>{h?.status==='trained'?`${h.selected} (MAE ${r0(h.test[h.selected]?.MAE)})`:h?.status||'—'}</td>;})}</tr>)}</tbody></table></div>
   {sel&&<section className="ks-section"><h2>{sel.commodity} · {sel.market} ({sel.variety})</h2><RunDetail key={sel.id} run={sel}/></section>}
   <Analytics runs={list.filter(r=>r.status==='trained')}/>
  </>}
  <HistoricalService/>
  <SourcePanel/>
 </div>;}
export function findRun(runs:ModelRun[]|undefined,commodity:string,market:string,district?:string){return (runs||[]).find(r=>r.commodity===commodity&&r.market===marketBase(market)&&(!district||r.district===district));}
