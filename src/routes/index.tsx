import {createFileRoute} from '@tanstack/react-router';
import {pageHead} from '@/components/krishisetu';
import {AppShell} from '@/components/farmer/shell';
import {LocationHome} from '@/components/farmer/location-home';
export const Route=createFileRoute('/')({head:()=>pageHead('Nearby markets and crop prices','Choose your village or current location, explore genuine reported crop prices and calculate selling returns with KRISHISETU.'),component:()=><AppShell><LocationHome/></AppShell>});
