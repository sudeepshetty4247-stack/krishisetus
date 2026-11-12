// Crop discovery helpers: category browsing, recent crops and recognition status.
// Categories come from keyword rules over the official catalogue names; they never add crops.
import {normalise,scoreCommodity,searchCommodities} from './commodity-search';
import type {Language} from './translations';
export const categories=['cereals','pulses','oilseeds','vegetables','fruits','spices','plantation','flowers','commercial','other'] as const;
export type Category=typeof categories[number];
const RULES:[Category,string[]][]=[
 ['pulses',['gram','dal','tur','arhar','moong','urd','urad','masur','lentil','peas','cowpea','lobia','rajma','avare','alasande','kulthi','horse gram','moth','beans whole']],
 ['oilseeds',['groundnut','mustard','soyabean','soybean','sunflower','sesamum','sesame','til','linseed','castor','safflower','niger','rape','copra','coconut oil','gingelly']],
 ['spices',['chilli','chili','turmeric','pepper','cardamom','clove','cumin','jeera','coriander','dhania','ginger','garlic','fenugreek','methi seed','ajwan','nutmeg','mace','cinnamon','tamarind','fennel','saunf','mustard seed']],
 ['plantation',['arecanut','coffee','tea','rubber','cashew','coconut','cocoa','betal','betel']],
 ['flowers',['flower','rose','marigold','jasmine','mallige','chrysanthemum','sevanti','carnation','tuberose','lily','gerbera','anthorium','orchid','kanakambara','gladiolus','aster']],
 ['commercial',['cotton','kapas','sugarcane','jute','tobacco','gur','jaggery','silk','cocoon','wool','bamboo','broomstick']],
 ['cereals',['maize','paddy','rice','wheat','jowar','bajra','ragi','barley','millet','sorghum','corn','foxtail','kodo','sama','navane','oats','beaten rice','puffed']],
 ['fruits',['apple','banana','mango','grapes','orange','papaya','pomegranate','guava','pineapple','sapota','chikoo','watermelon','muskmelon','lemon','lime','mosambi','jackfruit','litchi','pear','plum','peach','kinnow','ber','amla','avocado','fig','custard','dates','strawberry','kiwi','cherry']],
 ['vegetables',['onion','tomato','potato','brinjal','cabbage','cauliflower','carrot','beans','bhindi','ladies','gourd','pumpkin','cucumber','capsicum','peas','radish','beetroot','spinach','palak','methi','drumstick','sweet potato','tapioca','yam','colacasia','knool','leafy','amaranthus','coriander leaves','green chilli','cluster','tinda','parwal','snake','ridge','ashgourd','bottle','bitter','elephant','chow','mushroom','baby corn','lettuce','asparagus','alsandikai']],
];
export function categorize(name:string):Category{const n=' '+normalise(name)+' ';
 // Vegetable words like "green chilli" or "beans" must win over generic spice/pulse words.
 if(/ (green chilli|beans|leaves|leafy|baby corn|green peas|peas wet|drumstick) /.test(n)&&!/ whole /.test(n))return 'vegetables';
 for(const [cat,words] of RULES)if(words.some(w=>n.includes(' '+w+' ')||n.includes(' '+w+'s ')||n.includes(' '+w+'es ')))return cat;return 'other';}
export function byCategory(crops:string[]){const out:Record<Category,string[]>={cereals:[],pulses:[],oilseeds:[],vegetables:[],fruits:[],spices:[],plantation:[],flowers:[],commercial:[],other:[]};for(const c of crops)out[categorize(c)].push(c);return out;}
export type Recognition='official'|'alias'|'custom';
// official: typed name equals a catalogue name; alias: typed text maps to a catalogue name; custom: farmer's own entry.
export function recognise(crops:string[],text:string):{status:Recognition;match?:string|undefined;suggestions:string[]}{
 const t=text.trim();if(!t)return {status:'custom',suggestions:[]};
 const exact=crops.find(c=>normalise(c)===normalise(t));if(exact)return {status:'official',match:exact,suggestions:[]};
 const suggestions=searchCommodities(crops,t,5);const best=suggestions[0];
 if(best&&scoreCommodity(best,t)>=85)return {status:'alias',match:best,suggestions};
 return {status:'custom',suggestions};}
const RECENT='krishisetu-recent-crops-v1';
export function readRecent():string[]{try{const v=JSON.parse(localStorage.getItem(RECENT)||'[]');return Array.isArray(v)?v.filter((x):x is string=>typeof x==='string').slice(0,6):[];}catch{return [];}}
export function pushRecent(crop:string){try{localStorage.setItem(RECENT,JSON.stringify([crop,...readRecent().filter(x=>x!==crop)].slice(0,6)));}catch{/* storage unavailable */}}
type PC={recent:string;popular:string;browse:string;manual:string;manualHint:string;useCustom:string;didYouMean:string;official:string;alias:string;custom:string;noData:string;hasData:string;change:string;cats:Record<Category,string>};
const en:PC={recent:'Recently selected',popular:'Popular',browse:'Browse by category',manual:"Can't find your crop? Enter manually",manualHint:'Type your crop name in any language',useCustom:'Use "{x}" as my own crop',didYouMean:'Did you mean',official:'Official market name',alias:'Matched to official name',custom:'Your own crop — no official prices',noData:'No official market reports yet',hasData:'Official reports available',change:'Change crop',
 cats:{cereals:'Cereals',pulses:'Pulses',oilseeds:'Oilseeds',vegetables:'Vegetables',fruits:'Fruits',spices:'Spices',plantation:'Plantation',flowers:'Flowers',commercial:'Commercial',other:'Other produce'}};
const tr:Partial<Record<Language,Partial<PC>>>={
 kn:{recent:'ಇತ್ತೀಚೆಗೆ ಆಯ್ಕೆ',popular:'ಜನಪ್ರಿಯ',browse:'ವರ್ಗದ ಪ್ರಕಾರ ನೋಡಿ',manual:'ನಿಮ್ಮ ಬೆಳೆ ಸಿಗುತ್ತಿಲ್ಲವೇ? ಕೈಯಾರೆ ನಮೂದಿಸಿ',manualHint:'ಯಾವುದೇ ಭಾಷೆಯಲ್ಲಿ ಬೆಳೆಯ ಹೆಸರು ಬರೆಯಿರಿ',useCustom:'"{x}" ಅನ್ನು ನನ್ನ ಬೆಳೆಯಾಗಿ ಬಳಸಿ',didYouMean:'ನೀವು ಹುಡುಕುತ್ತಿರುವುದು',official:'ಅಧಿಕೃತ ಮಾರುಕಟ್ಟೆ ಹೆಸರು',alias:'ಅಧಿಕೃತ ಹೆಸರಿಗೆ ಹೊಂದಿಸಲಾಗಿದೆ',custom:'ನಿಮ್ಮ ಸ್ವಂತ ಬೆಳೆ — ಅಧಿಕೃತ ಬೆಲೆ ಇಲ್ಲ',noData:'ಅಧಿಕೃತ ವರದಿಗಳು ಇನ್ನೂ ಇಲ್ಲ',hasData:'ಅಧಿಕೃತ ವರದಿಗಳು ಲಭ್ಯ',change:'ಬೆಳೆ ಬದಲಿಸಿ',
  cats:{cereals:'ಧಾನ್ಯಗಳು',pulses:'ಬೇಳೆಕಾಳುಗಳು',oilseeds:'ಎಣ್ಣೆಕಾಳುಗಳು',vegetables:'ತರಕಾರಿಗಳು',fruits:'ಹಣ್ಣುಗಳು',spices:'ಸಾಂಬಾರು',plantation:'ತೋಟದ ಬೆಳೆಗಳು',flowers:'ಹೂವುಗಳು',commercial:'ವಾಣಿಜ್ಯ ಬೆಳೆಗಳು',other:'ಇತರೆ'}},
 hi:{recent:'हाल में चुनी',popular:'लोकप्रिय',browse:'श्रेणी से देखें',manual:'आपकी फसल नहीं मिली? खुद लिखें',manualHint:'किसी भी भाषा में फसल का नाम लिखें',useCustom:'"{x}" को अपनी फसल के रूप में रखें',didYouMean:'क्या आपका मतलब',official:'आधिकारिक मंडी नाम',alias:'आधिकारिक नाम से मिलाया',custom:'आपकी अपनी फसल — आधिकारिक भाव नहीं',noData:'अभी आधिकारिक रिपोर्ट नहीं',hasData:'आधिकारिक रिपोर्ट उपलब्ध',change:'फसल बदलें',
  cats:{cereals:'अनाज',pulses:'दालें',oilseeds:'तिलहन',vegetables:'सब्ज़ियाँ',fruits:'फल',spices:'मसाले',plantation:'बागान फसलें',flowers:'फूल',commercial:'नकदी फसलें',other:'अन्य उपज'}},
 te:{recent:'ఇటీవల ఎంచుకున్నవి',popular:'ప్రసిద్ధ',browse:'వర్గం వారీగా',manual:'మీ పంట కనిపించలేదా? స్వయంగా రాయండి',useCustom:'"{x}" ను నా పంటగా వాడండి',custom:'మీ సొంత పంట — అధికారిక ధరలు లేవు',
  cats:{cereals:'ధాన్యాలు',pulses:'పప్పుధాన్యాలు',oilseeds:'నూనెగింజలు',vegetables:'కూరగాయలు',fruits:'పండ్లు',spices:'సుగంధ ద్రవ్యాలు',plantation:'తోట పంటలు',flowers:'పూలు',commercial:'వాణిజ్య పంటలు',other:'ఇతర'}},
 ta:{recent:'சமீபத்தில் தேர்ந்தவை',popular:'பிரபலம்',browse:'வகைப்படி',manual:'உங்கள் பயிர் இல்லையா? நீங்களே எழுதுங்கள்',useCustom:'"{x}" ஐ என் பயிராகப் பயன்படுத்து',custom:'உங்கள் சொந்த பயிர் — அதிகாரப்பூர்வ விலை இல்லை',
  cats:{cereals:'தானியங்கள்',pulses:'பருப்புகள்',oilseeds:'எண்ணெய் வித்துகள்',vegetables:'காய்கறிகள்',fruits:'பழங்கள்',spices:'மசாலா',plantation:'தோட்டப் பயிர்கள்',flowers:'மலர்கள்',commercial:'வணிகப் பயிர்கள்',other:'பிற'}},
 ml:{recent:'അടുത്തിടെ തിരഞ്ഞെടുത്തവ',popular:'ജനപ്രിയം',browse:'വിഭാഗം അനുസരിച്ച്',manual:'നിങ്ങളുടെ വിള കാണുന്നില്ലേ? സ്വയം എഴുതുക',useCustom:'"{x}" എന്റെ വിളയായി ഉപയോഗിക്കുക',custom:'നിങ്ങളുടെ സ്വന്തം വിള — ഔദ്യോഗിക വില ഇല്ല',
  cats:{cereals:'ധാന്യങ്ങൾ',pulses:'പയറുവർഗങ്ങൾ',oilseeds:'എണ്ണക്കുരുക്കൾ',vegetables:'പച്ചക്കറികൾ',fruits:'പഴങ്ങൾ',spices:'സുഗന്ധവ്യഞ്ജനങ്ങൾ',plantation:'തോട്ടവിളകൾ',flowers:'പൂക്കൾ',commercial:'വാണിജ്യവിളകൾ',other:'മറ്റുള്ളവ'}},
 mr:{recent:'अलीकडे निवडलेली',popular:'लोकप्रिय',browse:'प्रकारानुसार',manual:'तुमचे पीक सापडत नाही? स्वतः लिहा',useCustom:'"{x}" माझे पीक म्हणून वापरा',custom:'तुमचे स्वतःचे पीक — अधिकृत दर नाहीत',
  cats:{cereals:'तृणधान्ये',pulses:'कडधान्ये',oilseeds:'तेलबिया',vegetables:'भाजीपाला',fruits:'फळे',spices:'मसाले',plantation:'बागायती पिके',flowers:'फुले',commercial:'नगदी पिके',other:'इतर'}},
};
export function pickerCopy(lang:Language):PC{const t=tr[lang]||{};return {...en,...t,cats:{...en.cats,...(t.cats||{})}};}
