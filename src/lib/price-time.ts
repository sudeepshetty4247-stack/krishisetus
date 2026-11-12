export function istTimestamp(value:string|null|undefined){
 if(!value||!Number.isFinite(Date.parse(value)))return '—';
 return new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(value))+' IST';
}
export function reportedDate(value:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return '—';
 return new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric'}).format(new Date(value+'T00:00:00+05:30'));
}
export function ageInIST(value:string,now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 return Math.max(0,Math.round((Date.parse(today+'T00:00:00Z')-Date.parse(value+'T00:00:00Z'))/86400000));
}export type Freshness='latest'|'recent'|'older'|'historical';
// Labels are derived only from the market reporting date (IST calendar days), never from retrieval time.
export function freshness(date:string,now=new Date()):Freshness{const d=ageInIST(date,now);return d<=1?'latest':d<=7?'recent':d<=60?'older':'historical';}
export const freshnessText:Record<string,Record<Freshness,string>>={
 en:{latest:'Latest available report',recent:'Updated recently',older:'Older report',historical:'Historical record'},
 kn:{latest:'ಇತ್ತೀಚಿನ ಲಭ್ಯ ವರದಿ',recent:'ಇತ್ತೀಚೆಗೆ ನವೀಕರಿಸಲಾಗಿದೆ',older:'ಹಳೆಯ ವರದಿ',historical:'ಐತಿಹಾಸಿಕ ದಾಖಲೆ'},
 hi:{latest:'नवीनतम उपलब्ध रिपोर्ट',recent:'हाल ही में अपडेट',older:'पुरानी रिपोर्ट',historical:'ऐतिहासिक रिकॉर्ड'},
 te:{latest:'తాజా అందుబాటులో ఉన్న నివేదిక',recent:'ఇటీవల నవీకరించబడింది',older:'పాత నివేదిక',historical:'చారిత్రక రికార్డు'},
 ta:{latest:'கிடைக்கும் சமீபத்திய அறிக்கை',recent:'சமீபத்தில் புதுப்பிக்கப்பட்டது',older:'பழைய அறிக்கை',historical:'வரலாற்றுப் பதிவு'},
 ml:{latest:'ലഭ്യമായ ഏറ്റവും പുതിയ റിപ്പോർട്ട്',recent:'അടുത്തിടെ പുതുക്കിയത്',older:'പഴയ റിപ്പോർട്ട്',historical:'ചരിത്ര രേഖ'},
 mr:{latest:'नवीनतम उपलब्ध अहवाल',recent:'अलीकडे अद्ययावत',older:'जुना अहवाल',historical:'ऐतिहासिक नोंद'},
};
