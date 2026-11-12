import {Link} from '@tanstack/react-router';
import {useLatest} from './data';
import {tickerItems} from '@/lib/ticker';
import {reportedDate} from '@/lib/price-time';
import {useCopy} from './shell';
export function MarketTicker(){const c=useCopy();const q=useLatest(3000);const items=tickerItems(q.data||[]);
 if(!items.length)return <div className="ks-ticker-status" role="status">{q.isLoading?c.loadingText:c.latestNone}</div>;
 return <div className="ks-ticker" aria-label={c.latestTitle}><div className="ks-ticker-track">{[0,1].map(copy=><div className="ks-ticker-group" key={copy} aria-hidden={copy===1}>{items.map(({report:r,change})=><Link to="/markets" search={{crop:r.commodity,market:r.market}} tabIndex={copy===1?-1:0} key={r.id}><strong>{r.commodity}</strong><b>₹{r.modal_price.toLocaleString('en-IN')}{c.perQuintal}</b><span>{r.market} · {reportedDate(r.date)}</span><span>{change===null?'—':`${change>0?'+':''}₹${change.toLocaleString('en-IN')}`}</span></Link>)}</div>)}</div></div>;
}