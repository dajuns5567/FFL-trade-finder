#!/usr/bin/env node
// Read-only preview counterfactual: substitute the local candidate V319 script
// into the EXACT PR #466 preview without deploying, changing Sleeper, or writing data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const preview='https://deploy-preview-466--precious-dango-fb4633.netlify.app/';
const origin=new URL(preview).origin;
const candidate=readFileSync(new URL('../modeled-player-values-v319.js',import.meta.url),'utf8');
assert(candidate.includes('modeled-terminal-precision-proportional'),'Unexpected candidate source');
const timeout=setTimeout(()=>{console.error('CURRENCY_COUNTERFACTUAL_TIMEOUT');process.exit(124)},185000);
timeout.unref();
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
async function capture(override){
 const context=await browser.newContext({serviceWorkers:'block'});
 const errors=[];let blockedWrites=0,substitutions=0;
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(!['GET','HEAD'].includes(req.method())){blockedWrites++;return route.abort('blockedbyclient')}
  if(u.protocol!=='https:'||(u.hostname.endsWith('.netlify.app')&&u.origin!==origin))
   return route.abort('blockedbyclient');
  if(u.origin===origin&&(
    u.pathname==='/api/update'||
    u.pathname.startsWith('/.netlify/functions/update')||
    u.pathname.startsWith('/.netlify/functions/inquirer-publish')||
    u.pathname.startsWith('/.netlify/functions/inquirer-preview-on-deploy')))

   return route.abort('blockedbyclient');
  if(override&&u.origin===origin&&u.pathname==='/modeled-player-values-v319.js'){
   substitutions++;
   return route.fulfill({status:200,contentType:'text/javascript',body:candidate});
  }
  return route.continue();
 });
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(String(e?.message||e)));
 console.log('CURRENCY_COUNTERFACTUAL_PHASE '+(override?'candidate':'baseline')+' opening preview');
 await page.goto(preview,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>{
  const s=window.state||{};
  return s.teams?.length===32&&s.allAssets?.filter(x=>x.type==='player').length>250&&
   window.modeledPlayerValuesV319?.ready===true;
 },null,{timeout:70000,polling:500});
 const snapshot=await page.evaluate(()=>{
  const s=window.state,norm=window.tradeValueNormalizationV139,master=window.ensureMaster();
  const model=z=>{const p=Number(z.marketPrecisionValueV386),v=Number(z.value);return p>0?p:(v>0?v:0)};
  return{
   playerCount:s.allAssets.filter(x=>x.type==='player').length,
   teamCount:s.teams.length,
   meta:window.modeledPlayerValuesV319.meta,
   ranked:master.map((z,i)=>{
    const x=z.x;
    return{id:String(x.id),name:window.playerName?.(x.id)||String(x.id),
     rank:i+1,pos:window.groupPos?.(x)||'UNKNOWN',model:model(z),
     value:Number(norm.canonicalValue({type:'player',id:String(x.id)}))};
   }),
   picks:s.allAssets.filter(x=>x.type==='pick').map(x=>({
    id:String(x.id),season:x.season,round:x.round,value:Number(norm.canonicalValue(x))
   })).sort((a,b)=>a.id.localeCompare(b.id))
  };
 });
 await context.close();
 assert.equal(errors.length,0,'Browser errors in '+(override?'candidate':'baseline')+': '+errors.slice(0,3).join(' | '));
 if(override)assert.equal(substitutions,1,'Candidate module was not substituted exactly once');
 console.log('CURRENCY_COUNTERFACTUAL_CAPTURE '+JSON.stringify({
  branch:override?'candidate':'baseline',players:snapshot.playerCount,
  ranked:snapshot.ranked.length,teams:snapshot.teamCount,meta:snapshot.meta,
  blockedWrites,substitutions
 }));
 return snapshot;
}
try{
 const before=await capture(false),after=await capture(true);
 assert.equal(before.teamCount,32);assert.equal(after.playerCount,544);
 assert.equal(before.ranked.length,after.ranked.length,'Ranking universe changed');
 assert.deepEqual(after.ranked.map(x=>x.id),before.ranked.map(x=>x.id),'Model rank order changed');
 const old=new Map(before.ranked.map(x=>[x.id,x])),top=after.ranked[0]?.model;
 assert(top>0,'No verified model top value');
 let previous=Infinity,modelChanges=0,floorCount=0;
 const byPos={},deltas=[];
 for(const item of after.ranked){
  const prior=old.get(item.id);
  if(Math.abs(item.model-prior.model)>1e-6)modelChanges++;
  const expect=Math.round(Math.max(120,Math.min(9999,9999*item.model/top)));
  assert.equal(item.value,expect,'Candidate not proportional for '+item.id);
  assert(item.value<=previous,'Canonical value inversion at '+item.id);
  if(item.value===120)floorCount++;
  previous=item.value;
  const p=byPos[item.pos]??={count:0,oldTotal:0,newTotal:0};
  p.count++;p.oldTotal+=prior.value;p.newTotal+=item.value;
  deltas.push({id:item.id,name:item.name,pos:item.pos,rank:item.rank,
   model:item.model,old:prior.value,new:item.value,delta:item.value-prior.value});
 }
 assert.equal(modelChanges,0,'Scoring/consensus/model values changed between captures: '+modelChanges);
 assert.deepEqual(after.picks,before.picks,'Draft pick canonical values changed');
 assert.equal(after.ranked[0].value,9999);
 assert(after.ranked.every(x=>x.value>=120&&x.value<=9999));
 const watch=['Josh Allen','Jahmyr Gibbs','Drake Maye','Myles Garrett','Will Anderson Jr.','Aidan Hutchinson','Dallas Turner','Denzel Boston'];
 const controls=watch.map(name=>deltas.find(x=>x.name.toLowerCase()===name.toLowerCase())).filter(Boolean);
 const largestDown=[...deltas].sort((a,b)=>a.delta-b.delta).slice(0,20);
 const largestUp=[...deltas].sort((a,b)=>b.delta-a.delta).slice(0,10);
 const groups=Object.fromEntries(Object.entries(byPos).map(([k,v])=>[k,{
  n:v.count,oldAverage:Math.round(v.oldTotal/v.count),newAverage:Math.round(v.newTotal/v.count)
 }]));
 console.log('CURRENCY_COUNTERFACTUAL_PASS '+JSON.stringify({
  sample:after.ranked.length,rostered:after.playerCount,modelChanges,rankInversions:0,
  floorCount,pickCount:after.picks.length,picksUnchanged:true,
  controls,groups,largestDown,largestUp
 }));
}finally{await browser.close()}
