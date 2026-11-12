import {createFileRoute} from '@tanstack/react-router';
import {HelpPage,pageHead} from '@/components/krishisetu';
export const Route=createFileRoute('/help')({head:()=>pageHead('About and farmer help','Understand modal prices, market comparisons, expense calculations and product limitations.'),component:HelpPage});