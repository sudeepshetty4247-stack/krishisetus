import {createFileRoute} from '@tanstack/react-router';
import {pageHead} from '@/components/krishisetu';
import {AppShell} from '@/components/farmer/shell';
import {ComparePage} from '@/components/farmer/pages';
export const Route=createFileRoute('/comparison')({head:()=>pageHead('Compare markets','Compare 2 to 5 markets for the same crop: latest prices, averages, stability and best-price days.'),component:()=><AppShell><ComparePage/></AppShell>});
