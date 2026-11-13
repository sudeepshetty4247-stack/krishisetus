import {createFileRoute} from '@tanstack/react-router';
import {pageHead} from '@/components/krishisetu';
import {AppShell} from '@/components/farmer/shell';
import {ModelComparisonPage} from '@/components/farmer/model-comparison-page';
import {comparisonQueryOptions} from '@/lib/comparison-query';
import {Button} from '@/components/ui/button';
type Search=Partial<Record<'commodity'|'variety'|'state'|'district'|'market'|'dataset_version'|'experiment'|'algorithm'|'split'|'view'|'scope',string>>&{horizon?:number};
export const Route=createFileRoute('/model-comparison')({
 validateSearch:(search:Record<string,unknown>):Search=>Object.fromEntries(Object.entries(search).filter(([k,v])=>['commodity','variety','state','district','market','dataset_version','experiment','algorithm','split','view','scope'].includes(k)&&typeof v==='string').concat(typeof search['horizon']==='number'?[['horizon',search['horizon']]]:[])),
 loader:async({context})=>{await context.queryClient.ensureQueryData(comparisonQueryOptions());},
 errorComponent:({error})=><AppShell research><section className="mc-dashboard"><h1>Model Performance &amp; Comparison</h1><p role="alert">{error instanceof Error?error.message:'Saved evaluations are unavailable.'}</p><Button onClick={()=>{void window.location.reload();}}>Retry results</Button></section></AppShell>,
 notFoundComponent:()=><AppShell research><p>Evaluation not found.</p></AppShell>,
 head:()=>pageHead('Model Performance & Comparison','Genuine KRISHISETU algorithm evaluations, validation and test metrics, dataset history and verified model availability.'),component:()=><AppShell research><ModelComparisonPage/></AppShell>});