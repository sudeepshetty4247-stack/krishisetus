import type {Report} from '@/lib/agri-types';
import {istTimestamp,reportedDate,freshness,freshnessText,timestampCopy} from '@/lib/price-time';
import {useKrishi} from '../krishisetu-provider';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {HISTORY_SOURCE} from './data';
// Separate fields: market reporting date, source publication, KRISHISETU retrieval, last successful refresh, source.
export function PriceTimestamps({report}:{report:Pick<Report,'date'|'retrieved_at'|'source_name'>&{source_dataset?:string|null}}){
 const {lang}=useKrishi();const t=freshnessText[lang]??freshnessText['en'];const labels=timestampCopy[lang];
 const historical=report.source_name===HISTORY_SOURCE;
 const q=useQuery({enabled:!historical,queryKey:['source-success',report.source_name],staleTime:60000,queryFn:async()=>{const {data,error}=await supabase.from('agri_sync_state').select('last_success,status').eq('source',report.source_name==='AGMARKNET'?'agmarknet':report.source_name).maybeSingle();if(error)throw error;return data;}});
 const f=historical?'historical':freshness(report.date);
 return <div className="ks-timestamps"><span className={`ks-fresh-badge ${f}`}>{t?.[f]}</span>
  <span>{labels.reported}: <b>{reportedDate(report.date)}</b></span>
  {report.source_dataset&&<span>{labels.version}: {report.source_dataset}</span>}
  <span>{labels.retrieved}: {istTimestamp(report.retrieved_at)}</span>
  <span>{labels.success}: {historical?labels.historical:istTimestamp(q.data?.last_success)}</span>
  {(f==='older'||f==='historical')&&<strong>{labels.old}</strong>}</div>;
}
