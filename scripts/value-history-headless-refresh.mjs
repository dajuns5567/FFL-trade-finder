import { chromium } from 'playwright';
import { getStore } from '@netlify/blobs';

const siteUrl=String(process.env.VALUE_HISTORY_SITE_URL||'').trim();
const siteId=String(process.env.NETLIFY_SITE_ID||'').trim();
const token=process.env.NETLIFY_BLOBS_TOKEN||process.env.NETLIFY_AUTH_TOKEN||'';
const maxRecentMs=Number(process.env.VALUE_HISTORY_RECENT_MS)||Math.round(2.75*60*60*1000);

if(!siteUrl)throw new Error('VALUE_HISTORY_SITE_URL is required; resolve the active Netlify production site first');
if(!siteId)throw new Error('NETLIFY_SITE_ID is required; resolve the active Netlify production site first');

async function recentLiveSnapshot(){
  if(!token)return null;
  try{
    const store=getStore({name:'fll-value-history-v2',siteID:siteId,token,consistency:'strong'});
    const latest=await store.get('latest.json',{type:'json'});
    const ms=new Date(latest?.t||'').getTime();
    return Number.isFinite(ms)?{...latest,ageMs:Date.now()-ms}:null;
  }catch(e){
    console.warn('Could not read live Value History freshness; scheduled browser load will continue.',String(e?.message||e));
    return null;
  }
}

const latest=await recentLiveSnapshot();
// A recent page-load/manual observation must NOT suppress the scheduled series.
// Only skip an immediate duplicate when the latest observation itself was scheduled.
if(latest&&latest.source==='scheduled'&&latest.ageMs>=0&&latest.ageMs<maxRecentMs){
  console.log(JSON.stringify({ok:true,skipped:true,reason:'recent-scheduled-value-history-observation',site:new URL(siteUrl).origin,siteId,latest:latest.t,source:latest.source,ageMinutes:Math.round(latest.ageMs/60000)},null,2));
  process.exit(0);
}

const url=new URL(siteUrl);
url.searchParams.set('vh_source','scheduled');
url.searchParams.set('vh_ts',String(Date.now()));

console.log(JSON.stringify({event:'scheduled-refresh-target',site:url.origin,siteId},null,2));
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  page.on('console',msg=>{if(['error','warning'].includes(msg.type()))console.log(`browser-${msg.type()}:`,msg.text())});
  page.on('pageerror',err=>console.log('browser-pageerror:',String(err?.message||err)));
  const response=await page.goto(url.toString(),{waitUntil:'domcontentloaded',timeout:120000});
  if(!response||!response.ok())throw new Error(`Production site load failed: ${response?.status()||'no response'}`);
  await page.waitForFunction(()=>window.__vhLastSnapshot?.ok===true,{timeout:180000});
  const result=await page.evaluate(()=>window.__vhLastSnapshot);
  if(result?.source!=='scheduled')throw new Error(`Unexpected snapshot source: ${result?.source||'missing'}`);
  console.log(JSON.stringify({ok:true,skipped:false,site:url.origin,siteId,snapshot:result},null,2));
}finally{
  await browser.close();
}
