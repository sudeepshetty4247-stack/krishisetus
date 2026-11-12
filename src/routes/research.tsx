import {createFileRoute} from '@tanstack/react-router';
import {ResearchPage,pageHead} from '@/components/krishisetu';
export const Route=createFileRoute('/research')({head:()=>pageHead('Agricultural research','Explore imported agricultural observations and research model availability.'),component:ResearchPage});