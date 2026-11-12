import type {Report} from '@/lib/agri-types';
import {istTimestamp,reportedDate,ageInIST} from '@/lib/price-time';
import {useKrishi} from '../krishisetu-provider';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
export function PriceTimestamps({report}:{report:Pick<Report,'date'|'retrieved_at'|'source_name'>}){
 const {lang}=useKrishi();const kn=lang==='kn';
 const q=useQuery({queryKey:['source-success',report.source_name],queryFn:async()=>{const {data,error}=await supabase.from('agri_sync_state').select('last_success').eq('source',report.source_name==='AGMARKNET'?'agmarknet':report.source_name.toLowerCase()).maybeSingle();if(error)throw error;return data?.last_success??null;},staleTime:60000});
 return <div className="ks-timestamps"><span>{kn?'ಮಾರುಕಟ್ಟೆ ವರದಿ':'Market reported'}: {reportedDate(report.date)}</span><span>{kn?'ಪಡೆದ ಸಮಯ':'Retrieved'}: {istTimestamp(report.retrieved_at)}</span><span>{kn?'ಮೂಲ ನವೀಕರಣ':'Source refreshed'}: {istTimestamp(q.data)}</span>{ageInIST(report.date)>7&&<strong>{kn?'ಹಳೆಯ ವರದಿ — ಇಂದಿನ ಬೆಲೆ ಅಲ್ಲ':'Stale report — not today’s price'}</strong>}</div>;
}