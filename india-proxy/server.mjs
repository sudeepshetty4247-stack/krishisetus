// KRISHISETU India-hosted mandi price proxy (designed for AWS Mumbai, ap-south-1).
// Zero dependencies, Node 20+. Forwards ONE page of data.gov.in resource 9ef84268 per request,
// adding the government API key server-side. Records are validated; nothing is invented.
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 8080);
const KEY = process.env.DATA_GOV_IN_API_KEY || '';
const TOKEN = process.env.PROXY_TOKEN || '';
const UPSTREAM = (process.env.UPSTREAM_BASE || 'https://api.data.gov.in').replace(/\/$/, '');
const RESOURCE = '9ef84268-d588-465a-a308-a864a43d0070';
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS || 15000);
const ATTEMPTS = Number(process.env.UPSTREAM_ATTEMPTS || 3);
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 60000);
const MAX_LIMIT = 1000;

const cache = new Map(); // key -> {at, body}
const stats = { started: new Date().toISOString(), lastSuccess: null, lastError: null, lastErrorAt: null, lastTotal: null, upstreamCalls: 0, cacheHits: 0 };

export function toIso(v) { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v ?? '').trim()); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; }
const txt = v => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s && s.length <= 200 ? s : null; };
const num = v => { if (v === null || v === undefined || String(v).trim() === '') return null; const n = Number(v); return Number.isFinite(n) && n > 0 && n < 1e9 ? n : null; };

// Returns a normalized record or null. Missing required fields reject the row; nothing is filled in.
export function normalise(r) {
  const date = toIso(r.arrival_date ?? r.Arrival_Date);
  const rec = { date, state: txt(r.state ?? r.State), district: txt(r.district ?? r.District), market: txt(r.market ?? r.Market),
    commodity: txt(r.commodity ?? r.Commodity), variety: txt(r.variety ?? r.Variety) ?? '', grade: txt(r.grade ?? r.Grade) ?? '',
    min_price: num(r.min_price ?? r.Min_Price), max_price: num(r.max_price ?? r.Max_Price), modal_price: num(r.modal_price ?? r.Modal_Price) };
  if (!rec.date || !rec.state || !rec.district || !rec.market || !rec.commodity || rec.modal_price === null) return null;
  rec.id = crypto.createHash('sha256').update(JSON.stringify([rec.state, rec.district, rec.market, rec.commodity, rec.variety, rec.grade, rec.date])).digest('hex').slice(0, 32);
  return rec;
}

async function upstream(offset, limit, filters) {
  const u = new URL(`${UPSTREAM}/resource/${RESOURCE}`);
  u.searchParams.set('api-key', KEY); u.searchParams.set('format', 'json');
  u.searchParams.set('limit', String(limit)); u.searchParams.set('offset', String(offset));
  for (const [k, v] of Object.entries(filters)) u.searchParams.set(`filters[${k}]`, v);
  let last = '';
  for (let a = 0; a < ATTEMPTS; a++) {
    stats.upstreamCalls++;
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: 'application/json' } });
      const body = await res.text();
      if (res.ok) { const d = JSON.parse(body); if (!Array.isArray(d.records)) throw new Error('upstream response has no records array'); return d; }
      last = `upstream HTTP ${res.status}: ${body.slice(0, 200).replaceAll(KEY, '***')}`;
      if (res.status !== 429 && res.status < 500) break;
    } catch (e) { last = `upstream ${e?.name === 'TimeoutError' ? 'timeout' : 'error'}: ${String(e?.cause?.code || e?.message || e).replaceAll(KEY, '***')}`; }
    if (a < ATTEMPTS - 1) await new Promise(r => setTimeout(r, 1000 * 2 ** a));
  }
  throw new Error(last || 'upstream failed');
}

const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
const authorised = req => { const h = String(req.headers.authorization || ''); const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  return TOKEN.length >= 24 && t.length === TOKEN.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(TOKEN)); };

export const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://local');
  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true, configured: !!KEY && TOKEN.length >= 24, region: process.env.AWS_REGION || null, ...stats });
  if (req.method === 'GET' && url.pathname === '/health/upstream') {
    if (!authorised(req)) return send(res, 401, { error: 'unauthorised' });
    const t0 = Date.now();
    try { const d = await upstream(0, 1, {}); return send(res, 200, { ok: true, latency_ms: Date.now() - t0, total: Number(d.total) || 0, updated: d.updated_date ?? null }); }
    catch (e) { return send(res, 502, { ok: false, latency_ms: Date.now() - t0, error: e.message }); }
  }
  if (req.method === 'GET' && url.pathname === '/v1/mandi') {
    if (!authorised(req)) return send(res, 401, { error: 'unauthorised' });
    if (!KEY) return send(res, 503, { error: 'DATA_GOV_IN_API_KEY not configured on proxy' });
    const offset = Math.max(0, Math.floor(Number(url.searchParams.get('offset') || 0)) || 0);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(url.searchParams.get('limit') || MAX_LIMIT)) || MAX_LIMIT));
    const filters = {};
    for (const f of ['state', 'district', 'market', 'commodity', 'arrival_date']) { const v = url.searchParams.get(f); if (v) { if (v.length > 100) return send(res, 400, { error: `${f} too long` }); filters[f] = v; } }
    const ck = JSON.stringify([offset, limit, filters]); const hit = cache.get(ck);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) { stats.cacheHits++; return send(res, 200, { ...hit.body, cached: true }); }
    try {
      const d = await upstream(offset, limit, filters);
      const raw = d.records; const records = []; const seen = new Set(); let rejected = 0, duplicates = 0;
      for (const r of raw) { const n = normalise(r); if (!n) { rejected++; continue; } if (seen.has(n.id)) { duplicates++; continue; } seen.add(n.id); records.push(n); }
      const total = Number(d.total) || 0;
      const body = { source: 'data.gov.in', resource: RESOURCE, retrieved_at: new Date().toISOString(), upstream_updated: d.updated_date ?? null,
        offset, limit, received: raw.length, total, next_offset: raw.length === 0 || offset + raw.length >= total ? 0 : offset + raw.length,
        rejected, duplicates, latest_date: records.reduce((m, r) => (r.date > m ? r.date : m), '') || null, records };
      cache.set(ck, { at: Date.now(), body }); if (cache.size > 200) cache.delete(cache.keys().next().value);
      stats.lastSuccess = body.retrieved_at; stats.lastTotal = total;
      return send(res, 200, { ...body, cached: false });
    } catch (e) { stats.lastError = e.message; stats.lastErrorAt = new Date().toISOString(); console.error(stats.lastErrorAt, e.message); return send(res, 502, { error: e.message }); }
  }
  send(res, 404, { error: 'not found' });
});

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) server.listen(PORT, () => console.log(`krishisetu india proxy on :${PORT}`));
