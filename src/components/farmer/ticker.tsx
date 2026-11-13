import {Link} from '@tanstack/react-router';
import {useEffect,useState} from 'react';
import {TrendingDown,TrendingUp,Minus} from 'lucide-react';
import {useTicker,useSourceRuns} from './data';
import {reportedDate,istTimestamp} from '@/lib/price-time';
import {useCopy} from './shell';
import {latestTickerRows} from '@/lib/ticker';
// Movement = latest vs previous distinct report date for the SAME market, crop, variety, grade and source.
export function MarketTicker(){const c=useCopy();const q=useTicker();const runs=useSourceRuns();const [now,setNow]=useState<Date|null>(null);
 useEffect(()=>{setNow(new Date());const timer=setInterval(()=>setNow(new Date()),30000);return ()=>clearInterval(timer);},[]);
 const items=now?latestTickerRows(q.data||[],now):[];
 const today=now?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now):'';
 const retrieved=runs.data?.find(r=>r.stored>0&&r.finished_at)?.finished_at;
 const reportDay=items[0]?.date;
 const status=<div className="ks-ticker-status" role="status"><strong>{c.today} · {reportedDate(today)}</strong>{reportDay&&<span>{c.reportedOn} · <strong>{reportedDate(reportDay)}</strong></span>}{reportDay!==today&&<span>{c.noTodayReports}</span>}{retrieved&&<span>{c.lastUpdate} · {istTimestamp(retrieved)}</span>}</div>;
 if(!items.length)return q.isLoading||!now?<div className="ks-ticker-status" role="status">{c.loadingText}</div>:q.error?<div className="ks-ticker-status" role="status">{c.error}</div>:status;
 return <>{status}<div className="ks-ticker" aria-label={c.latestTitle}><div className="ks-ticker-track">{[0,1].map(copy=><div className="ks-ticker-group" key={copy} aria-hidden={copy===1}>{items.map(r=><Link to="/markets" search={{crop:r.commodity,market:r.market}} tabIndex={copy===1?-1:0} key={`${copy}-${r.state}-${r.market}-${r.commodity}-${r.variety}-${r.grade}`} title={`${r.variety} · ${r.grade} · ${r.source_name}`}><strong>{r.commodity}</strong><b>₹{Number(r.modal_price).toLocaleString('en-IN')}{c.perQuintal}</b><span>{r.market} · {reportedDate(r.date)}</span><span className={r.change>0?'up':r.change<0?'down':''}>{r.change>0?<TrendingUp/>:r.change<0?<TrendingDown/>:<Minus/>}{r.change>0?'+':''}{Number(r.pct).toFixed(1)}% <small>vs {reportedDate(r.prev_date)}</small></span></Link>)}</div>)}</div></div></>;
}
