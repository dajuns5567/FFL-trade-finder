import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../trade-specific-max-value-v279.js',import.meta.url),'utf8');
const site=readFileSync(new URL('../netlify/functions/site-v29.mjs',import.meta.url),'utf8');
function runtime({outgoingCount=34,targetExtras=20,eligible=null}={}){
 const my=1,other=2;
 const own=Array.from({length:outgoingCount},(_,i)=>({type:'player',id:'out-'+i,owner:my,value:1100+i*110,rank:40+i,name:'Outgoing '+i}));
 const target={type:'player',id:'jonathan-taylor',owner:other,value:7600,rank:8,name:'Jonathan Taylor'};
 const others=Array.from({length:targetExtras},(_,i)=>({type:'player',id:'in-'+i,owner:other,value:800+i*120,rank:60+i,name:'Incoming '+i}));
 const elements={
  finderResults:{innerHTML:'',appendChild(){}},findTeam:{value:'1'},
  desiredPlayerSearch:{value:'Jonathan Taylor'},findMode:{value:'value'},
  tradeTier94:{value:'up'},tradeAssist97:{checked:false}
 };
 const doc={
  getElementById:x=>elements[x]||null,
  querySelectorAll:()=>[],
  addEventListener(){},
  createElement:()=>({style:{},appendChild(){}})
 };
 let yields=0;
 const win={
  state:{allAssets:[...own,target,...others],teams:Array.from({length:32},(_,i)=>({id:i+1,name:'Team '+(i+1)})),players:{}},
  tradeValueNormalizationV139:{canonicalValue:x=>x.value||0},
  tradeSelectAllV165:{aliasActive:()=>true},
  playerName:x=>x==='jonathan-taylor'?'Jonathan Taylor':x,
  playerRankValue:x=>({rank:x.rank||9999}),
  groupPos:()=> 'RB',teamName:id=>'Team '+id,
  section1V130:{fair:(a,b)=>({score:eligible&&!eligible(a,b)?50:83,edgeEffective:110,aRaw:a.reduce((s,x)=>s+x.value,0),bRaw:b.reduce((s,x)=>s+x.value,0),aAdj:0,bAdj:0,aEffective:a.reduce((s,x)=>s+x.value,0),bEffective:b.reduce((s,x)=>s+x.value,0)+110,rejected:false})}
 };
 const ctx={window:win,document:doc,setTimeout:(cb)=>{yields++;return setTimeout(cb,0)},Math,Array,Set,Map,Number,String,Promise,console};
 vm.runInNewContext(source,ctx,{filename:'trade-specific-max-value-v279.js'});
 return {api:win.tradeSpecificMaxValueV279,elements,win,own,target,others,getYields:()=>yields};
}
test('index once for each sorted outgoing bucket, not once for every target-containing receive package',()=>{
 const {api}=runtime();
 const fake=Array.from({length:18000},(_,i)=>{
  const x={type:'player',id:'asset-'+(i%47),value:200+(i%47)*30};
  const y={type:'player',id:'peer-'+((i+7)%47),value:300+(i%53)*20};
  return{xs:[x,y],v:250+i*4};
 });
 const start=api.sourceIntegrityStats().structureIndexBuilds;
 for(let i=0;i<100;i++){
  const rows=api.structureCandidates(fake,4200+i*123,2,120);
  assert.ok(rows.length>0&&rows.length<=120);
  assert.ok(rows.every(r=>r.xs.length===2));
  assert.equal(new Set(rows.map(r=>r.xs.map(x=>x.id).sort().join('|'))).size,rows.length);
 }
 assert.equal(api.sourceIntegrityStats().structureIndexBuilds-start,1,'expensive package index must be reused across all incoming valuations');
});
test('real select-all + Jonathan Taylor target + maximum value + tier up completes, keeping target, owners, and 75-90 criteria',async()=>{
 const {api,elements,target,getYields}=runtime({outgoingCount:38,targetExtras:20});
 assert.equal(api.isActive(),true);
 const start=Date.now();
 await Promise.race([api.run(),new Promise((_,reject)=>setTimeout(()=>reject(Error('targeted search exceeded 12 seconds')),12000))]);
 assert.ok(Date.now()-start<12000);
 assert.doesNotMatch(elements.finderResults.innerHTML,/Searching maximum-value trades/,'search must stop spinning');
 assert.ok(getYields()>0,'search should yield to browser even when candidate screens reject rows');
 assert.ok(elements.finderResults.innerHTML.includes('No specific-player trade met')||elements.finderResults.innerHTML.includes('Jonathan Taylor'));
 assert.ok(api.sourceIntegrityStats().structureIndexBuilds<=3,'at most one index for each 1/2/3-asset outgoing bucket');
 const stats=api.sourceIntegrityStats().lastSearchStats;
 assert.ok(stats&&stats.elapsedMs<12000);
 assert.ok(stats.primary.fairnessChecks<=2200&&stats.primary.examined<=9000,'legacy pass must preserve its hard work limits');
 assert.ok(stats.primary.receiveScans<=72,'legacy pass must bound incoming packages');
 assert.ok(stats.fairnessChecks<=4200&&stats.examined<=16000&&stats.extensionScans<=144,'extension must remain bounded');
 assert.equal(target.owner,2);
});
test('every Max Value package still contains the target and no equity/consensus formula is replaced',()=>{
 assert.match(source,/function candidateOK\(f\)/);
 assert.match(source,/fs>=75&&fs<=90&&e>0/);
 assert.match(source,/function tierOK\(give,recv,tier,w\)/);
 assert.match(source,/const target=\(st\(\)\.allAssets\|\|\[\]\)\.find/);
 assert.match(source,/function incoming\(owner,target,limit=20\)/);
 assert.match(source,/out=\[\[target\]\]/);
 assert.match(source,/window\.section1V130\?\.fair\?\.\(a,b\)/);
 assert.match(source,/if\(my!==token\)return/);
});

test('assembled preview loads the updated Finder script rather than the stale browser cache key',()=>{
 assert.match(site,/trade-specific-max-value-v279\.js\?v=445/);
 assert.match(site,/trade-specific-max-tier-add-v300\.js\?v=303/);
 assert.match(site,/trade-finder-v256-compiled\.js\?v=450/);
 assert.match(site,/trade-specific-player-v232\.js\?v=441/);
});

test('adversarial expensive full-league fairness cannot leave the search spinner indefinitely',async()=>{
 const f=runtime({outgoingCount:95,targetExtras:20});
 let actualCalls=0;
 f.win.section1V130.fair=(give,recv)=>{
  actualCalls++;
  let checksum=0;
  for(let i=0;i<20000;i++)checksum+=i%7;
  return {score:83,edgeEffective:110+checksum%2,aRaw:1000,bRaw:1100,aAdj:0,bAdj:0,aEffective:1000,bEffective:1110,rejected:false};
 };
 const started=Date.now();
 await Promise.race([f.api.run(),new Promise((_,reject)=>setTimeout(()=>reject(Error('live Finder still stuck after 12s')),12000))]);
 const stats=f.api.sourceIntegrityStats().lastSearchStats;
 assert.ok(stats.elapsedMs<=11000,'hard deadline must terminate a slow real fairness engine');
 assert.ok(stats.primary.fairnessChecks<=2200);
 assert.ok(stats.primary.examined<=9000);
 assert.ok(stats.primary.receiveScans<=72);
 assert.ok(stats.fairnessChecks<=4200&&stats.examined<=16000&&stats.extensionScans<=144);
 assert.equal(actualCalls,stats.fairnessChecks);
 assert.doesNotMatch(f.elements.finderResults.innerHTML,/Searching maximum-value trades/);
 assert.ok(Date.now()-started<=12000);
});

// A low-value receiver outside the old top-20 extras is the only eligible
// complement. The legacy pass finds nothing; the additive pass must find it.
test('bounded extension reaches qualifying omitted incoming assets without weakening fairness',async()=>{
 const f=runtime({outgoingCount:15,targetExtras:25,eligible:(_give,recv)=>recv.length===2&&recv.some(x=>x.id==='in-0')});
 await f.api.run();
 const stats=f.api.sourceIntegrityStats().lastSearchStats;
 assert.equal(stats.primary.recommendations,0);
 assert.ok(stats.added>0,'no additional qualifying recommendations');
 assert.ok(stats.fairnessChecks<=4200&&stats.examined<=16000);
 assert.ok(stats.elapsedMs<12000);
 assert.match(f.elements.finderResults.innerHTML,/Incoming 0/);
});
