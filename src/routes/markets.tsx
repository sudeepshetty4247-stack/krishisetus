import {createFileRoute} from '@tanstack/react-router';
import {pageHead} from '@/components/krishisetu';
import {AppShell} from '@/components/farmer/shell';
import {PricesPage} from '@/components/farmer/pages';
export const Route=createFileRoute('/markets')({head:()=>pageHead('Market prices','Latest official mandi prices by crop, state and district, with reporting dates and history.'),component:()=><AppShell><PricesPage/></AppShell>});
