import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const idp=fs.readFileSync('valuation-idp-v21.js','utf8');
const ui=fs.readFileSync('ui-player-values-v139.js','utf8');
const index=fs.readFileSync('index.html','utf8');

function scoreWithCurrentGames(games,kind='idp'){
 const start=idp.indexOf('function realScore24(id,kind){'),end=idp.indexOf('function percentile24(',start);
 assert.ok(start>=0&&end>start);
 const source=idp.slice(start,end);
 const sample={season:2026,games,ppg:21.36875,premiumPpg:12,
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
 vm.runInNewContext(source+String.raw`
 const real=historyLabel('13363');
 const chris=idpIdentityLabel('1430');
 const kc=idpIdentityLabel('3558');
 [real,chris,kc];
 `,ctx);
 const out=vm.runInNewContext(source+"\n[historyLabel('13363'),idpIdentityLabel('1430'),idpIdentityLabel('3558')]",ctx);
 assert.match(out[0],/21\.4 actual 2026 PPG \(8 qualifying games\)/);
 assert.match(out[0],/7\.2 valuation-weighted PPG/);
 assert.match(out[1],/Sleeper ID 1430/);
 assert.match(out[1],/Inactive/);
 assert.match(out[2],/Sleeper ID 3558/);
 assert.doesNotMatch(out[2],/Inactive/);
});
test('consensus payload includes Sleeper primary and fantasy positions plus team identity',()=>{
 assert.match(index,/position:p\.position\|\|\(p\.fantasy_positions\|\|\[\]\)\[0\],positions:p\.fantasy_positions\|\|\[\],team:p\.team\|\|null/);
});
