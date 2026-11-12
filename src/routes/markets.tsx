import {createFileRoute} from '@tanstack/react-router';
import {MarketsPage,pageHead} from '@/components/krishisetu';
export const Route=createFileRoute('/markets')({head:()=>pageHead('Explore Dharwad markets','Compare reported crop prices across five Dharwad district APMCs.'),component:MarketsPage});