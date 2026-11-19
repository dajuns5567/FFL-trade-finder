import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import siteV29 from '../netlify/functions/site-v29.mjs';
import updateHandler from '../netlify/functions/update.mjs';
import picksHandler from '../netlify/functions/picks.mjs';

const snapshotFile=process.env.VALUE_HISTORY_SNAPSHOT_FILE||'.tmp/value-history-scheduled.json';
// Scheduled jobs may run from main while checking out a pinned, verified
// valuation release. Record the actual checked-out source SHA, never mistake
// the triggering main workflow SHA for the model's source revision.
const sourceCommit=String(process.env.VALUE_HISTORY_SOURCE_COMMIT||process.env.GITHUB_SHA||'').trim()||null;
const SCHEDULED_VALUATION_CONTRACT='precision-idp-runtime-20260919';
const acceptedValuationModel=value=>String(value||'').trim()==='idp-v96-single-source-continuous-v95-evidence'?'idp-v96-single-source-continuous-v95-evidence':null;
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
  const valuationModel=acceptedValuationModel(payload.valuation_model);
  if(!valuationModel)return json({ok:false,error:'scheduled capture missing approved valuation-model evidence'},409);
  const snap={version:5,league,t,fingerprint:fp,source:'scheduled',valuation_contract:SCHEDULED_VALUATION_CONTRACT,valuation_model:valuationModel,rows,picks,teams};
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
console.log(JSON.stringify({event:'scheduled-refresh-target',runtime:'github-main-local',site:url.origin,commit:sourceCommit},null,2));

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

  if(process.env.IDP_AUDIT_SPOTLIGHT==='1'){
    const diagnostic=await page.evaluate(()=>{
      const ranked=typeof window.ensureMaster==='function'?window.ensureMaster():[];
      const norm=s=>String(s||'').toLowerCase().replace(/[^a-z]/g,'');
      const wanted=new Set(['keyroncrawford','natelandman']);
      const rows=[],suspects=[],lbPeers=[];
      let idp=0,lbRank=0;
      for(let i=0;i<ranked.length;i++){
        const z=ranked[i],id=String(z.x?.id||''),group=window.groupPos?.(z.x);
        if(group!=='IDP')continue;
        idp++;
        const name=window.playerName?.(id)||id,clean=norm(name),
          p=window.state?.players?.[id]||{},
          isLB=['LB','ILB','MLB','OLB'].includes(String(p.position||'').toUpperCase())
            ||(Array.isArray(p.fantasy_positions)&&p.fantasy_positions.some(q=>['LB','ILB','MLB','OLB'].includes(String(q).toUpperCase()))),
          lbIndex=isLB?++lbRank:null,
          d=window.state?.consensusComposite?.detailsById?.[id]||{},
          audit=window.idpScoringAudit?.(id)||{},
          cv=Number(z.consensus),src=(Array.isArray(d.idpSources)?d.idpSources:[])
           .filter(x=>!String(x).endsWith(' (not listed)')),
          seasons=(audit.seasons||[]).map(x=>({year:x.season,games:x.games,ppg:x.ppg,
           current:x.currentSeason,points:x.points})),
          entry={id,name,position:p.position,team:p.team,age:p.age,years_exp:p.years_exp,
           active:p.active,overall:i+1,idpRank:idp,served:z.value,
           canonical:window.tradeValueNormalizationV139?.canonicalValue?.(z.x),
           modelPrecision:z.marketPrecisionValueV386,
           consensus:cv,consensusRank:d.idpRank,sourceCount:src.length,sources:src,
           sourceDetails:{kind:d.kind,idpValue:d.idpValue,
             singleSourceEvidence:d.idpSingleSourceEvidence||null},
           rawDynastySourceRanks:Object.entries(window.state?.rankings||{})
            .filter(([key,src])=>src?.kind==='idp'||/IDP Show Combined IDP/i.test(key))
            .map(([key,src])=>({source:key,
              rawRank:src?.data?.[String(name).trim().toLowerCase()]??null,
              population:src?.playerCount??Object.keys(src?.data||{}).length}))
            .filter(x=>x.rawRank!==null),
           qualifyingSeasons:audit.qualifyingSeasons,confidence:audit.confidence,
           scoringValue:audit.productionValue,scoringPpg:audit.ppg,
           seasons,lbRank:lbIndex,trace:{
             v25:audit.v25RuntimeTrace?{
               ppgPercentile:audit.v25RuntimeTrace.ppgPercentile,
               relativeAboveP50:audit.v25RuntimeTrace.relativeAboveP50,
               confidence:audit.v25RuntimeTrace.confidence,
               benchmarkP50:audit.v25RuntimeTrace.benchmarkP50,
               benchmarkP99:audit.v25RuntimeTrace.benchmarkP99,
               scoringValue:audit.v25RuntimeTrace.productionValue
             }:null,
             otherContext:audit.otherContextValue,
             modelWeights:audit.modelWeights
           },production:{v25:z.production?.value,context:z.context,
             v72Baseline:z.production?.idpOverallTradeCurveBaselineV72,
             v72Factor:z.production?.idpOverallTradeCurveFactorV72,
             noConsensusFallback:z.production?.idpUnverifiedNoConsensusFallbackV73}};
        if(wanted.has(clean)||clean.includes('landman')||clean.includes('crawford'))
          rows.push(entry);
        if(idp<=100&&(!Number(audit.qualifyingSeasons)||!src.length))
          suspects.push(entry);
        if(isLB&&Number(audit.qualifyingSeasons)>0){
          lbPeers.push(entry);
        }
      }
      const landman=lbPeers.find(x=>norm(x.name)==='natelandman');
      const supported=lbPeers.filter(x=>Number(x.qualifyingSeasons)>=2
          &&Number(x.scoringPpg)>=9&&Number(x.scoringPpg)<=17);
      const sorted=lbPeers.sort((a,b)=>a.lbRank-b.lbRank);
      const top100Idps=ranked.slice(0,100).filter(z=>window.groupPos?.(z.x)==='IDP');
      const top200Idps=ranked.slice(0,200).filter(z=>window.groupPos?.(z.x)==='IDP');
      return{totalRanked:ranked.length,idpTotal:idp,
        idpInOverallTop100:top100Idps.length,idpInOverallTop200:top200Idps.length,
        top100Ids:top100Idps.map(z=>({name:window.playerName?.(z.x.id),id:z.x.id,value:z.value})),
        singleSourcePlayers:lbPeers.filter(z=>z.sourceDetails?.singleSourceEvidence).length,
        spotlights:rows,top100IdpWeakEvidence:suspects.slice(0,35),
        linebackerComparison:{
          landmanId:landman?.id||null,
          eligible:lbPeers.length,
          comparableCount:supported.length,
          directPeers:supported.map(x=>({
            name:x.name,id:x.id,overall:x.overall,idpRank:x.idpRank,lbRank:x.lbRank,
            value:x.canonical,sourceCount:x.sourceCount,consensus:x.consensus,
            qual:x.qualifyingSeasons,ppg:x.scoringPpg,scoringValue:x.scoringValue,
            context:x.trace.otherContext,percentile:x.trace.v25?.ppgPercentile,
            age:x.age,yearsExp:x.years_exp
          })).slice(0,140),
          neighboringLBs:sorted.filter(x=>Math.abs(x.lbRank-(landman?.lbRank||0))<=25)
            .map(x=>({name:x.name,lbRank:x.lbRank,idpRank:x.idpRank,
              overall:x.overall,ppg:x.scoringPpg,seasons:x.qualifyingSeasons,
              consensus:x.consensus,sourceCount:x.sourceCount,score:x.scoringValue,
              context:x.trace.otherContext,value:x.canonical})),
          roleBenchmark:window.idpV25RoleBenchmarkCounterfactual?.().controls
            ?.filter(x=>String(x.id)==='8659')||[]
        }
      };
    });
    console.log('IDP_IDENTITY_EVIDENCE_AUDIT '+JSON.stringify(diagnostic));
    if(diagnostic.idpInOverallTop100>14)throw new Error(
      'IDP single-source retention unexpectedly crowded overall top 100: '+
        diagnostic.idpInOverallTop100);
  }
  const captureCurrent=()=>page.evaluate(async()=>{
    const verifiedModel=typeof window.verifyValueHistoryModelV95==='function'
      ?await window.verifyValueHistoryModelV95():null;
    const vh=window.valueHistoryV331;
    const rows=vh.currentRows();
    let picks=[];let teams=[];
    try{picks=typeof vh.currentPickRows==='function'?vh.currentPickRows():[]}catch{}
    try{teams=typeof vh.currentTeamRows==='function'?vh.currentTeamRows(rows):[]}catch{}
    const canonical=window.tradeValueNormalizationV139||window.tradeValueNormalizationV130||{};
    // The old fixed valuation_contract tag was identical through many
    // revisions. Capture the exact publisher-input fingerprints and runner
    // commit so future jumps can be traced without guessing a player's rank.
    const sourceManifest=Object.entries(window.state?.rankings||{}).map(([name,src])=>{
      const data=src?.data||{},keys=Object.keys(data).sort();
      let h=2166136261;
      for(const key of keys){
        const chunk=key+':'+JSON.stringify(data[key])+'|';
        for(let i=0;i<chunk.length;i++){h^=chunk.charCodeAt(i);h=Math.imul(h,16777619)}
      }
      return{name,count:Number(src?.playerCount)||keys.length,hash:(h>>>0).toString(36)};
    }).sort((a,b)=>a.name.localeCompare(b.name));
    // Compare the Player Values display, Finder, Evaluator, package math and
    // archived Value History against ONE live canonical V319 model.
    // Never invent missing prices or silently suppress a disagreement.
    const valueParityMismatches=[],compare=(id,consumer,actual,expected)=>{
      const n=Number(actual);
      if(!Number.isFinite(n)||Math.round(n)!==expected)
        valueParityMismatches.push({id:String(id),consumer,actual:Number.isFinite(n)?n:null,canonical:expected});
    };
    const modeled=window.modeledPlayerValuesV319,snapshot=modeled?.snapshot?.();
    const engineNames=['tradeEngine96','tradeEngine98','tradeEngine99'];
    const engines=engineNames.filter(name=>typeof window[name]?.assetValue==='function');
    const canPlayerValues=typeof window.playerValuesV139?.homeTopPlayers==='function';
    const canFinderEvaluator=typeof window.section1V130?.fair==='function';
    const canHindsight=typeof vh?.currentEvaluatorValue==='function'&&typeof vh?.hindsightValue==='function';
    const consumerReady=!!(modeled?.ready&&snapshot instanceof Map&&
      typeof canonical.playerValue==='function'&&typeof canonical.canonicalValue==='function'&&
      typeof window.baseValue==='function'&&typeof window.packageValue==='function'&&
      engines.length>=1&&canPlayerValues&&canFinderEvaluator&&canHindsight);
    const rankIds=new Set(rows.map(r=>String(r.id)));
    for(const r of rows){
      const asset={type:'player',id:String(r.id)},expected=Number(r.value);
      compare(r.id,'normalization.playerValue',canonical.playerValue?.(asset),expected);
      compare(r.id,'normalization.canonicalValue',canonical.canonicalValue?.(asset),expected);
      compare(r.id,'global.baseValue',window.baseValue?.(asset),expected);
      compare(r.id,'global.packageValue',window.packageValue?.([asset]),expected);
      compare(r.id,'modeled.snapshot',snapshot?.get(String(r.id)),expected);
      compare(r.id,'tradeHistory.hindsight',vh?.hindsightValue?.(asset,null),expected);
      compare(r.id,'tradeHistory.currentEvaluator',vh?.currentEvaluatorValue?.(asset),expected);
      for(const name of engines)compare(r.id,name,window[name].assetValue(asset),expected);
      if(valueParityMismatches.length>=30)break;
    }
    const topRows=canPlayerValues?window.playerValuesV139.homeTopPlayers(10):[];
    const historyById=new Map(rows.map(r=>[String(r.id),r]));
    for(const r of topRows){
      const truth=historyById.get(String(r.id));
      if(!truth){valueParityMismatches.push({id:String(r.id),consumer:'playerValues.homeTopPlayers',error:'missing history rank'});continue}
      compare(r.id,'playerValues.homeTopPlayers',r.value,truth.value);
      compare(r.id,'playerValues.overallRank',r.rank,truth.overall);
      compare(r.id,'playerValues.posRank',r.posRank,truth.posRank);
    }
    if(!topRows.length)valueParityMismatches.push({consumer:'playerValues.homeTopPlayers',error:'no visible ranked players'});
    const uniqueAssets=(window.state?.allAssets||[]).filter(a=>a?.type==='player'&&rankIds.has(String(a.id)));
    const sample=uniqueAssets.slice(0,10);
    if(sample.length>=2){
      const expected=sample.reduce((sum,a)=>sum+Number(historyById.get(String(a.id))?.value||0),0);
      compare('sample-package','normalization.package',canonical.canonicalPackageValue?.(sample),expected);
      compare('sample-package','global.package',window.packageValue?.(sample),expected);
    }else valueParityMismatches.push({consumer:'package',error:'insufficient rostered assets'});
    return {rows,picks,teams,sourceManifest,valuationModel:verifiedModel,refresh:window.__fllValueRefresh||null,modeledReady:modeled?.ready===true,modeledVersion:Number(modeled?.meta?.version)||0,consumerReady,consumerCount:engines.length+8,valueParityMismatches,status:String(document.getElementById('updateStatus')?.textContent||'')};
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
    const stable=sameRows(first.rows,second.rows)&&JSON.stringify(first.sourceManifest)===JSON.stringify(second.sourceManifest)&&first.modeledVersion===second.modeledVersion&&first.valuationModel===second.valuationModel&&second.refresh?.inFlight===false&&second.refresh?.phase==='complete'&&second.modeledReady===true&&second.consumerReady===true&&!second.valueParityMismatches?.length&&!/loading|updating|refreshing/i.test(second.status||'');
    if(stable){captured=second;break}
    if(attempt<3)await page.waitForTimeout(2000);
  }
  if(!captured)throw new Error('Scheduled capture never reached a stable canonical player-row state');
  const valuationModel=acceptedValuationModel(captured.valuationModel);
  if(!valuationModel)throw new Error('Scheduled capture lacks the approved live valuation model contract');
  if(!Array.isArray(captured.rows)||captured.rows.length<700)throw new Error(`Scheduled capture returned only ${captured.rows?.length||0} player rows`);
  if(captured.rows.some(r=>!Number.isFinite(Number(r?.value))||!Number.isFinite(Number(r?.overall))))throw new Error('Scheduled capture contains non-finite player values/ranks');
  if(!captured.consumerReady||captured.valueParityMismatches?.length)throw new Error(`Scheduled capture diverged across Player Values, Finder, Evaluator or History: ${JSON.stringify(captured.valueParityMismatches)}`);

  // V99 research-only optional audit export. Does not alter the accepted V96
  // canonical rows, prices, snapshot model, publication or durable archive.
  if(process.env.V99_LIVE_EVIDENCE_FILE){
    const evidence=await page.evaluate(()=>{
      const ranked=window.ensureMaster();
      const details=window.state?.consensusComposite?.detailsById||{};
      return ranked.filter(z=>z?.x?.type==='player').map((z,i)=>{
        const id=String(z.x.id),group=String(window.groupPos(z.x)||'');
        const d=details[id]||{},p=window.state?.players?.[id]||{};
        const prod=z.production||{};
        const idp=group==='IDP';
        const audit=idp?window.idpScoringAudit?.(id):window.offenseScoringAudit?.(id);
        const sourceNames=(idp?d.idpSources:d.offenseSources)||[];
        const sources=Array.isArray(sourceNames)?sourceNames.filter(n=>!String(n).includes('(not listed)')):[];
        const seasonRows=(idp?prod.a?.seasons:prod.correctedAudit?.samples)||audit?.seasons||[];
        return {
          id,group,position:p.position||null,overall:i+1,
          baselineValue:Number(window.tradeValueNormalizationV139?.canonicalValue?.(z.x)),
          underlyingModelValue:Number(z.value),
          age:p.age??null,yearsExp:p.years_exp??null,
          consensusValue:Number(z.consensus)>0?Number(z.consensus):null,
          verifiedCompositeValue:Number(window.state?.consensusComposite?.byId?.[id])>0
            ?Number(window.state.consensusComposite.byId[id]):null,
          attributionKind:d.kind||null,
          fallback:z.fallback===true,coverageGate:z.coverageGate384===true,
          idpV25RawBlend:prod.idpV25RawBlend??null,
          idpV25NoConsensusFallback:prod.idpUnverifiedNoConsensusFallbackV73??null,
          idpNoQualifyingScoring:prod.idpNoQualifiedSleeperScoringV95??null,
          idpCompressionFactor:prod.idpV72Factor??prod.idpOverallTradeCurveFactorV72??null,
          idpOverallTradeCurveBaseline:prod.idpOverallTradeCurveBaselineV72??null,
          sources:[...new Set(sources.map(String))],sourceCount:new Set(sources.map(String)).size,
          consensusRank:idp?(d.idpRank??null):(d.offenseRank??null),
          leaguePpg:Number.isFinite(Number(audit?.ppg))?Number(audit.ppg):null,
          scoreConfidence:Number.isFinite(Number(audit?.confidence))?Number(audit.confidence):null,
          qualifyingSeasons:audit?.qualifyingSeasons??null,
          productionComponent:idp?(audit?.productionValue??null):(prod.effectiveScoringValue??null),
          contextComponent:idp?(audit?.otherContextValue??null):Number(z.context)||null,
          verifiedEarlyCareer:idp?null:prod.earlyCareerVerifiedScoringV50===true,
          liveScoringSeasons:Array.isArray(seasonRows)?seasonRows.map(a=>({
            season:a.season??null,games:a.games??null,ppg:a.ppg??null,
            currentSeason:!!a.currentSeason
          })):[]
        };
      });
    });
    if(evidence.length<700)throw new Error('V99 audit evidence incomplete');
    mkdirSync(join(process.cwd(),'.tmp'),{recursive:true});
    writeFileSync(process.env.V99_LIVE_EVIDENCE_FILE,JSON.stringify({
      contract:'v99-v96-runtime-evidence-readonly',
      sourceCommit:sourceCommit,
      valuationModel:acceptedValuationModel(captured.valuationModel),
      consensusSources:Number(readiness.consensusMarker?.successful)||0,
      canonicalParity:'exact',
      rows:evidence
    },null,2)+'\n');
    console.log(JSON.stringify({event:'v99-runtime-evidence-readonly',rows:evidence.length}));
  }

  const t=new Date().toISOString(),fp=fingerprint(captured.rows,captured.picks,captured.teams);
  const snap={version:5,league,t,fingerprint:fp,source:'scheduled',valuation_contract:SCHEDULED_VALUATION_CONTRACT,valuation_model:valuationModel,provenance:{git_commit:sourceCommit,modeled_version:captured.modeledVersion,consensus_sources:Number(readiness.consensusMarker?.successful)||0,source_manifest:captured.sourceManifest,canonical_parity:'exact'},rows:captured.rows,picks:captured.picks,teams:captured.teams};
  mkdirSync(join(process.cwd(),'.tmp'),{recursive:true});
  writeFileSync(snapshotFile,JSON.stringify(snap,null,2)+'\n');

  console.log(JSON.stringify({ok:true,runtime:'github-main-local',readiness,canonicalParity:'exact',modeledVersion:captured.modeledVersion,pageErrors:pageErrors.length,failedRequests:failedRequests.length,snapshot:{t,source:'scheduled',count:captured.rows.length,fingerprint:fp}},null,2));
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
