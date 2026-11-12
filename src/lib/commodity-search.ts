// Commodity search over the live catalogue: partial names, regional names and small spelling mistakes.
// Aliases only map words to catalogue entries; they never add crops that the sources did not report.
const ALIASES:Record<string,string[]>={
 'maize':['corn','makka','makkajola','mekkejola','ಮೆಕ್ಕೆಜೋಳ','मक्का','మొక్కజొన్న','மக்காச்சோளம்','मका'],
 'bengal gram':['chana','chickpea','kadale','kadle','gram','ಕಡಲೆ','चना','శనగ','கொண்டைக்கடலை','हरभरा'],
 'onion':['eerulli','ullagaddi','pyaz','pyaaz','ಈರುಳ್ಳಿ','प्याज','ఉల్లి','வெங்காயம்','कांदा'],
 'tomato':['tamatar','ಟೊಮೆಟೊ','टमाटर','టమాటా','தக்காளி'],
 'potato':['aloo','alu','ಆಲೂಗಡ್ಡೆ','आलू','బంగాళదుంప','உருளைக்கிழங்கு','बटाटा'],
 'paddy':['rice','dhan','bhatta','ಭತ್ತ','धान','వరి','நெல்','भात'],
 'wheat':['gehun','godhi','ಗೋಧಿ','गेहूं','గోధుమ','கோதுமை','गहू'],
 'cotton':['kapas','hatti','ಹತ್ತಿ','कपास','పత్తి','பருத்தி'],
 'red gram':['tur','toor','togari','arhar','pigeon pea','ತೊಗರಿ','अरहर','तुअर','కంది','துவரை'],
 'groundnut':['shenga','peanut','moongphali','ಶೇಂಗಾ','मूंगफली','వేరుశనగ','நிலக்கடலை'],
 'jowar':['jola','sorghum','ಜೋಳ','ज्वार','జొన్న','சோளம்'],
 'ragi':['finger millet','nachni','ರಾಗಿ','रागी','రాగి','கேழ்வரகு'],
 'green chilli':['menasinakai','mirchi','chilli','ಮೆಣಸಿನಕಾಯಿ','हरी मिर्च','మిరప'],
 'arecanut':['adike','supari','betelnut','ಅಡಿಕೆ','सुपारी'],
 'copra':['kobbari','coconut','ಕೊಬ್ಬರಿ','नारियल'],
 'soyabean':['soya','soybean','सोयाबीन'],
 'green gram':['moong','hesaru','ಹೆಸರು','मूंग','పెసర'],
 'black gram':['urad','urd','uddu','ಉದ್ದು','उड़द','మినుము'],
 'turmeric':['haldi','arishina','ಅರಿಶಿನ','हल्दी','పసుపు'],
 'banana':['bale','kela','ಬಾಳೆ','केला','అరటి'],
};
export const normalise=(s:string)=>s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function distance(a:string,b:string){const d=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=d[0]!;d[0]=i;for(let j=1;j<=b.length;j++){const tmp=d[j]!;d[j]=Math.min(d[j]!+1,d[j-1]!+1,prev+(a[i-1]===b[j-1]?0:1));prev=tmp;}}return d[b.length]!;}
export function scoreCommodity(name:string,query:string){
 const n=normalise(name),q=normalise(query);if(!q)return 1;
 if(n===q)return 100;if(n.startsWith(q))return 92;
 const words=n.split(' ');if(words.some(w=>w.startsWith(q)))return 88;if(n.includes(q))return 80;
 for(const [stem,aliases] of Object.entries(ALIASES)){
  if(!n.startsWith(stem)&&!words.includes(stem))continue;
  if(aliases.some(a=>{const an=normalise(a);return an===q||an.startsWith(q)||(q.length>=4&&q.startsWith(an));}))return 85;
 }
 if(q.length>=4){const tol=q.length>=7?2:1;
  if(words.some(w=>distance(w.slice(0,q.length+1),q)<=tol||distance(w,q)<=tol))return 60;
  for(const [stem,aliases] of Object.entries(ALIASES)){if(!n.startsWith(stem))continue;if(aliases.some(a=>distance(normalise(a),q)<=tol))return 55;}
 }
 return 0;
}
export function searchCommodities(names:string[],query:string,limit=12){
 return names.map(name=>({name,score:scoreCommodity(name,query)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.name.length-b.name.length||a.name.localeCompare(b.name)).slice(0,limit).map(x=>x.name);
}
