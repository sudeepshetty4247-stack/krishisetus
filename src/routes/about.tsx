import {createFileRoute} from '@tanstack/react-router';
import {pageHead} from '@/components/krishisetu';
import {AppShell} from '@/components/farmer/shell';
import {AboutPage} from '@/components/farmer/pages';
export const Route=createFileRoute('/about')({head:()=>pageHead('About KRISHISETU','A farmer-first agricultural market intelligence platform for India.'),component:()=><AppShell><AboutPage/></AppShell>});
