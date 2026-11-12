import {Link} from '@tanstack/react-router';
import {TrendingDown,TrendingUp,Minus} from 'lucide-react';
import {useTicker} from './data';
import {reportedDate} from '@/lib/price-time';
import {useCopy} from './shell';
// Movement = latest vs previous distinct report date for the SAME market, crop, variety, grade and source.
export function MarketTicker(){const c=useCopy();const q=useTicker();const items=q.data||[];
 if(!items.length)return <div className="ks-ticker-status" role="status">{q.isLoading?c.loadingText:q.error?c.error:c.latestNone}</div>;
 return <div className="ks-ticker" aria-label={c.latestTitle}><div className="ks-ticker-track">{[0,1].map(copy=><div className="ks-ticker-group" key={copy} aria-hidden={copy===1}>{items.map(r=><Link to="/markets" search={{crop:r.commodity,market:r.market}} tabIndex={copy===1?-1:0} key={`${copy}-${r.state}-${r.market}-${r.commodity}-${r.variety}-${r.grade}`} title={`${r.variety} · ${r.grade} · ${r.source_name}`}><strong>{r.commodity}</strong><b>₹{Number(r.modal_price).toLocaleString('en-IN')}{c.perQuintal}</b><span>{r.market} · {reportedDate(r.date)}</span><span className={r.change>0?'up':r.change<0?'down':''}>{r.change>0?<TrendingUp/>:r.change<0?<TrendingDown/>:<Minus/>}{r.change>0?'+':''}{Number(r.pct).toFixed(1)}% <small>vs {reportedDate(r.prev_date)}</small></span></Link>)}</div>)}</div></div>;
}
