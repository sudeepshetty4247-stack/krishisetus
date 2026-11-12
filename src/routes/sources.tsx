import {createFileRoute} from '@tanstack/react-router';
import {SourcesPage,pageHead} from '@/components/krishisetu';
export const Route=createFileRoute('/sources')({head:()=>pageHead('Sources and updates','Test official data source reachability and view recorded connection status.'),component:SourcesPage});