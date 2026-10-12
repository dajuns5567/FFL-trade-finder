import { chromium } from 'playwright-core';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {trustedServerRequest} from '../netlify/functions/privileged-write.mjs';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import siteV29 from '../netlify/functions/site-v29.mjs';
import updateHandler from '../netlify/functions/update.mjs';
import picksHandler from '../netlify/functions/picks.mjs';
import leagueHub from '../netlify/functions/league-hub.mjs';
import valueHistoryHandler from '../netlify/functions/value-history.mjs';

const snapshotFile=process.env.VALUE_HISTORY_SNAPSHOT_FILE||'.tmp/value-history-scheduled.json';
const SCHEDULED_VALUATION_CONTRACT='precision-idp-runtime-20260919';
const league='1316867686394769408';

function fingerprint(rows,picks=[],teams=[]){
  let h=2166136261;
  for(const r of rows){const x=`${r.id}:${r.value}:${r.overall}:${r.posRank}|`;for(let i=0;i<x.length;i++){h^=x.charCodeAt(i);h=Math.imul(h,16777619)}}
  for(const p of picks){const x=`P:${p.id}:${p.value}:${p.season}:${p.round}:${p.original_owner}|`;for(let i=0;i<x.length;i++){h^=x.charCodeAt(i);h=Math.imul(h,16777619)}}
  for(const t of teams){const x=`T:${t.id}:${t.value}:${t.player_count}|`;for(let i=0;i<x.length;i++){h^=x.charCodeAt(i);h=Math.imul(h,16777619)}}
  return (h>>>0).toString(36);
}
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function mime(path){return ({'.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'}[extname(path).toLowerCase()]||'application/octet-stream')}
async function body(req){const chunks=[];for await(const c of req)chunks.push(c);return Buffer.concat(chunks)}
async function requestFromNode(req,origin){
  const raw=await body(req),headers=new Headers();
  for(const [k,v] of Object.entries(req.headers))if(v!=null)headers.set(k,Array.isArray(v)?v.join(', '):String(v));
  const init={method:req.method||'GET',headers};
  if(raw.length&&req.method!=='GET'&&req.method!=='HEAD')init.body=raw;
  return new Request(new URL(req.url||'/',origin),init);
}
async function send(res,response){
  res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));
  const bytes=Buffer.from(await response.arrayBuffer());res.end(bytes);
}
function historyReadStub(url){
  if(url.searchParams.get('market')==='1')return json({tracking_since:null,latest:null,snapshot_count:0,periods:{'1D':{},'7D':{},'30D':{},'90D':{},'1Y':{},'ALL':{}},marketRows:[]});
  if(url.searchParams.get('health')==='1')return json({ok:true,source:'scheduled-local-runtime',components:{githubArchive:{reachable:true},netlifyLive:{reachable:false}}});
  if(url.searchParams.get('team_net')==='1')return json({points:[],source:'scheduled-local-runtime'});
  if(url.searchParams.get('trades')==='1')return valueHistoryHandler(new Request(url.toString()));
  return json({points:[],source:'scheduled-local-runtime'});
}
async function valueHistory(req,{maintainAwards=false}={}){
  const url=new URL(req.url);
  if(req.method!=='POST')return maintainAwards&&url.searchParams.get('trades')==='1'?valueHistoryHandler(req):historyReadStub(url);
  let payload={};try{payload=await req.json()}catch{return json({ok:false,error:'Invalid JSON'},400)}
  const rows=Array.isArray(payload.rows)?payload.rows:[],picks=Array.isArray(payload.picks)?payload.picks:[],teams=Array.isArray(payload.teams)?payload.teams:[];
  if(String(payload.league)!==league||rows.length<100)return json({ok:false,error:'Scheduled snapshot payload incomplete'},400);
  if(payload.source!=='scheduled')return json({ok:false,error:'Scheduled local collector only accepts source=scheduled'},400);
  const t=new Date().toISOString(),fp=fingerprint(rows,picks,teams);
  const snap={version:5,league,t,fingerprint:fp,source:'scheduled',valuation_contract:SCHEDULED_VALUATION_CONTRACT,rows,picks,teams};
  // The local sink never writes to persistent storage.
  return json({ok:true,t,fingerprint:fp,source:'scheduled',count:rows.length});
}
async function genericFunction(name,req,{promoteConsensus=false,maintainAwards=false,update=updateHandler,deploymentContext=null}={}){
 if(name==='update')return update(promoteConsensus?trustedServerRequest(req.url,{method:req.method,headers:req.headers,body:await req.text()},deploymentContext):req);
 if(name==='picks')return picksHandler(req);
 const params=new URL(req.url).searchParams;
 if(name==='league-hub'&&req.method==='GET'&&params.get('managers')==='1')return json({current:[],graveyard:[],career:[],snapshot_only:true});
 if(name==='league-hub'&&req.method==='GET'&&!maintainAwards&&['awards','award_highs','draft_records'].some(k=>params.get(k)==='1'))return json({records:[],history:[]});
 if(name==='league-hub'){
  const keys=[...params.keys()],allowed=keys.length===1&&['awards','award_highs','draft_records'].includes(keys[0])&&params.get(keys[0])==='1';
  if(!maintainAwards&&req.method==='POST'&&allowed){const body=await req.json().catch(()=>({}));return json({ok:true,records:body.records||[],history:[]})}
  return leagueHub(maintainAwards&&req.method==='POST'&&allowed?trustedServerRequest(req.url,{method:req.method,headers:req.headers,body:await req.text()},deploymentContext):req);
 }
 const safe=String(name||'').replace(/[^a-zA-Z0-9_-]/g,'');
 if(!safe)return json({ok:false,error:'Unknown function'},404);
 try{const mod=await import(pathToFileURL(join(process.cwd(),'netlify/functions',safe+'.mjs')).href);return mod.default(req)}
 catch(e){console.warn('local-function-fallback',safe,String(e?.message||e));return json({ok:false,error:`Local function unavailable: ${safe}`},404)}
}
async function proxySleeperData(url){
  const suffix=url.pathname.replace(/^\/sleeper-data\//,'');
  const target=`https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/sleeper-data/data/sleeper/${suffix}${url.search}`;
  const r=await fetch(target,{headers:{'user-agent':'Fleeced-Scheduled-Local-Runtime/1.0',accept:'application/json'},cache:'no-store'});
  const bytes=Buffer.from(await r.arrayBuffer());
  const headers=new Headers({'content-type':r.headers.get('content-type')||'application/json; charset=utf-8','cache-control':'no-store'});
  const etag=r.headers.get('etag');if(etag)headers.set('etag',etag);
  const modified=r.headers.get('last-modified');if(modified)headers.set('last-modified',modified);
  return new Response(bytes,{status:r.status,headers});
}
function staticResponse(pathname){
  let rel=decodeURIComponent(pathname).replace(/^\/+/, '');
  if(!rel||rel.includes('..')||(rel.includes('/')&&!rel.startsWith('data/'))||!['.js','.css','.svg','.png','.jpg','.jpeg','.webp','.ico'].includes(extname(rel).toLowerCase()))return null;
  const path=normalize(join(process.cwd(),rel));
  if(!path.startsWith(process.cwd()))return null;
  try{if(!statSync(path).isFile())return null;return new Response(readFileSync(path),{headers:{'content-type':mime(path),'cache-control':'no-store'}})}catch{return null}
}

async function isolatedCollectorPage(){
 const response=await siteV29(),html=await response.text(),hashes=[];
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi))if(!/\bsrc\s*=/i.test(match[1]))hashes.push("'sha256-"+createHash('sha256').update(match[2]).digest('base64')+"'");
 const headers=new Headers(response.headers);
 headers.set('content-security-policy',"default-src 'none'; script-src 'self' "+hashes.join(' ')+"; connect-src 'self' https://api.sleeper.app https://api.sleeper.com https://raw.githubusercontent.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
 return new Response(html,{status:response.status,headers});
}

export async function collectCanonicalSnapshot({launch=()=>chromium.launch({headless:true}),persistLocal=true,promoteConsensus=false,maintainAwards=false,update=updateHandler,deploymentContext=null,isolationProbe=false}={}){
const server=createServer(async(req,res)=>{
  try{
    const origin=`http://127.0.0.1:${server.address()?.port||0}`,url=new URL(req.url||'/',origin);
    let response;
    if(url.pathname==='/'||url.pathname==='/.netlify/functions/site-v29')response=await isolatedCollectorPage();
    else if(url.pathname==='/api/update')response=await genericFunction('update',await requestFromNode(req,origin),{promoteConsensus,maintainAwards,update,deploymentContext});
    else if(url.pathname==='/api/picks')response=await picksHandler(await requestFromNode(req,origin));
    else if(url.pathname==='/.netlify/functions/value-history')response=await valueHistory(await requestFromNode(req,origin),{maintainAwards});
    else if(url.pathname==='/.netlify/functions/value-history-capture-background')response=json({ok:true,collector:true},202);
    else if(url.pathname.startsWith('/.netlify/functions/'))response=await genericFunction(url.pathname.split('/').pop(),await requestFromNode(req,origin),{promoteConsensus,maintainAwards,update,deploymentContext});
    else if(url.pathname.startsWith('/sleeper-data/'))response=await proxySleeperData(url);
    else response=staticResponse(url.pathname)||new Response('Not found',{status:404});
    await send(res,response);
  }catch(e){
    console.error('local-runtime-request-error',req.url,String(e?.stack||e));
    res.statusCode=500;res.end('local runtime error');
  }
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
const port=server.address().port,siteUrl=`http://127.0.0.1:${port}/`;
let browser;
try{
for(const required of ['offense-history.json']){
  const r=await fetch(`${siteUrl}sleeper-data/${required}?preflight=${Date.now()}`,{cache:'no-store'});
  if(!r.ok)throw new Error(`Required Sleeper artifact ${required} failed local proxy preflight: ${r.status}`);
  const j=await r.json();
  if(!j||typeof j!=='object'||j.ok!==true)throw new Error(`Required Sleeper artifact ${required} failed JSON validation`);
}
const url=new URL(siteUrl);url.searchParams.set('vh_source','scheduled');url.searchParams.set('vh_ts',String(Date.now()));
console.log(JSON.stringify({event:'scheduled-refresh-target',runtime:promoteConsensus?'netlify-isolated-server':'github-main-local',site:url.origin,commit:process.env.GITHUB_SHA||null},null,2));

browser=await launch();
  const page=await browser.newPage();
  for(const hostname of ['api.sleeper.app','api.sleeper.com'])await page.route('https://'+hostname+'/**',async route=>{
   try{const response=await fetch(route.request().url(),{signal:AbortSignal.timeout(60000)});await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())})}catch{await route.abort('failed')}
  });
  if(maintainAwards)await page.addInitScript(()=>{window.__fllTrustedCollector=true});
  const awardPosts=new Map();
  page.on('request',request=>{
   if(request.method()!=='POST'||!request.url().includes('/.netlify/functions/league-hub?'))return;
   try{const u=new URL(request.url()),key=['award_highs','draft_records','awards'].find(x=>u.searchParams.get(x)==='1');if(key){const body=request.postDataJSON();if(body&&typeof body==='object')awardPosts.set(key,body)}}catch{}
  });
  const pageErrors=[];
  const failedRequests=[];
  page.setDefaultTimeout(240000);
  page.on('console',msg=>{if(['error','warning'].includes(msg.type()))console.log(`browser-${msg.type()}:`,msg.text())});
  page.on('pageerror',err=>{pageErrors.push(String(err?.stack||err?.message||err));console.log('browser-pageerror:',String(err?.stack||err?.message||err))});
  page.on('requestfailed',req=>{const row={url:req.url(),failure:req.failure()?.errorText||'unknown'};failedRequests.push(row);console.log('browser-requestfailed:',JSON.stringify(row))});
  page.on('response',res=>{if(res.status()>=400)console.log('browser-http-error:',res.status(),res.url())});

  const response=await page.goto(url.toString(),{waitUntil:'domcontentloaded',timeout:120000});
  if(!response||!response.ok())throw new Error(`Local Fleeced load failed: ${response?.status()||'no response'}`);
  if(isolationProbe){
   await page.evaluate(()=>{const image=document.createElement('img');image.setAttribute('onerror','window.__collectorInjectedCodeRan=true');image.src='/__collector-isolation-missing__.png';image.hidden=true;document.body.appendChild(image)});
   await page.waitForTimeout(500);
   if(await page.evaluate(()=>window.__collectorInjectedCodeRan===true))throw new Error('Untrusted inline event handler executed inside trusted collector');
  }

  try{
    await page.waitForFunction(()=>{
      try{window.fllStateBridgeV141?.syncState?.()}catch{}
      const players=window.state?.players||{};
      const sleeper=window.state?.sleeperHistory;
      const consensus=window.__fllConsensusRefresh;
      const refresh=window.__fllValueRefresh;
      const modeled=window.modeledPlayerValuesV319;
      const vh=window.valueHistoryV331;
      const status=String(document.getElementById('updateStatus')?.textContent||'').toLowerCase();
      const busy=/loading|updating|refreshing/.test(status);
      return Object.keys(players).length>=700&&sleeper?.complete===true&&consensus?.complete===true&&consensus?.ok===true&&Number(consensus?.successful)>=7&&refresh?.inFlight===false&&refresh?.phase==='complete'&&modeled?.ready===true&&!busy&&typeof vh?.currentRows==='function';
    },null,{timeout:240000});
  }catch(e){
    const readiness=await page.evaluate(()=>{
      try{window.fllStateBridgeV141?.syncState?.()}catch{}
      const rankings=window.state?.rankings||{};
      return {
        players:Object.keys(window.state?.players||{}).length,
        sleeperComplete:window.state?.sleeperHistory?.complete===true,
        sleeperSource:window.state?.sleeperHistory?.source||null,
        consensusMarker:window.__fllConsensusRefresh||null,
        valueRefresh:window.__fllValueRefresh||null,
        modeledReady:window.modeledPlayerValuesV319?.ready===true,
        modeledMeta:window.modeledPlayerValuesV319?.meta||null,
        modeledVersion:Number(window.modeledPlayerValuesV319?.meta?.version)||0,
        consensusSources:Object.values(rankings).filter(src=>(Number(src?.playerCount)||Object.keys(src?.data||{}).length)>0).length,
        valueHistoryApi:!!window.valueHistoryV331,
        hasCurrentRows:typeof window.valueHistoryV331?.currentRows==='function',
        status:String(document.getElementById('updateStatus')?.textContent||'')
      };
    });
    throw new Error(`Scheduled readiness timeout: ${JSON.stringify(readiness)}`,{cause:e});
  }

  const readiness=await page.evaluate(()=>{
    try{window.fllStateBridgeV141?.syncState?.()}catch{}
    const rankings=window.state?.rankings||{};
    return {
      players:Object.keys(window.state?.players||{}).length,
      sleeperComplete:window.state?.sleeperHistory?.complete===true,
      sleeperSource:window.state?.sleeperHistory?.source||null,
      consensusMarker:window.__fllConsensusRefresh||null,
      valueRefresh:window.__fllValueRefresh||null,
      modeledReady:window.modeledPlayerValuesV319?.ready===true,
      modeledMeta:window.modeledPlayerValuesV319?.meta||null,
      modeledVersion:Number(window.modeledPlayerValuesV319?.meta?.version)||0,
      consensusSources:Object.values(rankings).filter(src=>(Number(src?.playerCount)||Object.keys(src?.data||{}).length)>0).length,
      status:String(document.getElementById('updateStatus')?.textContent||'')
    };
  });
  if(!readiness.sleeperComplete||readiness.consensusMarker?.ok!==true||Number(readiness.consensusMarker?.successful)<7)throw new Error(`Scheduled refresh inputs incomplete: ${JSON.stringify(readiness)}`);

  const captureCurrent=()=>page.evaluate(()=>{
    const vh=window.valueHistoryV331;
    const rows=vh.currentRows();
    let picks=[];let teams=[];
    try{picks=typeof vh.currentPickRows==='function'?vh.currentPickRows():[]}catch{}
    try{teams=typeof vh.currentTeamRows==='function'?vh.currentTeamRows(rows):[]}catch{}
    const canonical=window.tradeValueNormalizationV139||window.tradeValueNormalizationV130||{};
    const valueParityMismatches=[];
    for(const r of rows){
      const canonicalValue=Math.round(Number(canonical.playerValue?.({type:'player',id:String(r.id)})||0));
      if(!Number.isFinite(canonicalValue)||canonicalValue!==Number(r.value))valueParityMismatches.push({id:String(r.id),history:Number(r.value),canonical:canonicalValue});
      if(valueParityMismatches.length>=20)break;
    }
    return {rows,picks,teams,refresh:window.__fllValueRefresh||null,modeledReady:window.modeledPlayerValuesV319?.ready===true,modeledVersion:Number(window.modeledPlayerValuesV319?.meta?.version)||0,valueParityMismatches,status:String(document.getElementById('updateStatus')?.textContent||'')};
  });
  const sameRows=(a,b)=>{
    if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false;
    for(let i=0;i<a.length;i++){
      const x=a[i],y=b[i];
      if(String(x?.id)!==String(y?.id)||Number(x?.value)!==Number(y?.value)||Number(x?.overall)!==Number(y?.overall)||Number(x?.posRank)!==Number(y?.posRank)||String(x?.pos)!==String(y?.pos))return false;
    }
    return true;
  };
  let captured=null;
  for(let attempt=0;attempt<4;attempt++){
    const first=await captureCurrent();
    await page.waitForTimeout(1500);
    const second=await captureCurrent();
    const stable=sameRows(first.rows,second.rows)&&first.modeledVersion===second.modeledVersion&&second.refresh?.inFlight===false&&second.refresh?.phase==='complete'&&second.modeledReady===true&&!second.valueParityMismatches?.length&&!/loading|updating|refreshing/i.test(second.status||'');
    if(stable){captured=second;break}
    if(attempt<3)await page.waitForTimeout(2000);
  }
  if(!captured)throw new Error('Scheduled capture never reached a stable canonical player-row state');
  if(!Array.isArray(captured.rows)||captured.rows.length<700)throw new Error(`Scheduled capture returned only ${captured.rows?.length||0} player rows`);
  if(captured.rows.some(r=>!Number.isFinite(Number(r?.value))||!Number.isFinite(Number(r?.overall))))throw new Error('Scheduled capture contains non-finite player values/ranks');
  if(captured.valueParityMismatches?.length)throw new Error(`Scheduled capture diverged from canonical Player Values scale: ${JSON.stringify(captured.valueParityMismatches)}`);

  const t=new Date().toISOString(),fp=fingerprint(captured.rows,captured.picks,captured.teams);
  const snap={version:5,league,t,fingerprint:fp,source:'scheduled',valuation_contract:SCHEDULED_VALUATION_CONTRACT,rows:captured.rows,picks:captured.picks,teams:captured.teams};
  if(persistLocal){mkdirSync(join(process.cwd(),'.tmp'),{recursive:true});writeFileSync(snapshotFile,JSON.stringify(snap,null,2)+'\n');}

  console.log(JSON.stringify({ok:true,runtime:promoteConsensus?'netlify-isolated-server':'github-main-local',readiness,canonicalParity:'exact',modeledVersion:captured.modeledVersion,pageErrors:pageErrors.length,failedRequests:failedRequests.length,snapshot:{t,source:'scheduled',count:captured.rows.length,fingerprint:fp}},null,2));
  if(persistLocal){
  // Rehydrate an authenticated refresh manifest from canonical modeled rows.
  // The server independently fetches and validates provider rankings; these
  // player names/IDs are only matching hints and never client-supplied values.
  try{
    const ids=captured.rows.slice().sort((a,b)=>Number(b.value)-Number(a.value))
      .slice(0,4000).map(r=>String(r.id));
    const players=await page.evaluate(ids=>{
      const registry=window.state?.players||{};
      return ids.map(id=>{
        const p=registry[id]||{};
        const name=String(p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ')).trim();
        const positions=Array.isArray(p.positions)?p.positions:[p.position];
        return{id,name,position:String(p.position||''),positions:positions.filter(Boolean)};
      }).filter(p=>p.name&&p.position);
    },ids);
    if(players.length>=700){
      const target=process.env.CONSENSUS_TRUSTED_PLAYERS_FILE||'.tmp/consensus-trusted-players.json';
      writeFileSync(target,JSON.stringify({version:1,league,source:'trusted-headless-consensus',
        captured_at:t,canonical_fingerprint:fp,players})+'\n');
      console.log('TRUSTED_CONSENSUS_MANIFEST_READY',JSON.stringify({players:players.length}));
    }else console.warn('TRUSTED_CONSENSUS_MANIFEST_UNAVAILABLE',JSON.stringify({players:players.length}));
  }catch(error){console.warn('TRUSTED_CONSENSUS_MANIFEST_UNAVAILABLE',String(error?.message||error).slice(0,250))}

  // The League Hub currently computes 20 live awards in the valuation browser.
  // The local collector is trusted because it runs from the checked-out main
  // commit after the same parity/readiness gates as historical valuations.
  // Never promote anonymous visitor-submitted awards to storage.
  try{
    await page.evaluate(()=>{window.__FLEECED_TRUSTED_HEADLESS_AWARDS=true});
    await page.locator('.tabs button[data-tab="leagueHub"]').click({timeout:15000});
    await page.locator('#leagueHub .lh-nav button[data-lh-view="awards"]').click({timeout:15000});
    await page.waitForFunction(()=>document.querySelectorAll('#leagueHubContent .lh-awards-main .lh-card').length>=18,null,{timeout:90000});
    await page.waitForTimeout(3500);
    const highs=awardPosts.get('award_highs'),periods=awardPosts.get('awards'),drafts=awardPosts.get('draft_records');
    const complete=Array.isArray(highs?.records)&&highs.records.length>=200&&
      Array.isArray(periods?.awards)&&periods.awards.length>=18&&
      /^[A-Za-z]{3} \d{1,2},? \d{4}$/.test(String(periods.period||''));
    if(complete){
      const result={version:1,league,source:'trusted-headless-awards',captured_at:t,
        valuation_contract:SCHEDULED_VALUATION_CONTRACT,canonical_fingerprint:fp,
        award_highs:highs,draft_records:Array.isArray(drafts?.records)&&drafts.records.length?drafts:null,awards:periods};
      const awardsPath=process.env.LEAGUE_AWARDS_SNAPSHOT_FILE||'.tmp/league-hub-trusted-awards.json';
      writeFileSync(awardsPath,JSON.stringify(result)+'\n');
      console.log('TRUSTED_AWARDS_CAPTURE',JSON.stringify({ok:true,highs:highs.records.length,
        drafts:result.draft_records?.records?.length||0,awards:periods.awards.length,period:periods.period}));
    }else console.warn('TRUSTED_AWARDS_CAPTURE_UNAVAILABLE',JSON.stringify({highs:highs?.records?.length||0,awards:periods?.awards?.length||0,period:periods?.period||null}));
  }catch(error){
    // An awards-source outage must not prevent durable canonical Value History.
    console.warn('TRUSTED_AWARDS_CAPTURE_UNAVAILABLE',String(error?.message||error).slice(0,300));
  }


  }
  if(maintainAwards)try{
    await page.locator('.tabs button[data-tab="leagueHub"]').click();
    await page.locator('#leagueHub [data-lh-view="awards"]').first().click();
    await page.waitForFunction(()=>window.__fllAwardMaintenance?.complete,{timeout:120000});
    if(!await page.evaluate(()=>window.__fllAwardMaintenance?.ok))throw new Error('Trusted award maintenance failed');
    snap.maintenance={ok:true};
  }catch{snap.maintenance={ok:false};console.error('Trusted award maintenance unavailable; canonical capture remains valid')}
  return snap;
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}

}
if(process.argv[1]&&process.argv[1]===fileURLToPath(import.meta.url))await collectCanonicalSnapshot();
