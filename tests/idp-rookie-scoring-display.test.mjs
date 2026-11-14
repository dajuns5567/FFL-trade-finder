import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const idp=fs.readFileSync('valuation-idp-v21.js','utf8');
const ui=fs.readFileSync('ui-player-values-v139.js','utf8');
const index=fs.readFileSync('index.html','utf8');

function scoreWithCurrentGames(games,kind='idp',actualPpg=21.36875){
 const start=idp.indexOf('function realScore24(id,kind){'),end=idp.indexOf('function percentile24(',start);
 assert.ok(start>=0&&end>start);
 const source=idp.slice(start,end);
 const sample={season:2026,games,ppg:actualPpg,premiumPpg:12,
  assignedWeight:.18823529411764706,currentSeason:true};
 const ctx={
  historyPlan24:()=>({mode:'in-season',yearWeights:{2026:sample.assignedWeight,2025:.49607843137254903,2024:.22549019607843138,2023:.09019607843137256}}),
  scoreSeason24:(id,year,weight,cat)=>year===2026?{...sample,assignedWeight:weight}:null,
  seasonConfidence24:()=>.19,clamp24:(lo,x,hi)=>Math.max(lo,Math.min(x,hi)),
  Number,Math,Object,
 };
 return vm.runInNewContext(source+'\nrealScore24("rookie",'+JSON.stringify(kind)+')',ctx);
}
test('first qualifying game remains on original conservative weighting and confidence',()=>{
 const idpResult=scoreWithCurrentGames(1);
 assert.equal(idpResult.evidenceConfidenceFloor,0);
 assert.equal(idpResult.confidence,.19);
 assert.ok(idpResult.ppg<5,'one rookie game must not be annualized into elite production');
 assert.ok(idpResult.currentEffectiveShare<.2);
});
test('eight verified rookie games strengthen evidence without inventing historical seasons',()=>{
 const first=scoreWithCurrentGames(1),eight=scoreWithCurrentGames(8);
 assert.equal(eight.historicalSeasons,0);
 assert.equal(eight.seasons,1);
 assert.equal(eight.samples[0].ppg,21.36875);
 assert.ok(eight.confidence>first.confidence);
 assert.ok(eight.confidence<.6);
 assert.equal(eight.ppg,first.ppg,'confidence may change but scheduled scoring denominator remains unchanged');
 assert.equal(eight.verifiedRookieCoverage,7/13);
});
test('offense confidence and scoring untouched by IDP rookie enhancement',()=>{
 const a=scoreWithCurrentGames(1,'offense'),b=scoreWithCurrentGames(8,'offense');
 assert.equal(a.confidence,.19);
 assert.equal(b.confidence,.19);
 assert.equal(b.verifiedRookieCoverage,0);
});
test('IDP display labels actual Sleeper PPG separately from model valuation PPG',()=>{
 const start=ui.indexOf('function historyLabel(id){'),end=ui.indexOf('function rankedPlayers()',start);
 assert.ok(start>=0&&end>start);
 const source=ui.slice(start,end);
 const players={'13363':{full_name:'David Bailey',position:'LB',fantasy_positions:['DL','LB'],team:'NYJ'},
 '3558':{full_name:'Chris Jones',position:'DT',fantasy_positions:['DL'],team:'KC',active:true},
 '1430':{full_name:'Chris Jones',position:'DT',fantasy_positions:['DL'],active:false}};
 const window={idpScoringAudit:id=>id==='13363'?{
  ppg:7.2,qualifyingSeasons:1,confidence:.39,productionValue:310,
  seasons:[{season:2026,games:8,currentSeason:true,ppg:21.36875}]
 }:null};
 const state={players};
 const ctx={window,state,groupPos:x=>'IDP',rawScore:()=>({}),playerName:id=>players[id].full_name,
  normText:x=>String(x).toLowerCase(),Number,Object,String,Map};

 const out=vm.runInNewContext(source+"\n[historyLabel('13363'),idpIdentityLabel('1430'),idpIdentityLabel('3558')]",ctx);
 assert.match(out[0],/21\.4 league-scored 2026 PPG \(8 qualifying games\)/);
 assert.match(out[0],/7\.2 valuation-weighted PPG/);
 assert.match(out[1],/Sleeper ID 1430/);
 assert.match(out[1],/Inactive/);
 assert.match(out[2],/Sleeper ID 3558/);
 assert.doesNotMatch(out[2],/Inactive/);
});
test('consensus payload includes Sleeper primary and fantasy positions plus team identity',()=>{
 assert.match(index,/position:p\.position\|\|\(p\.fantasy_positions\|\|\[\]\)\[0\],positions:p\.fantasy_positions\|\|\[\],team:p\.team\|\|null/);
});

test('every IDP audit lookup refuses ambiguous Chris Jones names yet accepts exact Sleeper IDs',()=>{
 for(const path of ['valuation-idp-v21.js','valuation-idp-v25.js','valuation-idp-v25-perf.js']){
  const source=fs.readFileSync(path,'utf8');
  const start=source.indexOf('window.idpScoringAudit=function(nameOrId){');
  assert.ok(start>=0,path+' defines a scoring audit');
  const first=source.indexOf('const q=String(nameOrId',start);
  const end=source.indexOf('if(!id)return null;',first);
  assert.ok(first>start&&end>first,path+' resolves the scoring identity');
  const resolution=source.slice(first,end);
  const ctx={
   state:{players:{'3558':{},'1430':{},'13363':{}}},
   playerName:id=>({'3558':'Chris Jones','1430':'Chris Jones','13363':'David Bailey'})[id],
   String,Object
  };
  const resolve=query=>vm.runInNewContext(
   '(function(nameOrId){'+resolution+'return id;})('+JSON.stringify(query)+')',ctx);
  assert.equal(resolve('Chris Jones'),null,path+' cannot select the first Chris Jones by guess');
  assert.equal(resolve('3558'),'3558',path+' accepts unique KC player ID');
  assert.equal(resolve('1430'),'1430',path+' accepts distinct Chris Jones ID');
  assert.equal(resolve('David Bailey'),'13363',path+' permits an unambiguous name');
 }
 const site=fs.readFileSync('netlify/functions/site-v17.mjs','utf8');
 assert.match(site,/valuation-idp-v25-perf\.js\?v=20261114-idp-identity/,
  'all pages must load the refreshed identity-safe scoring audit');
});

test('the evidence correction applies to every current-only IDP, not a named player',()=>{
 // Frozen canonical Sleeper 2026 season sample from sleeper-data branch.
 // All twelve IDs had 6+ games, >=12 Sleeper IDP PPG, and no 8+ game
 // qualifying season in 2023, 2024 or 2025 when this audit was collected.
 const cases=[
  ['13377',8,185],['13363',8,165],['13453',8,142],
  ['13379',8,139],['13375',8,136],['13365',8,131],
  ['13482',9,133],['12588',6,84],['13371',9,117],
  ['13376',9,115],['13369',9,109],['13508',7,84]
 ];
 for(const [id,games,points] of cases){
  const ppg=points/games;
  const first=scoreWithCurrentGames(1,'idp',ppg);
  const actual=scoreWithCurrentGames(games,'idp',ppg);
  assert.equal(actual.seasons,1,id+' has only current qualifying evidence');
  assert.equal(actual.historicalSeasons,0,id+' has no invented prior history');
  assert.ok(actual.confidence>first.confidence,id+' gains confidence as verified games accumulate');
  assert.ok(actual.confidence>=Math.min(1,(games-1)/13)*.72-1e-10,id+' meets evidence confidence floor');
  assert.equal(actual.samples[0].ppg,ppg,id+' retains actual game production');
  assert.equal(actual.ppg,first.ppg,id+' keeps scheduled multi-year scoring denominator');
  assert.ok(actual.ppg<ppg,id+' distinguishes weighted PPG from true production');
 }
});
test('all current-only IDP rookies share monotone, bounded confidence across a full season',()=>{
 let prior=0;
 for(let games=1;games<=18;games++){
  const current=scoreWithCurrentGames(games);
  assert.ok(current.confidence>=prior-1e-10,'confidence cannot decrease at '+games+' games');
  assert.ok(current.confidence<=1,'confidence cannot exceed one at '+games+' games');
  if(games===1)assert.equal(current.confidence,.19);
  if(games>=8)assert.ok(current.confidence>.35);
  assert.equal(current.historicalSeasons,0);
  prior=current.confidence;
 }
});
test('raising rookie confidence never invents historical seasons or reallocates scheduled weights',()=>{
 const current=scoreWithCurrentGames(8);
 assert.equal(current.historicalSeasons,0);
 assert.equal(current.seasons,1);
 assert.equal(current.samples.length,1);
 assert.equal(current.weightAmplification,1);
});

test('every imported current-only IDP uses the same confidence and evidence rules',()=>{
 const fixture=JSON.parse(fs.readFileSync('tests/fixtures/idp-current-only-sleeper-2026.json','utf8'));
 assert.equal(fixture.record_count,262);
 assert.equal(fixture.records.length,fixture.record_count);
 const ids=new Set(),impacted=[];
 for(const record of fixture.records){
  const {id,qualifiedGames,sleeperIdpPoints}=record;
  assert.ok(!ids.has(id),'duplicate Sleeper ID '+id);
  ids.add(id);
  assert.ok(Number.isInteger(qualifiedGames)&&qualifiedGames>=1&&qualifiedGames<=18,id+' game-count integrity');
  assert.ok(Number.isFinite(sleeperIdpPoints),id+' points integrity');
  const ppg=sleeperIdpPoints/qualifiedGames;
  const before=scoreWithCurrentGames(1,'idp',ppg);
  const after=scoreWithCurrentGames(qualifiedGames,'idp',ppg);
  const evidenceFloor=Math.min(1,Math.max(0,(qualifiedGames-1)/13))*.72;
  assert.equal(after.historicalSeasons,0,id+' cannot acquire invented historical seasons');
  assert.equal(after.seasons,1,id+' has exactly one current-year sample');
  assert.equal(after.samples[0].ppg,ppg,id+' game production preserved');
  assert.ok(after.confidence+1e-10>=before.confidence,id+' confidence cannot drop');
  assert.ok(after.confidence+1e-10>=evidenceFloor,id+' gets game-supported evidence floor');
  assert.equal(after.ppg,before.ppg,id+' scheduled scoring weights never reallocated');
  if(qualifiedGames>=6&&ppg>=12)impacted.push(id);
 }
 assert.equal(impacted.length,12,'the observed high-production cohort must be fully covered');
 assert.ok(impacted.includes('13363'),'Bailey is a member, not a special-cased exception');
});

test('higher evidence confidence helps genuine high-producing IDPs without blanket value inflation',()=>{
 const src=fs.readFileSync('valuation-idp-v25-perf.js','utf8');
 const begin=src.indexOf('function scoring25(id){'),end=src.indexOf('function context25(',begin);
 assert.ok(begin>=0&&end>begin);
 const code=src.slice(begin,end);
 const distribution=[5,7,9,10,12,14,16,18];
 const percentile=(arr,x)=>Math.max(.01,Math.min(.99,
  (arr.filter(y=>y<x).length+.5*arr.filter(y=>y===x).length)/arr.length));
 const run=(productionPpg,confidence)=>{
  const context={
   generation25:()=>{},scoreCache25:new Map(),
   baseAudit25:()=>({qualifyingSeasons:1,historicalSeasons:0}),
   metrics25:()=>({ppg:productionPpg,confidence,coverage:.188,seasons:1}),
   distributions25:()=>({ppg:distribution,p50:11,p99:17.86,rolePpg:{}}),
   role25:()=> 'EDGE',pct25:percentile,
   clamp25:(min,x,max)=>Math.max(min,Math.min(x,max)),
   Math,Number
  };
  return vm.runInNewContext(code+'\\nscoring25("representative-idp")',context);
 };
 const highEarly=run(20.625,.19),highVerified=run(20.625,.39);
 assert.ok(highVerified.value>highEarly.value,'real high production benefits from more verified games');
 const lowEarly=run(5,.19),lowVerified=run(5,.39);
 assert.ok(lowVerified.value<=lowEarly.value,'more evidence of weak production must not inflate value');
 assert.ok(highVerified.value>lowVerified.value,'IDP values remain sensitive to actual scoring');
});
