import type {Report} from '@/lib/agri-types';
import {istTimestamp,reportedDate,freshness,freshnessText} from '@/lib/price-time';
import {useKrishi} from '../krishisetu-provider';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {HISTORY_SOURCE} from './data';
// Separate fields: market reporting date, source publication, KRISHISETU retrieval, last successful refresh, source.
export function PriceTimestamps({report}:{report:Pick<Report,'date'|'retrieved_at'|'source_name'>&{source_dataset?:string|null}}){
 const {lang}=useKrishi();const kn=lang==='kn';const t=freshnessText[lang]??freshnessText['en']!;
 const historical=report.source_name===HISTORY_SOURCE;
 const q=useQuery({enabled:!historical,queryKey:['source-success',report.source_name],staleTime:60000,queryFn:async()=>{const {data,error}=await supabase.from('agri_sync_state').select('last_success,status').eq('source',report.source_name==='AGMARKNET'?'agmarknet':report.source_name).maybeSingle();if(error)throw error;return data;}});
 const f=historical?'historical':freshness(report.date);
 return <div className="ks-timestamps"><span className={`ks-fresh-badge ${f}`}>{t[f]}</span>
  <span>{kn?'ಮಾರುಕಟ್ಟೆ ವರದಿ ದಿನಾಂಕ':'Market reported'}: <b>{reportedDate(report.date)}</b></span>
  {report.source_dataset&&<span>{kn?'ಮೂಲ ದತ್ತಾಂಶ ಆವೃತ್ತಿ':'Source dataset version'}: {report.source_dataset}</span>}
  <span>{kn?'KRISHISETU ಪಡೆದ ಸಮಯ':'Retrieved by KRISHISETU'}: {istTimestamp(report.retrieved_at)}</span>
  <span>{kn?'ಕೊನೆಯ ಯಶಸ್ವಿ ನವೀಕರಣ':'Last successful update'}: {historical?(kn?'ಐತಿಹಾಸಿಕ ಆಮದು — ಸ್ವಯಂ ನವೀಕರಣವಿಲ್ಲ':'Historical import — not auto-refreshed'):istTimestamp(q.data?.last_success)}</span>
  {(f==='older'||f==='historical')&&<strong>{kn?'ಇದು ಇಂದಿನ ಬೆಲೆ ಅಲ್ಲ':'Not today’s price'}</strong>}</div>;
}
