import {createFileRoute} from '@tanstack/react-router';
import {MarketsPage,pageHead} from '@/components/krishisetu';
export const Route=createFileRoute('/markets')({head:()=>pageHead('India Market Explorer','Explore source-supported states, districts, APMCs, commodities and varieties across India.'),component:MarketsPage});