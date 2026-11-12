import {createFileRoute} from '@tanstack/react-router';
import {pageHead} from '@/components/krishisetu';
import {AppShell} from '@/components/farmer/shell';
import {PlanPage} from '@/components/farmer/pages';
export const Route=createFileRoute('/selling-assistant')({head:()=>pageHead('My selling plan','Your saved market comparisons and downloadable selling reports.'),component:()=><AppShell><PlanPage/></AppShell>});
