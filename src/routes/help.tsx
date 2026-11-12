import {createFileRoute} from '@tanstack/react-router';
import {pageHead} from '@/components/krishisetu';
import {AppShell} from '@/components/farmer/shell';
import {HowPage} from '@/components/farmer/pages';
export const Route=createFileRoute('/help')({head:()=>pageHead('How KRISHISETU works','How prices, net values, break-even transport and forecasts are calculated.'),component:()=><AppShell><HowPage/></AppShell>});
