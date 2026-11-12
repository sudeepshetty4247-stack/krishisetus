// Cross-market analytics on weekly histories. Pure functions; every input is a reported weekly price.
type H={market:string;history:{week:string;price:number|null}[]};
const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function marketAnalytics(groups:H[]){
 const byWeek=new Map<string,Record<string,number>>();for(const g of groups)for(const p of g.history)if(p.price!=null){const o=byWeek.get(p.week)||{};o[g.market]=p.price;byWeek.set(p.week,o);}
 const shared=[...byWeek.values()].filter(o=>Object.keys(o).length>=2);
 const above:Record<string,number>={},seen:Record<string,number>={};let spread=0;
 for(const o of shared){const v=Object.values(o).sort((a,b)=>a-b);const med=v.length%2?v[(v.length-1)/2]!:(v[v.length/2-1]!+v[v.length/2]!)/2;spread+=v[v.length-1]!-v[0]!;for(const [m,p] of Object.entries(o)){seen[m]=(seen[m]||0)+1;if(p>=med)above[m]=(above[m]||0)+1;}}
 const markets=groups.map(g=>{const ps=g.history.filter(p=>p.price!=null) as {week:string;price:number}[];const mean=ps.reduce((a,p)=>a+p.price,0)/Math.max(1,ps.length);const sd=Math.sqrt(ps.reduce((a,p)=>a+(p.price-mean)**2,0)/Math.max(1,ps.length));
  const byMonth=new Map<number,number[]>();for(const p of ps){const m=Number(p.week.slice(5,7))-1;byMonth.set(m,[...(byMonth.get(m)||[]),p.price]);}
  let best=-1,bestMean=-Infinity;for(const [m,list] of byMonth){if(list.length<3)continue;const mm=list.reduce((a,b)=>a+b,0)/list.length;if(mm>bestMean){bestMean=mm;best=m;}}
  return {market:g.market,weeks:ps.length,mean,cv:mean?sd/mean:0,consistency:seen[g.market]?(above[g.market]||0)/seen[g.market]!:0,bestMonth:best>=0?months[best]!:'—',seasonalAdvantage:best>=0&&mean?bestMean/mean-1:0};});
 return {markets:markets.sort((a,b)=>b.consistency-a.consistency),meanSpread:shared.length?spread/shared.length:null,sharedWeeks:shared.length};
}
// Decide with week t-1 prices, realise week t prices: no look-ahead.
export function backtestStrategies(groups:H[],start:string,distance:Record<string,number|null>,costPerKm:number){
 if(!groups.some(g=>g.market===start)||groups.some(g=>distance[g.market]==null))return null;
 const map=new Map<string,Record<string,number>>();for(const g of groups)for(const p of g.history)if(p.price!=null){const o=map.get(p.week)||{};o[g.market]=p.price;map.set(p.week,o);}
 const weeks=[...map.keys()].sort();const res:Record<string,number[]>={'Stay at starting market':[],'Nearest other market':[],'Highest reported price last week':[],'Highest net value last week':[]};
 const net=(m:string,p:number)=>p-(distance[m]??0)*costPerKm;
 const nearest=groups.filter(g=>g.market!==start).sort((a,b)=>(distance[a.market]??0)-(distance[b.market]??0))[0]?.market;
 for(let i=1;i<weeks.length;i++){const prev=map.get(weeks[i-1]!)!,cur=map.get(weeks[i]!)!;if(cur[start]==null||prev[start]==null)continue;
  const cands=Object.keys(prev).filter(m=>cur[m]!=null);
  const hp=cands.sort((a,b)=>prev[b]!-prev[a]!)[0];const hn=[...cands].sort((a,b)=>net(b,prev[b]!)-net(a,prev[a]!))[0];
  res['Stay at starting market']!.push(cur[start]!);
  if(nearest&&cur[nearest]!=null)res['Nearest other market']!.push(net(nearest,cur[nearest]!));
  if(hp)res['Highest reported price last week']!.push(net(hp,cur[hp]!));
  if(hn)res['Highest net value last week']!.push(net(hn,cur[hn]!));}
 const avg=(l:number[])=>l.length?l.reduce((a,b)=>a+b,0)/l.length:NaN;const base=avg(res['Stay at starting market']!);
 return Object.entries(res).map(([strategy,l])=>({strategy,weeks:l.length,meanNet:avg(l),vsStart:avg(l)-base}));
}
