import {createFileRoute} from '@tanstack/react-router';
import {pageHead} from '@/components/krishisetu';
import {redirect} from '@tanstack/react-router';
export const Route=createFileRoute('/research')({beforeLoad:()=>{throw redirect({to:'/model-comparison',search:{},statusCode:301});},head:()=>pageHead('Research comparison','Random Forest, XGBoost and SARIMA evaluations from genuine saved KRISHISETU records.')});
