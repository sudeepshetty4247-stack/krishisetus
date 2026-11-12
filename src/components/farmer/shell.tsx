import {type ReactNode} from 'react';
import {Link} from '@tanstack/react-router';
import {Sprout,Home,Search,IndianRupee,TrendingUp,ClipboardList,Menu,Globe2,FlaskConical,LogOut,Scale,CircleHelp,Info} from 'lucide-react';
import {useKrishi} from '../krishisetu-provider';
import {languages,type Language} from '@/lib/translations';
import {farmerCopy} from '@/lib/farmer-copy';
import {supabase} from '@/integrations/supabase/client';
import {MarketTicker} from './ticker';
import {useRouterState} from '@tanstack/react-router';
export function useCopy(){const {lang}=useKrishi();return farmerCopy(lang);}
const main=[['/',Home,'home'],['/find-market',Search,'find'],['/markets',IndianRupee,'prices'],['/forecast',TrendingUp,'trends'],['/selling-assistant',ClipboardList,'plan']] as const;
const research=[['/research','lab'],['/crop-intelligence','analysis'],['/opportunities','opportunities'],['/data-quality','quality'],['/sources','sourcesNav']] as const;
export function AppShell({children,research:isResearch=false}:{children:ReactNode;research?:boolean}){
 const {lang,changeLanguage,user}=useKrishi();const c=farmerCopy(lang);
 const home=useRouterState({select:s=>s.location.pathname==='/' });
 return <div className="ks-app">
  <header className="ks-header"><div className="ks-wrap ks-header-row">
   <Link to="/" className="ks-brand"><span className="ks-brand-mark"><Sprout/></span><span><b>KRISHISETU</b><small>{c.promise}</small></span></Link>
   <nav className="ks-mainnav" aria-label="Main">{main.map(([to,Icon,k])=><Link key={to} to={to} className="ks-navlink" activeOptions={{exact:to==='/'}} activeProps={{className:'ks-navlink active'}}><Icon/>{c[k]}</Link>)}</nav>
   <div className="ks-tools">
    <label className="ks-lang"><Globe2/><select aria-label={c.language} value={lang} onChange={e=>changeLanguage(e.target.value as Language)}>{Object.entries(languages).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <details className="ks-more"><summary aria-label={c.more}><Menu/><span>{c.more}</span></summary><div className="ks-menu">
     <Link to="/comparison"><Scale/>{c.compare}</Link><Link to="/selling-assistant"><ClipboardList/>{c.plan}</Link><Link to="/help"><CircleHelp/>{c.how}</Link><Link to="/about"><Info/>{c.about}</Link>
     <Link to={isResearch?'/':'/research'}>{isResearch?<Sprout/>:<FlaskConical/>}{isResearch?c.farmerMode:c.research}</Link>
     <Link to="/model-comparison"><FlaskConical/>Model Performance &amp; Comparison</Link>
     {user&&<button onClick={()=>void supabase.auth.signOut()}><LogOut/>Sign out</button>}
    </div></details>
   </div></div></header>
  {home&&<MarketTicker/>}
  {isResearch&&<div className="ks-research-bar"><div className="ks-wrap"><span className="ks-research-tag"><FlaskConical/>{c.research}</span><Link to="/model-comparison" activeProps={{className:'active'}}>Model Performance &amp; Comparison</Link>{research.map(([to,k])=><Link key={to} to={to} activeProps={{className:'active'}}>{c[k]}</Link>)}<span className="ks-research-sub">{c.researchSub}</span></div></div>}
  <main className={isResearch?'ks-wrap ks-main ks-research-main':'ks-main'}>{children}</main>
  <footer className="ks-footer"><div className="ks-wrap"><b>KRISHISETU</b><span>{c.freshNote}</span><Link to="/help">{c.how}</Link><Link to="/about">{c.about}</Link></div></footer>
  <nav className="ks-bottomnav" aria-label="Mobile">{main.map(([to,Icon,k])=><Link key={to} to={to} activeOptions={{exact:to==='/'}} activeProps={{className:'active'}}><Icon/><span>{c[k]}</span></Link>)}</nav>
 </div>;
}
