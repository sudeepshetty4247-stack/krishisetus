import {render,screen,cleanup} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {KrishisetuProvider,useKrishi} from '@/components/krishisetu-provider';

vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}})}}}));
afterEach(cleanup);
function Consumer(){const value=useKrishi();return <output>{value.lang}</output>;}
describe('shared page provider',()=>{
 it('keeps nested consumers connected across provider rerenders',()=>{
  const client=new QueryClient({defaultOptions:{queries:{enabled:false,retry:false}}});
  const tree=<QueryClientProvider client={client}><KrishisetuProvider><Consumer/></KrishisetuProvider></QueryClientProvider>;
  const view=render(tree);expect(screen.getByText('kn')).toBeInTheDocument();
  view.rerender(tree);expect(screen.getByText('kn')).toBeInTheDocument();
 });
});