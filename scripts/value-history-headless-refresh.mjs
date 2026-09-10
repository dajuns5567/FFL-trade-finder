import { chromium } from 'playwright';
import { getStore } from '@netlify/blobs';

const siteUrl=process.env.VALUE_HISTORY_SITE_URL||'https://subtle-genie-6167c5.netlify.app/';
const siteId=process.env.NETLIFY_SITE_ID||'0cc03543-09f9-4de9-9b52-6cbc4fbc4357';
const token=process.env.NETLIFY_BLOBS_TOKEN||process.env.NETLIFY_AUTH_TOKEN||'';
const maxRecentMs=Number(process.env.VALUE_HISTORY_RECENT_MS)||Math.round(2.75*60*60*1000);

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
if(latest&&latest.ageMs>=0&&latest.ageMs<maxRecentMs){
  console.log(JSON.stringify({ok:true,skipped:true,reason:'recent-value-history-observation',latest:latest.t,source:latest.source||null,ageMinutes:Math.round(latest.ageMs/60000)},null,2));
  process.exit(0);
}

const url=new URL(siteUrl);
url.searchParams.set('vh_source','scheduled');
url.searchParams.set('vh_ts',String(Date.now()));

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
  console.log(JSON.stringify({ok:true,skipped:false,site:url.origin,snapshot:result},null,2));
}finally{
  await browser.close();
}
