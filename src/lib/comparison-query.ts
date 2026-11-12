import {queryOptions} from '@tanstack/react-query';
import {getComparisonRecords} from './comparison.functions';
export const comparisonQueryOptions=()=>queryOptions({queryKey:['academic-online-evaluations'],queryFn:()=>getComparisonRecords(),staleTime:30000,refetchInterval:30000});