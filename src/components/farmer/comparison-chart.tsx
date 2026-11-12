import {BarChart,Bar,CartesianGrid,Cell,LabelList,ResponsiveContainer,Tooltip,XAxis,YAxis,ReferenceLine} from 'recharts';
import {algorithmLabel,type EvaluationRow,type DirectionMetric} from '@/lib/model-comparison';
type RegressionMetric='MAE'|'RMSE'|'sMAPE'|'R2';
export function ComparisonChart({rows,split,metric,title,description,direction=false}:{rows:EvaluationRow[];split:'validation'|'test';metric:RegressionMetric|DirectionMetric;title:string;description:string;direction?:boolean}){
 const values=rows.map(r=>({name:algorithmLabel(r.algorithm),value:direction?r.direction?.[split]?.[metric as DirectionMetric]:r[split]?.[metric as RegressionMetric]}));
 const data=values.filter((v):v is {name:string;value:number}=>typeof v.value==='number'&&Number.isFinite(v.value));
 const best=data.length?(direction||metric==='R2'?Math.max(...data.map(v=>v.value)):Math.min(...data.map(v=>v.value))):null;
 const format=(v:number)=>direction&&metric!=='ROC_AUC'?`${(v*100).toFixed(1)}%`:v.toFixed(2);
 return <article className="mc-chart-item" aria-label={`${title} comparison chart`}>
  <header><h3>{title}</h3><p>{description}</p></header>
  {data.length?<div className="mc-chart-canvas"><ResponsiveContainer width="100%" height={300}><BarChart data={data} layout="vertical" margin={{top:12,right:65,bottom:8,left:0}} accessibilityLayer>
   <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3"/>
   <XAxis type="number" domain={direction?[0,1]:metric==='R2'?['auto',1]:[0,'auto']} tickFormatter={v=>direction&&metric!=='ROC_AUC'?`${Math.round(Number(v)*100)}%`:String(v)} tick={{fill:'var(--muted-foreground)',fontSize:12}}/>
   <YAxis type="category" dataKey="name" width={112} tick={{fill:'var(--foreground)',fontSize:12}} tickLine={false} axisLine={false}/>
   <ReferenceLine x={0} stroke="var(--border)"/>
   <Tooltip formatter={(v)=>[format(Number(v)),title]} contentStyle={{background:'var(--card)',color:'var(--foreground)',borderColor:'var(--border)',borderRadius:8}} cursor={{fill:'var(--muted)'}}/>
   <Bar dataKey="value" barSize={23} radius={[0,3,3,0]} isAnimationActive={false}>{data.map(d=><Cell key={d.name} fill={Math.abs(d.value-Number(best))<1e-12?'var(--primary)':'var(--chart-2)'}/>)}<LabelList dataKey="value" position="right" formatter={(v:unknown)=>format(Number(v))} fill="var(--foreground)" fontSize={12}/></Bar>
  </BarChart></ResponsiveContainer></div>:<div className="mc-missing">Not available — no valid out-of-sample results for this metric.</div>}
  {values.some(v=>v.value===null||v.value===undefined)&&<p className="mc-chart-note">{values.filter(v=>v.value===null||v.value===undefined).map(v=>v.name).join(', ')}: Not available.</p>}
 </article>;
}