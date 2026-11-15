#!/usr/bin/env node
// No Netlify POST or code deployment. Exactly one source refresh; model-only
// scoring component unit sensitivity with identical seven-source dynasty data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {refreshAllSources} from '../netlify/functions/consensus-source-overrides.mjs';
import {buildConsensusPayload} from '../netlify/functions/update.mjs';
const preview='https://deploy-preview-466--precious-dango-fb4633.netlify.app/';
const oldSource=readFileSync(new URL('../tests/fixtures/idp-v80-before-scoring-model.js',import.meta.url),'utf8');
const newSource=readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
assert(oldSource.includes('const effectiveScoringValue=unverifiedFallback?Math.min(score.value,180):score.value;'));
assert(newSource.includes('scoringVerified?180+.90*(score.value-180):score.value;'));
const playersResponse=await fetch('https://api.sleeper.app/v1/players/nfl',{signal:AbortSignal.timeout(18000)});
assert.equal(playersResponse.status,200);
const dictionary=await playersResponse.json();
const players=Object.entries(dictionary).filter(([,p])=>p?.fantasy_positions?.length)
 .map(([id,p])=>({id,name:[p.first_name,p.last_name].filter(Boolean).join(' ')||p.full_name||id,
 position:p.position||(p.fantasy_positions||[])[0],positions:p.fantasy_positions||[],team:p.team||null}));
const refresh=await refreshAllSources({timeoutMs:15000});
assert.equal(refresh.successful,7,'require all configured sources successfully parsed');
const payload=buildConsensusPayload(refresh,players);
assert(payload.integrity.all_sources_valid);
assert.equal(payload.composite.sourceCounts.idp,2,'only two currently dynasty-proven IDP sources eligible');
const body=JSON.stringify(payload);
console.log('IDP_V79_SOURCE_STATUS '+JSON.stringify(refresh.results.map(r=>({
 name:r.source,valid:r.valid,rows:r.rankings?.length||0,dynasty:r.dynastyVerified??null
}))));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const factors=['V75-existing','V80-candidate'];
const captures=[];
try{
 for(const factor of factors){
  const context=await browser.newContext({serviceWorkers:'block'});
  const errors=[],blocked=[];
  const origin=new URL(preview).origin;
  const substitute=factor==='V75-existing'?oldSource:newSource;
  await context.route('**/*',route=>{
   const request=route.request(),u=new URL(request.url());
   if(request.method()==='POST'&&u.origin===origin&&
      (u.pathname==='/.netlify/functions/update'||u.pathname==='/api/update'))
    return route.fulfill({status:200,contentType:'application/json',body});
   if(!['GET','HEAD'].includes(request.method())){
    blocked.push(request.url());return route.abort('blockedbyclient');
   }
   if(u.protocol!=='https:'||(u.hostname.endsWith('.netlify.app')&&u.origin!==origin))
    return route.abort('blockedbyclient');
   if(substitute&&u.origin===origin&&u.pathname==='/valuation-idp-v25-perf.js')
    return route.fulfill({status:200,contentType:'text/javascript',body:substitute});
   return route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',err=>errors.push(String(err.message||err)));
  console.log('IDP_V80_STAGE '+JSON.stringify({factor}));
  await page.goto(preview,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>{
   const st=window.state||{};
   return st.teams?.length===32&&window.__fllConsensusRefresh?.complete===true&&
    window.__fllConsensusRefresh?.ok===true&&window.modeledPlayerValuesV319?.ready===true;
  },null,{timeout:100000});
  const snapshot=await page.evaluate(()=>{
   const st=window.state,master=window.ensureMaster();let idpRank=0;
   return{ranked:master.map((z,i)=>{
    const id=String(z.x.id),name=window.playerName(id),position=window.groupPos(z.x);
    if(position==='IDP')idpRank++;
    const source=st.consensusComposite?.detailsById?.[id]||{};
    const actualSources=(source.idpSources||[]).filter(s=>!String(s).endsWith(' (not listed)')).length;
    return{id,name,position,overall:i+1,idpRank:position==='IDP'?idpRank:null,
     modeled:Number(z.value),consensus:Number(z.consensus)||null,marketIdpRank:Number(source.idpRank)||null,
     actualSources,age:Number(st.players?.[id]?.age)||null,
     scoring:Number(z.production?.value)||null,context:Number(z.context)||null,
     seasons:Number(z.production?.a?.qualifyingSeasons)||0};
   }),rostered:[...new Set((st.rosters||[]).flatMap(r=>r.players||[]).map(String))]};
  });
  assert.equal(errors.length,0,'browser error: '+errors.slice(0,3));
  assert(snapshot.ranked.length>950,'incomplete ranking universe');
  captures.push({factor,...snapshot});
  console.log('IDP_V80_CAPTURE '+JSON.stringify({factor,ranked:snapshot.ranked.length,idps:snapshot.ranked.filter(x=>x.position==='IDP').length,blockedOtherWrites:blocked.length}));
  await context.close();
 }
 const base=captures[0],old=new Map(base.ranked.map(x=>[x.id,x]));
 const baselineIds=base.ranked.map(x=>x.id).sort();
 const metrics=[];
 for(const curr of captures){
  assert.deepEqual(curr.ranked.map(x=>x.id).sort(),baselineIds,'player universe changed in scale counterfactual');
  let offChanged=0,ctxChanged=0,sourceChanged=0,missingHistoryChanged=0;
  const idps=curr.ranked.filter(x=>x.position==='IDP');
  const rows=[];
  for(const row of curr.ranked){
   const before=old.get(row.id);
   if(row.position!=='IDP'){
    if(row.modeled!==before.modeled)offChanged++;
    continue;
   }
   if(row.consensus!==before.consensus)sourceChanged++;
   if(row.context!==before.context)ctxChanged++;
   if(row.seasons===0&&row.modeled!==before.modeled)missingHistoryChanged++;
   rows.push({...row,delta:row.idpRank-before.idpRank,baseline:before});
  }
  assert.equal(offChanged,0,'offense-only modeled price moved');
  assert.equal(ctxChanged,0,'career context changed');
  assert.equal(sourceChanged,0,'verified dynasty consensus changed');
  assert.equal(missingHistoryChanged,0,'unknown scoring history gained model value');
  const cohorts=[2,3].map(n=>{
   const xs=rows.filter(x=>x.actualSources>=n&&x.marketIdpRank>0);
   const mae=xs.length?xs.reduce((a,b)=>a+Math.abs(b.idpRank-b.marketIdpRank),0)/xs.length:null;
   return{minSources:n,count:xs.length,marketRankMAE:mae&&+mae.toFixed(2),
    disagreementOver20:xs.filter(x=>Math.abs(x.idpRank-x.marketIdpRank)>=20).length,
    disagreementOver40:xs.filter(x=>Math.abs(x.idpRank-x.marketIdpRank)>=40).length};
  });
  metrics.push({factor:curr.factor,ranked:curr.ranked.length,idps:idps.length,
   offenseChanged:offChanged,contextChanged:ctxChanged,consensusChanged:sourceChanged,
   unverifiedHistoryChanged:missingHistoryChanged,sourceCohorts:cohorts,
   topIdp:{top25:curr.ranked.slice(0,25).filter(x=>x.position==='IDP').length,
    top50:curr.ranked.slice(0,50).filter(x=>x.position==='IDP').length,
    top100:curr.ranked.slice(0,100).filter(x=>x.position==='IDP').length,
    top250:curr.ranked.slice(0,250).filter(x=>x.position==='IDP').length},
   changedIdpRanks:rows.filter(x=>x.delta!==0).length,
   over20RankMoves:rows.filter(x=>Math.abs(x.delta)>20).length,
   largestMovement:rows.slice().sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,8)
    .map(x=>({name:x.name,oldRank:x.baseline.idpRank,newRank:x.idpRank,market:x.marketIdpRank,age:x.age})),
   featured:['Will Anderson Jr.','Myles Garrett','T.J. Watt','Greg Rousseau','Dallas Turner',
     'Aidan Hutchinson','Carson Schwesinger','Jack Campbell','David Bailey']
    .map(n=>rows.find(x=>x.name===n)).filter(Boolean)
    .map(x=>({name:x.name,overall:x.overall,idp:x.idpRank,prior:x.baseline.idpRank,
      model:x.modeled,market:x.marketIdpRank,age:x.age}))
  });
 }
 console.log('IDP_V80_SOURCE_MATCHED_ACCEPTANCE '+JSON.stringify(metrics));
 console.log('IDP_V80_SOURCE_MATCHED_AUDIT_PASS');
}finally{await browser.close()}
