import {createFileRoute} from '@tanstack/react-router';
import {QualityPage,pageHead} from '@/components/krishisetu';
export const Route=createFileRoute('/data-quality')({head:()=>pageHead('Data quality centre','Import crop market CSV reports and examine coverage, rejected rows and source provenance.'),component:QualityPage});