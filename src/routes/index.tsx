import {createFileRoute} from '@tanstack/react-router';
import {pageHead} from '@/components/krishisetu';
import {AppShell} from '@/components/farmer/shell';
import {FarmerHome} from '@/components/farmer/pages';
export const Route=createFileRoute('/')({head:()=>pageHead('Find a better market for your crop','Compare official mandi prices, add your transport costs and see your potential net value at each market.'),component:()=><AppShell><FarmerHome/></AppShell>});
