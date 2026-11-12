import Papa from 'papaparse';

export const markets = ['Dharwad APMC', 'Hubballi (Amargol) APMC', 'Annigeri APMC', 'Kalghatagi APMC', 'Kundgol APMC'];
export type PriceRecord = { market: string; commodity: string; date: string; min: number; max: number; modal: number; source: string; retrieved: string; variety: string; arrivals?: number | undefined };
export function netValue(price: number, quantity: number, transport: number, handling: number, other: number) {
  if (![price, quantity, transport, handling, other].every(Number.isFinite) || price <= 0 || quantity <= 0 || Math.min(transport, handling, other) < 0) throw new Error('Invalid price, quantity or expenses');
  return price * quantity - transport - handling - other;
}
export function parseMarketCsv(text: string, source: string) {
  if (!source.trim()) throw new Error('Enter the original source name or URL.');
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().toLowerCase().replace(/[\s-]+/g, '_') });
  if (result.errors.length) throw new Error('The CSV could not be read. Check its columns and formatting.');
  const records: PriceRecord[] = []; let rejected = 0; let duplicates = 0;
  const keys = new Set<string>();
  for (const r of result.data) {
    const rawMarket = (r['market'] || '').toLowerCase();
    const market = markets.find(m => rawMarket.includes((m.split(' ')[0] || '').toLowerCase()) || (m.startsWith('Hubballi') && /hubli|amargol/.test(rawMarket)));
    const commodity = /maize|corn/i.test(r['commodity'] || '') ? 'Maize' : /bengal\s*gram|chana/i.test(r['commodity'] || '') ? 'Bengal gram' : '';
    const rawDate = r['arrival_date'] || r['date'] || r['reporting_date'] || '';
    const dayFirst = rawDate.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
    const date = dayFirst ? `${dayFirst[3]}-${dayFirst[2]}-${dayFirst[1]}` : rawDate;
    const min = Number(r['min_price'] || r['minimum_price']), max = Number(r['max_price'] || r['maximum_price']), modal = Number(r['modal_price']);
    const units = (r['price_unit'] || r['units'] || '').toLowerCase();
    if (!market || !commodity || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > new Date().toISOString().slice(0, 10) || ![min,max,modal].every(n => Number.isFinite(n) && n > 0) || min > modal || modal > max || !/^(rs|inr|₹)\s*\/\s*(quintal|qtl)$/i.test(units)) { rejected++; continue; }
    const variety = r['variety'] || 'Not specified';
    const key = `${market}|${commodity}|${date}|${variety}`;
    if (keys.has(key)) { duplicates++; continue; } keys.add(key);
    const arrivals = r['arrivals'] ? Number(r['arrivals']) : undefined;
    records.push({market, commodity, date, min, max, modal, variety, source: source.trim(), retrieved: new Date().toISOString(), arrivals: arrivals !== undefined && Number.isFinite(arrivals) && arrivals >= 0 ? arrivals : undefined});
  }
  if (!records.length) throw new Error('No valid records. Use the template, supported markets and INR/quintal prices.');
  return { records, rejected, duplicates };
}
export function comparableRecords(records: PriceRecord[], commodity: string) {
  const filtered = records.filter(r => r['commodity'] === commodity);
  const date = filtered.map(r => r['date']).sort().at(-1);
  const atDate = filtered.filter(r => r['date'] === date);
  const variety = atDate.find(r => r['market'] === markets[0])?.variety || atDate[0]?.variety;
  return atDate.filter(r => r['variety'] === variety);
}