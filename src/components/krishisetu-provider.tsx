import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { dictionary, languages, type Language } from '@/lib/translations';
import type { PriceRecord } from '@/lib/market-data';
const Context = createContext<ReturnType<typeof useStateData> | null>(null);
function useStateData() {
  const [lang, setLang] = useState<Language>('kn'); const [records, setRecords] = useState<PriceRecord[]>([]); const [audit, setAudit] = useState({ rejected: 0, duplicates: 0 }); const [crop, setCrop] = useState('Maize');
  useEffect(() => { const saved = localStorage.getItem('krishisetu-language'); if (saved && saved in languages) setLang(saved as Language); }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  function changeLanguage(value: Language) { setLang(value); localStorage.setItem('krishisetu-language', value); }
  return {lang, changeLanguage, t: dictionary(lang), records, setRecords, audit, setAudit, crop, setCrop};
}
export function KrishisetuProvider({ children }: { children: ReactNode }) { const value = useStateData(); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useKrishi() { const value = useContext(Context); if (!value) throw new Error('Missing KrishisetuProvider'); return value; }