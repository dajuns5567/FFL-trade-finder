import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import siteV29 from '../netlify/functions/site-v29.mjs';
import updateHandler from '../netlify/functions/update.mjs';
import picksHandler from '../netlify/functions/picks.mjs';

const snapshotFile=process.env.VALUE_HISTORY_SNAPSHOT_FILE||'.tmp/value-history-scheduled.json';
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
  if(url.searchParams.get('trades')==='1')return json({trades:[],source:'scheduled-local-runtime'});
  return json({points:[],source:'scheduled-local-runtime'});
}
async function valueHistory(req){
  const url=new URL(req.url);
  if(req.method!=='POST')return historyReadStub(url);
  let payload={};try{payload=await req.json()}catch{return json({ok:false,error:'Invalid JSON'},400)}
  const rows=Array.isArray(payload.rows)?payload.rows:[],picks=Array.isArray(payload.picks)?payload.picks:[],teams=Array.isArray(payload.teams)?payload.teams:[];
  if(String(payload.league)!==league||rows.length<100)return json({ok:false,error:'Scheduled snapshot payload incomplete'},400);
  if(payload.source!=='scheduled')return json({ok:false,error:'Scheduled local collector only accepts source=scheduled'},400);
  const t=new Date().toISOString(),fp=fingerprint(rows,picks,teams);
  const snap={version:5,league,t,fingerprint:fp,source:'scheduled',rows,picks,teams};
  mkdirSync(join(process.cwd(),'.tmp'),{recursive:true});
  writeFileSync(snapshotFile,JSON.stringify(snap,null,2)+'\n');
  return json({ok:true,t,fingerprint:fp,source:'scheduled',count:rows.length});
}
async function genericFunction(name,req){
  if(name==='update')return updateHandler(req);
  if(name==='picks')return picksHandler(req);
  const safe=String(name||'').replace(/[^a-zA-Z0-9_-]/g,'');
  if(!safe)return json({ok:false,error:'Unknown function'},404);
  try{const mod=await import(`../netlify/functions/${safe}.mjs`);return mod.default(req)}
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
  if(!rel||rel.includes('..'))return null;
  const path=normalize(join(process.cwd(),rel));
  if(!path.startsWith(process.cwd()))return null;
  try{if(!statSync(path).isFile())return null;return new Response(readFileSync(path),{headers:{'content-type':mime(path),'cache-control':'no-store'}})}catch{return null}
}

const server=createServer(async(req,res)=>{
  try{
    const origin=`http://127.0.0.1:${server.address()?.port||0}`,url=new URL(req.url||'/',origin);
    let response;
    if(url.pathname==='/'||url.pathname==='/.netlify/functions/site-v29')response=await siteV29();
    else if(url.pathname==='/api/update')response=await updateHandler(await requestFromNode(req,origin));
    else if(url.pathname==='/api/picks')response=await picksHandler(await requestFromNode(req,origin));
    else if(url.pathname==='/.netlify/functions/value-history')response=await valueHistory(await requestFromNode(req,origin));
    else if(url.pathname.startsWith('/.netlify/functions/'))response=await genericFunction(url.pathname.split('/').pop(),await requestFromNode(req,origin));
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
for(const required of ['offense-history.json']){
  const r=await fetch(`${siteUrl}sleeper-data/${required}?preflight=${Date.now()}`,{cache:'no-store'});
  if(!r.ok)throw new Error(`Required Sleeper artifact ${required} failed local proxy preflight: ${r.status}`);
  const j=await r.json();
  if(!j||typeof j!=='object'||j.ok!==true)throw new Error(`Required Sleeper artifact ${required} failed JSON validation`);
}
const url=new URL(siteUrl);url.searchParams.set('vh_source','scheduled');url.searchParams.set('vh_ts',String(Date.now()));
console.log(JSON.stringify({event:'scheduled-refresh-target',runtime:'github-main-local',site:url.origin,commit:process.env.GITHUB_SHA||null},null,2));

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  const pageErrors=[];
  const failedRequests=[];
  page.setDefaultTimeout(240000);
  page.on('console',msg=>{if(['error','warning'].includes(msg.type()))console.log(`browser-${msg.type()}:`,msg.text())});
  page.on('pageerror',err=>{pageErrors.push(String(err?.stack||err?.message||err));console.log('browser-pageerror:',String(err?.stack||err?.message||err))});
  page.on('requestfailed',req=>{const row={url:req.url(),failure:req.failure()?.errorText||'unknown'};failedRequests.push(row);console.log('browser-requestfailed:',JSON.stringify(row))});
  page.on('response',res=>{if(res.status()>=400)console.log('browser-http-error:',res.status(),res.url())});

  const response=await page.goto(url.toString(),{waitUntil:'domcontentloaded',timeout:120000});
  if(!response||!response.ok())throw new Error(`Local Fleeced load failed: ${response?.status()||'no response'}`);

  try{
    await page.waitForFunction(()=>{
      try{window.fllStateBridgeV141?.syncState?.()}catch{}
      const players=window.state?.players||{};
      const sleeper=window.state?.sleeperHistory;
      const consensus=window.__fllConsensusRefresh;
      const vh=window.valueHistoryV331;
      const status=String(document.getElementById('updateStatus')?.textContent||'').toLowerCase();
      const busy=/loading|updating|refreshing/.test(status);
      return Object.keys(players).length>=700&&sleeper?.complete===true&&consensus?.complete===true&&consensus?.ok===true&&Number(consensus?.successful)>=7&&!busy&&typeof vh?.currentRows==='function';
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
      consensusSources:Object.values(rankings).filter(src=>(Number(src?.playerCount)||Object.keys(src?.data||{}).length)>0).length,
      status:String(document.getElementById('updateStatus')?.textContent||'')
    };
  });
  if(!readiness.sleeperComplete||readiness.consensusMarker?.ok!==true||Number(readiness.consensusMarker?.successful)<7)throw new Error(`Scheduled refresh inputs incomplete: ${JSON.stringify(readiness)}`);

  const captured=await page.evaluate(()=>{
    const vh=window.valueHistoryV331;
    const rows=vh.currentRows();
    let picks=[];let teams=[];
    try{picks=typeof vh.currentPickRows==='function'?vh.currentPickRows():[]}catch{}
    try{teams=typeof vh.currentTeamRows==='function'?vh.currentTeamRows(rows):[]}catch{}
    return {rows,picks,teams};
  });
  if(!Array.isArray(captured.rows)||captured.rows.length<700)throw new Error(`Scheduled capture returned only ${captured.rows?.length||0} player rows`);
  if(captured.rows.some(r=>!Number.isFinite(Number(r?.value))||!Number.isFinite(Number(r?.overall))))throw new Error('Scheduled capture contains non-finite player values/ranks');

  const t=new Date().toISOString(),fp=fingerprint(captured.rows,captured.picks,captured.teams);
  const snap={version:5,league,t,fingerprint:fp,source:'scheduled',rows:captured.rows,picks:captured.picks,teams:captured.teams};
  mkdirSync(join(process.cwd(),'.tmp'),{recursive:true});
  writeFileSync(snapshotFile,JSON.stringify(snap,null,2)+'\n');

  console.log(JSON.stringify({ok:true,runtime:'github-main-local',readiness,pageErrors:pageErrors.length,failedRequests:failedRequests.length,snapshot:{t,source:'scheduled',count:captured.rows.length,fingerprint:fp}},null,2));
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
