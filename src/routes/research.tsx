import {createFileRoute} from '@tanstack/react-router';
import {pageHead} from '@/components/krishisetu';
import {AppShell} from '@/components/farmer/shell';
import {ModelLabPage} from '@/components/farmer/model-lab';
export const Route=createFileRoute('/research')({head:()=>pageHead('Model comparison laboratory','Executed Naive, ARIMA, SARIMA, Random Forest and XGBoost results on genuine AGMARKNET history.'),component:()=><AppShell research><ModelLabPage/></AppShell>});
