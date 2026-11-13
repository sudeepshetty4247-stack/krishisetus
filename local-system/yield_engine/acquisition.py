"""Verified official DES browser reports and IMD yearly grid downloads."""
import hashlib,json,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import requests
BASE='https://www.imdpune.gov.in/cmpg/Griddata/'
def digest(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()
def download_grid(root,year,kind):
    root=Path(root);root.mkdir(parents=True,exist_ok=True)
    endpoint,field,ext={'rain':('RF25.php','RF25','nc'),'tmax':('maxtemp.php','maxtemp','grd'),'tmin':('mintemp.php','mintemp','grd')}[kind]
    path=root/f'{kind}-{year}.{ext}'
    if path.exists() and path.stat().st_size>100000:return path
    for attempt in range(3):
        try:
            r=requests.post(BASE+endpoint,data={field:str(year)},timeout=(15,90));r.raise_for_status()
            if len(r.content)<100000 or (kind=='rain' and r.content[:3]!=b'CDF'):raise ValueError('Not a verified grid download')
            tmp=path.with_suffix('.part');tmp.write_bytes(r.content);tmp.replace(path);return path
        except (requests.RequestException,ValueError):
            if attempt==2:raise
            time.sleep(2**attempt)
def download_environment(root,start,end):
    jobs=[(y,k) for y in range(start,end+1) for k in ('rain','tmax','tmin')]
    def work(job):
        y,k=job
        try:p=download_grid(root,y,k);print(y,k,p.stat().st_size,flush=True);return {'year':y,'kind':k,'file':p.name,'sha256':digest(p),'bytes':p.stat().st_size}
        except Exception as e:print(y,k,type(e).__name__,flush=True);return {'year':y,'kind':k,'error':type(e).__name__}
    with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(work,jobs))
    Path(root,'downloads.json').write_text(json.dumps(results,indent=2));return results
async def acquire_production(root):
    """Requires optional playwright+Chromium on acquisition workstation, not hosted service."""
    from playwright.async_api import async_playwright
    from urllib.parse import urlencode
    root=Path(root);root.mkdir(parents=True,exist_ok=True)
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True)
        page=await browser.new_page();await page.goto('https://data.desagri.gov.in/website/crops-apy-report-web')
        token=await page.locator('input[name=_token]').first.input_value()
        states=await page.locator('#fltrstates option').evaluate_all('(es)=>es.filter(e=>e.value).map(e=>({id:e.value,name:e.text}))')
        crops=await page.locator('#fltrcrops option').evaluate_all('(es)=>es.filter(e=>e.value).map(e=>({id:e.value,name:e.text}))')
        (root/'catalogue.json').write_text(json.dumps({'states':states,'crops':crops},indent=2))
        for st in states:
            pairs=[('reportformat','horizontal_crop_vertical_year'),('fltrstates[]',st['id']),('fltrdistricts[]','all'),('fltrstartyear','1997'),('fltrendyear','2022'),('fltrrptformat','scrview'),('_token',token)]+[('fltrcrops[]',c['id']) for c in crops]+[('fltrseason[]',s) for s in ['K','R','A','W','S','Y']]
            result=await page.evaluate("async body=>{const r=await fetch('/report/crop/horizontal_crop_vertical_year',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});return {status:r.status,text:await r.text()}}",urlencode(pairs))
            if result['status']!=200:raise ValueError('Official report request failed')
            # CSRF tokens and cookies are never saved; only report tables are retained.
            from bs4 import BeautifulSoup
            table=BeautifulSoup(result['text'],'lxml').find('table',id='apyreport')
            (root/(st['id']+'.html')).write_text(str(table) if table else '<!-- No published observations -->')
        await browser.close()
