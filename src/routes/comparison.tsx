import {createFileRoute} from '@tanstack/react-router';
import {ComparisonPage,pageHead} from '@/components/krishisetu';
export const Route=createFileRoute('/comparison')({head:()=>pageHead('APMC comparison','Compare compatible reported agricultural market prices and histories.'),component:ComparisonPage});