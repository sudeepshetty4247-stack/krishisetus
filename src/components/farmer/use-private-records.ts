import {useEffect,useRef,useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {useKrishi} from '../krishisetu-provider';
import {deleteFarmerRecord,listFarmerRecords,putFarmerRecord} from '@/lib/farmer-records.functions';
import {planSchema,readSellingPlans,writeSellingPlans,type SellingPlan} from '@/lib/plans';
import {alertSchema,readAlerts,writeAlerts,type PriceAlert} from '@/lib/alerts';
import {farmerCopy} from '@/lib/farmer-copy';
export function usePrivateRecords(kind:'plan'|'alert'){
 const {user,lang}=useKrishi();const list=useServerFn(listFarmerRecords),put=useServerFn(putFarmerRecord),remove=useServerFn(deleteFarmerRecord);
 const [state,setState]=useState<{owner:string|null;rows:(SellingPlan|PriceAlert)[]}>({owner:null,rows:[]});const [error,setError]=useState('');
 const revision=useRef(0);const activeOwner=useRef(user);activeOwner.current=user;
 const read=()=>kind==='plan'?readSellingPlans(user):readAlerts(user);
 const write=(rows:(SellingPlan|PriceAlert)[])=>{if(kind==='plan')writeSellingPlans(rows as SellingPlan[],user);else writeAlerts(rows as PriceAlert[],user);setState({owner:user,rows});};
 useEffect(()=>{let cancelled=false;const before=revision.current;setError('');setState({owner:user,rows:read()});if(user)void list({data:kind}).then(rows=>{if(cancelled||before!==revision.current)return;const parsed=rows.flatMap(r=>{const p=(kind==='plan'?planSchema:alertSchema).safeParse(r);return p.success?[p.data]:[];});write(parsed);}).catch(()=>{if(!cancelled)setError('Saved records could not be synchronized.');});return()=>{cancelled=true;};},[user,kind]); // eslint-disable-line react-hooks/exhaustive-deps
 async function save(record:SellingPlan|PriceAlert){revision.current++;if(user)await put({data:{kind,payload:record}});if(activeOwner.current!==user)return;write([record,...read().filter(r=>r.id!==record.id)]);}
 async function erase(id:string){revision.current++;if(user)await remove({data:{kind,id}});if(activeOwner.current!==user)return;write(read().filter(r=>r.id!==id));}
 return {rows:state.owner===user?state.rows:[],save,erase,error:error?farmerCopy(lang).error:''};
}