import {createFileRoute} from '@tanstack/react-router';
import {pageHead} from '@/components/krishisetu';
import {AppShell} from '@/components/farmer/shell';
import {TrendsPage} from '@/components/farmer/pages';
export const Route=createFileRoute('/forecast')({head:()=>pageHead('Price trends','Historical crop prices and validated Python forecasts where available.'),component:()=><AppShell><TrendsPage/></AppShell>});
