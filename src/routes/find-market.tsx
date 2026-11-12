import {createFileRoute} from '@tanstack/react-router';
import {pageHead} from '@/components/krishisetu';
import {AppShell} from '@/components/farmer/shell';
import {FindMarketPage} from '@/components/farmer/pages';
type S={crop?:string|undefined;qty?:number|undefined;market?:string|undefined};
export const Route=createFileRoute('/find-market')({validateSearch:(s:Record<string,unknown>):S=>({crop:typeof s['crop']==='string'?s['crop']:undefined,qty:typeof s['qty']==='number'&&s['qty']>0?s['qty']:undefined,market:typeof s['market']==='string'?s['market']:undefined}),head:()=>pageHead('Find your best market','Choose crop, quantity and starting market to rank markets by potential net value.'),component:Page});
function Page(){const s=Route.useSearch();return <AppShell><FindMarketPage key={JSON.stringify(s)} initial={s}/></AppShell>;}
