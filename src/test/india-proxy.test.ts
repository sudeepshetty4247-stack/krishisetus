import {describe,it,expect,beforeAll,afterAll} from 'vitest';
import http from 'node:http';
import type {AddressInfo} from 'node:net';
import {proxyPageUrl} from '@/lib/mandi-sync.server';

const TOKEN='t'.repeat(32);let upstreamCalls=0;let failNext=0;let base='';
let up:http.Server;let proxy:http.Server;
const rec=(i:number,date='13/11/2026')=>({state:'Karnataka',district:'Dharwad',market:`M${i}`,commodity:'Maize',variety:'Local',grade:'FAQ',arrival_date:date,min_price:'2000',max_price:'2400',modal_price:'2200'});
beforeAll(async()=>{
 up=http.createServer((req,res)=>{upstreamCalls++;const u=new URL(req.url!,'http://x');
  if(u.searchParams.get('api-key')!=='KEY'){res.writeHead(403);return res.end('{"error":"invalid key"}');}
  if(failNext>0){failNext--;res.writeHead(503);return res.end('busy');}
  const off=Number(u.searchParams.get('offset'));const lim=Number(u.searchParams.get('limit'));
  const all=[...Array.from({length:3},(_,i)=>rec(i)),rec(0),{...rec(9),modal_price:''}];
  res.writeHead(200,{"content-type":"application/json"});return res.end(JSON.stringify({total:all.length,records:all.slice(off,off+lim)}));});
 await new Promise<void>(r=>up.listen(0,r));
 Object.assign(process.env,{UPSTREAM_BASE:`http://127.0.0.1:${(up.address() as AddressInfo).port}`,DATA_GOV_IN_API_KEY:'KEY',PROXY_TOKEN:TOKEN,UPSTREAM_ATTEMPTS:'3',CACHE_TTL_MS:'60000'});
 // @ts-expect-error plain JS module outside the app
 const m=await import('../../india-proxy/server.mjs');proxy=m.server;
 await new Promise<void>(r=>proxy.listen(0,r));base=`http://127.0.0.1:${(proxy.address() as AddressInfo).port}`;
});
afterAll(()=>{up.close();proxy.close();});
const get=(p:string,auth=true)=>fetch(base+p,{headers:auth?{authorization:`Bearer ${TOKEN}`}:{}});

describe('India mandi proxy',()=>{
 it('health is public and never reveals the key',async()=>{const r=await get('/health',false);const t=await r.text();expect(r.status).toBe(200);expect(t).not.toContain('KEY"');expect(JSON.parse(t).configured).toBe(true);});
 it('rejects price requests without the token',async()=>{expect((await get('/v1/mandi',false)).status).toBe(401);});
 it('validates, de-duplicates and paginates without inventing prices',async()=>{
  const d=await (await get('/v1/mandi?offset=0&limit=1000')).json();
  expect(d.received).toBe(5);expect(d.records).toHaveLength(3);expect(d.duplicates).toBe(1);expect(d.rejected).toBe(1);
  expect(d.records[0]).toMatchObject({date:'2026-11-13',state:'Karnataka',district:'Dharwad',market:'M0',commodity:'Maize',variety:'Local',min_price:2000,max_price:2400,modal_price:2200});
  expect(d.next_offset).toBe(0);
  const p=await (await get('/v1/mandi?offset=2&limit=2')).json();expect(p.received).toBe(2);expect(p.next_offset).toBe(4);
 });
 it('serves repeat requests from cache',async()=>{const before=upstreamCalls;const d=await (await get('/v1/mandi?offset=0&limit=1000')).json();expect(d.cached).toBe(true);expect(upstreamCalls).toBe(before);});
 it('retries temporary upstream failures then recovers',async()=>{failNext=2;const r=await get('/v1/mandi?offset=1&limit=1');expect(r.status).toBe(200);},15000);
 it('reports upstream failure honestly',async()=>{failNext=5;const r=await get('/v1/mandi?offset=3&limit=1');expect(r.status).toBe(502);expect((await r.json()).error).toContain('503');},15000);
 it('app builds bounded page URLs for the proxy',()=>{expect(proxyPageUrl('https://p.example/',2000)).toBe('https://p.example/v1/mandi?limit=1000&offset=2000');});
});
