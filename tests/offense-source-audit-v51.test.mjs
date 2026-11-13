import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../offense-source-audit-v51.js',import.meta.url),'utf8');
function fixture(){
  const window={};
  const context={window,Date,Math,Set,Map,Object,String,Number,Array,JSON,console};
  vm.runInNewContext(source,context,{filename:'offense-source-audit-v51.js'});
  return window.fflOffenseSourceAuditV51;
}
const vals=(players,details,masterRows)=>({
  players:Object.fromEntries(players.map(p=>[p.id,p])),
  consensusComposite:{byId:Object.fromEntries(details.map(d=>[d.id,d.consensusCompositeValue])),detailsById:Object.fromEntries(details.map(d=>[d.id,d]))},
  rankings:{'FantasyPros':{data:{'player one':1},updated:'2026-11-11T00:00:00Z'},'KTC':{data:{'player one':5}}},
  masterRows,capturedAt:'2026-11-11T00:00:00Z'
});
test('audits offense only; IDP never counted or revalued; ranks have distinct universes',()=>{
  const a=fixture();
  const input=vals([
    {id:'wr',first_name:'Player',last_name:'One',fantasy_positions:['WR'],team:'CLE'},
    {id:'lb',first_name:'Defense',last_name:'One',fantasy_positions:['LB']}
  ],[
    {id:'wr',offenseRank:4,consensusCompositeValue:550,offenseSourceEvidence:[
      {source:'FantasyPros',rank:1,weight:1,listed:true},{source:'KTC',rank:5,weight:.5,listed:true},
      {source:'DraftSharks (not listed)',rank:6,weight:.6,listed:false}]}
  ],[
    {x:{id:'lb'},value:1000},{x:{id:'wr'},value:900}
  ]);
  const out=a.build(input);
  assert.equal(out.summary.totalOffense,1);
  assert.equal(out.players[0].name,'Player One');
  assert.equal(out.players[0].position,'WR');
  assert.equal(out.players[0].overallRank,2);
  assert.equal(out.players[0].offenseOnlyRank,1);
  assert.equal(out.players[0].consensusOffenseRank,4);
  assert.equal(out.players[0].modelValue,900);
  assert.equal(out.players[0].sourceRanks.DraftSharks.status,'not-listed-penalty');
  assert.equal(out.players[0].sourceRanks.DraftSharks.rank,null);
  assert.equal(out.players[0].sourceRanks['The IDP Show Combined Offense'].rank,null);
  assert.equal(out.players[0].sourceRankSpread,4);
  assert.equal(out.summary.bySource.FantasyPros.listedPlayers,1);
  assert.equal(out.summary.bySource.KTC.listedPlayers,1);
  assert.equal(out.summary.bySource.DraftSharks.notListedPenaltyPlayers,1);
  assert.equal(input.masterRows[1].value,900,'audit does not mutate valuation');
});
test('flags substantial disagreements but does not invent missing source ranks',()=>{
  const a=fixture();
  const input=vals([{id:'p',first_name:'Rookie',last_name:'Example',fantasy_positions:['RB']}],[
    {id:'p',offenseRank:70,consensusCompositeValue:390,offenseSourceEvidence:[
      {source:'FantasyPros',rank:10,weight:1,listed:true},
      {source:'KTC',rank:130,weight:.5,listed:true}]}
  ],[{x:{id:'p'},value:390}]);
  const out=a.build(input),p=out.players[0];
  assert.equal(p.sourceRankSpread,120);
  assert.ok(p.flags.includes('source-rank-spread-100-plus'));
  assert.equal(out.summary.rankSpread100,1);
  assert.equal(p.sourceRanks.FanRanked.rank,null);
  assert.equal(p.missingSourceNames.length,3);
  assert.equal(out.priorityReview.length,1);
  assert.equal(out.interpretation.sensitivity.includes('diagnostic only'),true);
});
test('no consensus and missing evidence remain conservative, never fabricated',()=>{
  const a=fixture();
  const out=a.build(vals([{id:'p',first_name:'Unranked',last_name:'Player',fantasy_positions:['QB']}],[],
    [{x:{id:'p'},value:1,coverageGate384:true}]));
  assert.equal(out.players[0].observedSourceCount,0);
  assert.equal(out.players[0].consensusOffenseRank,null);
  assert.equal(out.summary.missingAllSources,1);
  assert.ok(out.players[0].flags.includes('exact-coverage-fallback'));
});
test('browser page includes a wired downloadable read-only audit before boot',()=>{
  const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const loader=readFileSync(new URL('../netlify/functions/site-v17.mjs',import.meta.url),'utf8');
  assert.ok(page.includes('id="offenseSourceAuditDownload"'));
  assert.ok(page.includes('fflOffenseSourceAuditV51'));
  assert.ok(page.includes('masterRows:ensureMaster()'));
  assert.ok(loader.includes('/offense-source-audit-v51.js?v=51'));
  assert.ok(loader.indexOf('/offense-source-audit-v51.js?v=51')<loader.lastIndexOf('window.__fllDeferredBoot()'));
  assert.ok(!source.includes('updateData()'));
  assert.ok(!source.includes('refreshConsensus()'));
});

test('high-impact disagreement requires three peers and triages top 150 ahead of depth',()=>{
  const a=fixture(),src=['FantasyPros','DraftSharks','The IDP Show Combined Offense','KTC','FanRanked'];
  const players=Array.from({length:160},(_,i)=>({
    id:String(i+1),first_name:'Player',last_name:String(i+1),fantasy_positions:['WR']
  }));
  const masterRows=players.map(p=>({x:{id:p.id},value:600}));
  const details=players.map((p,i)=>({
    id:p.id,offenseRank:i+1,consensusCompositeValue:600,
    offenseSourceEvidence:src.map((name,j)=>({
      source:name,weight:1,listed:true,
      rank:(i===61&&j===2)?133:(i===154&&j===2)?250:i+1
    }))
  }));
  const out=a.build(vals(players,details,masterRows));
  assert.equal(out.summary.totalOffense,160);
  assert.equal(out.highImpactDisagreements.thresholdRank,150);
  const flagged=out.highImpactDisagreements.rows;
  assert.equal(flagged.length,1,'deep ranked players do not count as high-impact disagreements');
  assert.equal(flagged[0].name,'Player 62');
  assert.equal(flagged[0].source,'The IDP Show Combined Offense');
  assert.equal(flagged[0].sourceRank,133);
  assert.equal(flagged[0].peerMedian,62);
  assert.equal(flagged[0].peerCount,4);
  assert.equal(flagged[0].signedDifference,71);
  assert.equal(out.highImpactDisagreements.bySource['The IDP Show Combined Offense'].outliers40,1);
  assert.ok(out.priorityReview[0].offenseOnlyRank<=150);
});
test('two peer sources alone are insufficient to call a ranking an outlier',()=>{
  const a=fixture(),data=vals([{id:'p',first_name:'Example',last_name:'Test',fantasy_positions:['TE']}],
    [{id:'p',offenseRank:70,consensusCompositeValue:600,offenseSourceEvidence:[
      {source:'FantasyPros',rank:10,weight:1,listed:true},
      {source:'DraftSharks',rank:100,weight:1,listed:true},
      {source:'KTC',rank:8,weight:1,listed:true}
    ]}],
    [{x:{id:'p'},value:600}]);
  const out=a.build(data);
  assert.equal(out.players[0].sourceRankSpread,92);
  assert.equal(out.highImpactDisagreements.rows.length,0);
  assert.equal(out.highImpactDisagreements.bySource.DraftSharks.measured,0);
});

test('outlier protection audit exposes base/effective weights and the unchanged original rank',()=>{
  const a=fixture(),input=vals([{id:'p',first_name:'Example',last_name:'WR',fantasy_positions:['WR']}],
    [{id:'p',offenseRank:41,consensusCompositeValue:900,offenseSourceEvidence:[
      {source:'FantasyPros',rank:30,weight:1,baseWeight:1,listed:true},
      {source:'DraftSharks',rank:35,weight:1,baseWeight:1,listed:true},
      {source:'The IDP Show Combined Offense',rank:133,weight:.25,baseWeight:1,outlierProtected:true,listed:true},
      {source:'KTC',rank:25,weight:.5,baseWeight:.5,listed:true}
    ],offenseOutlierAdjustments:[{
      source:'The IDP Show Combined Offense',rank:133,peerMedian:30,deviation:103,
      originalWeight:1,adjustedWeight:.25,reason:'independent peers agree'
    }]}],[{x:{id:'p'},value:900}]);
  const out=a.build(input),p=out.players[0],e=p.sourceRanks['The IDP Show Combined Offense'];
  assert.equal(out.summary.outlierProtectedPlayers,1);
  assert.equal(out.summary.outlierProtectedBySource['The IDP Show Combined Offense'],1);
  assert.equal(e.rank,133);
  assert.equal(e.weight,.25);
  assert.equal(e.baseWeight,1);
  assert.equal(e.outlierProtected,true);
  assert.equal(p.outlierAdjustments[0].peerMedian,30);
  assert.equal(input.consensusComposite.detailsById.p.offenseSourceEvidence[2].weight,.25,'export does not mutate source evidence');
});
