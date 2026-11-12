import {createFileRoute} from '@tanstack/react-router';
import {OpportunitiesPage,pageHead} from '@/components/krishisetu';
export const Route=createFileRoute('/opportunities')({head:()=>pageHead('Market opportunities','Source-based price opportunities, consistency and historical selling strategy backtests.'),component:OpportunitiesPage});