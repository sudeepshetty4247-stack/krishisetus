import {createFileRoute} from '@tanstack/react-router';
import {pageHead} from '@/components/krishisetu';
import {AppShell} from '@/components/farmer/shell';
import {ModelComparisonPage} from '@/components/farmer/model-comparison-page';
export const Route=createFileRoute('/model-comparison')({head:()=>pageHead('Model Performance & Comparison','Genuine KRISHISETU algorithm evaluations, validation and test metrics, dataset history and verified model availability.'),component:()=><AppShell research><ModelComparisonPage/></AppShell>});