import {createFileRoute} from '@tanstack/react-router';
import {DecisionPage,pageHead} from '@/components/krishisetu';
export const Route=createFileRoute('/selling-assistant')({head:()=>pageHead('Selling decision assistant','Calculate potential crop net values using reported prices and your expenses.'),component:DecisionPage});