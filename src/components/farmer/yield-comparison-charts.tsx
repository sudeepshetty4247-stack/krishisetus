import {Bar,BarChart,CartesianGrid,Legend,ReferenceLine,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import evaluation from '@/data/yield-evaluation.json';

const models=evaluation.models.map(r=>({model:r.name,Train:r.training.R2,Validation:r.validation.R2,Test:r.test.R2,MAE:r.test.MAE,RMSE:r.test.RMSE}));
const selected=evaluation.models.find(r=>r.name===evaluation.selected_model);
const crops=['Rice','Wheat','Maize','Onion','Sugarcane'].flatMap(crop=>{
 const row=selected?.subgroups.crop.find(r=>r.crop===crop);
 return row?[{crop,MAE:row.MAE,RMSE:row.RMSE}]:[];
});
const colors=['var(--primary)','var(--chart-2)','var(--chart-4)'];
const tooltipStyle={backgroundColor:'var(--background)',borderColor:'var(--border)',color:'var(--foreground)',borderRadius:6};

export function YieldComparisonCharts(){
 return <section aria-label="Yield model comparison graphs" className="mt-8">
  <h2 className="mb-4">Measured model performance</h2>
  <div className="mc-chart-grid">
   <article className="mc-chart-item"><header><h3>Yield prediction error</h3><p>Final test · tonnes/hectare · lower is better</p></header><div className="mc-chart-canvas"><ResponsiveContainer width="100%" height="100%"><BarChart data={models} layout="vertical" margin={{top:20,right:20,bottom:10,left:0}} accessibilityLayer><CartesianGrid stroke="var(--border)" horizontal={false}/><XAxis type="number" tick={{fill:'var(--muted-foreground)',fontSize:12}}/><YAxis dataKey="model" type="category" width={100} tick={{fill:'var(--foreground)',fontSize:12}}/><Tooltip contentStyle={tooltipStyle} formatter={(v:number)=>`${v.toFixed(3)} t/ha`}/><Legend/><Bar dataKey="MAE" fill={colors[0]} radius={[0,3,3,0]}/><Bar dataKey="RMSE" fill={colors[1]} radius={[0,3,3,0]}/></BarChart></ResponsiveContainer></div></article>
   <article className="mc-chart-item"><header><h3>R² across chronological splits</h3><p>Higher is better · R² is not percentage accuracy</p></header><div className="mc-chart-canvas"><ResponsiveContainer width="100%" height="100%"><BarChart data={models} layout="vertical" margin={{top:20,right:20,bottom:10,left:0}} accessibilityLayer><CartesianGrid stroke="var(--border)" horizontal={false}/><XAxis type="number" domain={['auto',1]} tick={{fill:'var(--muted-foreground)',fontSize:12}}/><YAxis dataKey="model" type="category" width={100} tick={{fill:'var(--foreground)',fontSize:12}}/><ReferenceLine x={0} stroke="var(--muted-foreground)"/><Tooltip contentStyle={tooltipStyle} formatter={(v:number)=>v.toFixed(3)}/><Legend/>{(['Train','Validation','Test'] as const).map((k,i)=><Bar key={k} dataKey={k} fill={colors[i]} radius={[0,3,3,0]}/>)}</BarChart></ResponsiveContainer></div></article>
   <article className="mc-chart-item"><header><h3>{evaluation.selected_model} · crop-specific error</h3><p>Final test · tonnes/hectare · five verified crops</p></header><div className="mc-chart-canvas"><ResponsiveContainer width="100%" height="100%"><BarChart data={crops} layout="vertical" margin={{top:20,right:20,bottom:10,left:0}} accessibilityLayer><CartesianGrid stroke="var(--border)" horizontal={false}/><XAxis type="number" tick={{fill:'var(--muted-foreground)',fontSize:12}}/><YAxis dataKey="crop" type="category" width={100} tick={{fill:'var(--foreground)',fontSize:12}}/><Tooltip contentStyle={tooltipStyle} formatter={(v:number)=>`${v.toFixed(3)} t/ha`}/><Legend/><Bar dataKey="MAE" fill={colors[0]} radius={[0,3,3,0]}/><Bar dataKey="RMSE" fill={colors[1]} radius={[0,3,3,0]}/></BarChart></ResponsiveContainer></div><p className="mc-chart-note">Crop yield scales differ; errors are not directly comparable across crops.</p></article>
  </div>
 </section>;
}