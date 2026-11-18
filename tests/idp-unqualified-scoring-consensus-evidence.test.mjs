import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
const C='13466',L='8659';
function model(){
 const details={
  [C]:{qualifyingSeasons:0,seasons:[],confidence:0},
  [L]:{qualifyingSeasons:4,historicalSeasons:3,confidence:1,
   seasons:[
    {season:2026,currentSeason:true,games:9,ppg:10.7222,points:96.5,assignedWeight:.4,breakdown:{}},
    {season:2025,currentSeason:false,games:16,ppg:14.353,points:229.65,assignedWeight:.3,breakdown:{}},
    {season:2024,currentSeason:false,games:13,ppg:6.769,points:88,assignedWeight:.2,breakdown:{}},
    {season:2023,currentSeason:false,games:14,ppg:12.664,points:177.3,assignedWeight:.1,breakdown:{}}
   ]}
 };
 const players={
  [C]:{player_id:C,position:'DE',fantasy_positions:['DL'],age:23,years_exp:0},
  [L]:{player_id:L,position:'LB',fantasy_positions:['LB'],age:27,years_exp:4}
 };
 const ctx={
  console,Date,Math,Number,String,Set,Map,
  state:{players,stats:{2026:{[C]:{},[L]:{}},2025:{[L]:{}}},league:{},
   consensusComposite:{detailsById:{[C]:{idpSources:['DraftSharks IDP']},[L]:{idpSources:['The IDP Show Combined IDP']}}}},
  groupPos:()=> 'IDP',playerName:id=>id===C?'Keyron Crawford':'Nate Landman',
  masterRankings:()=>[
   {x:{type:'player',id:C},value:400,consensus:157,context:660},
   {x:{type:'player',id:L},value:400,consensus:174,context:720}
  ],
  masterRankCache:null,valueCache:new Map(),fitCache:new Map(),stageCache:new Map(),
  playerRankValue:()=>{},baseValue:()=>{},assetLabel:()=>{}
 };
 ctx.window={idpScoringAudit:id=>details[String(id)]||null};
 vm.runInNewContext(source,ctx,{filename:'valuation-idp-v25-perf.js'});
 return new Map(ctx.masterRankings().map(z=>[String(z.x.id),z]));
}
test('a ranked rookie with a real but isolated dynasty source does not get synthetic 520-point NFL production',()=>{
 const row=model().get(C);
 assert.equal(row.consensus,157,'verified dynasty consensus stays in its own 20% IDP bucket');
 assert.equal(row.production.value,180);
 assert.equal(row.production.idpEffectiveFallbackScoringV73,180);
 assert.equal(row.production.idpNoQualifiedSleeperScoringV95,true);
 assert.equal(row.production.idpUnverifiedNoConsensusFallbackV73,false,
  'single listed source remains distinct from missing dynasty consensus');
});
test('season-qualified veteran retains real scoring evidence, never downgraded to unverified floor',()=>{
 const rows=model(),rookie=rows.get(C),veteran=rows.get(L);
 assert.equal(veteran.consensus,174);
 assert.equal(veteran.production.idpNoQualifiedSleeperScoringV95,false);
 assert.ok(veteran.production.value>180);
 assert.ok(Number(veteran.production.m.ppg)>0);
 assert.ok(veteran.value>rookie.value,
  'with identical synthetic owner context, verified four-season LB must outrank unqualified IDP');
});
test('missing scoring qualification never depends on whether consensus exists',()=>{
 assert.match(source,/noQualifiedScoring\?Math\.min\(score\.value,180\):score\.value/);
 assert.match(source,/!a\?\.qualifyingSeasons\|\|!d\.ppg\.length\)out=\{value:180/);
 assert.doesNotMatch(source,/out=\{value:520,a,m/);
});
