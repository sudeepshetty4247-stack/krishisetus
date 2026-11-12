import {createFileRoute} from '@tanstack/react-router';
import {pageHead} from '@/components/krishisetu';
import {AppShell} from '@/components/farmer/shell';
import {PricesPage} from '@/components/farmer/pages';
export const Route=createFileRoute('/markets')({validateSearch:(s:Record<string,unknown>):{crop?:string|undefined;market?:string|undefined}=>({crop:typeof s['crop']==='string'?s['crop']:undefined,market:typeof s['market']==='string'?s['market']:undefined}),head:()=>pageHead('Market prices','Latest official mandi prices by crop, state and district, with reporting dates and history.'),component:Page});
function Page(){const s=Route.useSearch();return <AppShell><PricesPage key={JSON.stringify(s)} initialCrop={s.crop||''} initialMarket={s.market||''}/></AppShell>;}
