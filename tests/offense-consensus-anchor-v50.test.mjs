import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../valuation-offense-v40.js',import.meta.url),'utf8');
const precisionSource=readFileSync(new URL('../combined-market-precision-v386.js',import.meta.url),'utf8');
function fixture(rows){
  const byId={},detailsById={};
  for(const r of rows){if(r.c!=null)byId[r.id]=r.c;detailsById[r.id]={offenseRank:r.rank??100,offenseSources:r.sources??[]}}
  const master=rows.map(r=>({x:{id:r.id,type:'player',pos:r.pos},value:r.priorValue??500,
    context:r.context??r.c??500,production:{ageFactor:r.ageFactor??1,
      correctedAudit:{value:r.production,qualifyingSeasons:r.seasons}}}));
  const sandbox={window:{assetCurveAudit:raw=>({exact:raw,curved:Math.round(raw)})},
    state:{consensusComposite:{byId,detailsById},rankings:{'FantasyPros':{updated:'2026-11-10T00:00:00.000Z'},'KTC':{updated:'2026-01-01T00:00:00.000Z'}},players:Object.fromEntries(rows.map(r=>[r.id,{age:r.age??null}]))},groupPos:x=>x.pos,
    masterRankings:()=>master,ensureMaster:()=>master,masterRankCache:null,
    playerRankValue:()=>({}),baseValue:()=>0,playerName:()=>'',pickValue:()=>30,
    valueCache:new Map(),fitCache:new Map(),stageCache:new Map()};
  runInNewContext(source,sandbox,{filename:'valuation-offense-v40.js'});
  return{rows:sandbox.masterRankings(),sandbox};
}
const row=(id,pos,c,seasons,production,extras={})=>({id,pos,c,seasons,production,...extras});

test('every covered offensive position uses the consensus-first terminal, IDP remains unchanged',()=>{
  const inputs=[row('q','QB',1000,4,500),row('r','RB',700,2,1050),
    row('w','WR',800,1,90),row('t','TE',600,0,null),row('d','IDP',650,4,2200,{priorValue:1444})];
  const {rows}=fixture(inputs),byId=Object.fromEntries(rows.map(r=>[r.x.id,r]));
  for(const id of ['q','r','w','t']){
    assert.equal(byId[id].production.offenseConsensusAnchorV50,true);
    assert.equal(byId[id].production.modelWeights.consensus,.70);
    const c=inputs.find(r=>r.id===id).c;
    assert.ok(byId[id].value>=c*.89&&byId[id].value<=c*1.13);
  }
  assert.equal(byId.d.value,1444);
  assert.equal(byId.d.production.offenseConsensusAnchorV50,undefined);
});
test('no history is neutral; one year is weaker evidence than four',()=>{
  const rs=[row('none','WR',800,0,null),row('one','WR',800,1,100),
    row('four','WR',800,4,100)];
  const byId=Object.fromEntries(fixture(rs).rows.map(r=>[r.x.id,r]));
  assert.equal(byId.none.value,800);
  assert.ok(byId.one.value>byId.four.value);
  assert.ok(byId.one.value<800);
});
test('source missing is never replaced by an invented consensus',()=>{
  const r=fixture([row('missing','WR',null,1,900,{priorValue:110})]).rows[0];
  assert.equal(r.value,110);
  assert.equal(r.production.offenseConsensusAnchorV50,undefined);
});
test('every offense confidence cohort and position has safe finite values',()=>{
  const positions=['QB','RB','WR','TE'],rs=[];
  for(const pos of positions)for(const seasons of [0,1,2,3,4])
    for(let i=0;i<25;i++)rs.push(row(pos+'-'+seasons+'-'+i,pos,400+i*24,seasons,
      i%2?(100+i*8):(1900-i*19),{context:300+i*45,ageFactor:i%2?.88:1.1}));
  for(const r of fixture(rs).rows){
    const c=rs.find(x=>x.id===r.x.id).c;
    assert.ok(Number.isFinite(r.value));
    assert.ok(r.value>=Math.round(c*.90)-1&&r.value<=Math.round(c*1.12)+1,
      r.x.id+': '+r.value);
  }
});
test('market precision prefers V50 full-precision outcome to old stale terminal',()=>{
  assert.match(precisionSource,/\['offenseConsensusAnchorV50','offenseTerminalExactV50'\]/);
  const sandbox={window:{},groupPos:x=>x.pos,masterRankings:()=>[],ensureMaster:()=>[],
    masterRankCache:null,valueCache:new Map(),fitCache:new Map(),stageCache:new Map()};
  runInNewContext(precisionSource,sandbox,{filename:'combined-market-precision-v386.js'});
  const z={x:{id:'wr',pos:'WR'},value:600,
    production:{offenseConsensusAnchorV50:true,offenseTerminalExactV50:630.25,
      youngCalibrationV47:true,offenseTerminalExactV47:950}};
  const val=sandbox.window.combinedMarketPrecisionV386.precisionValue(z);
  assert.equal(val.value,630.25);
  const idp={x:{id:'def',pos:'IDP'},value:400,
    production:{idpOverallTradeCurveExactV72:412.5}};
  assert.equal(sandbox.window.combinedMarketPrecisionV386.precisionValue(idp).value,412.5);
});

test('audit explains verified per-player source coverage and available age without modifying the model',()=>{
  const {rows}=fixture([row('denzel','WR',714,1,834,
    {age:22,sources:['FantasyPros','KTC'],rank:86})]);
  const p=rows[0].production;
  assert.equal(p.consensusSourceCountV50,2);
  assert.deepEqual([...p.consensusSourcesV50],['FantasyPros','KTC']);
  assert.equal(p.ageYearsV50,22);
  assert.equal(p.consensusSourceRankV50,86);
  assert.equal(p.productionSeasonsV50,1);
});

test('V384 zero-source coverage fallback cannot be overwritten by terminal V50',()=>{
  const {sandbox}=fixture([row('fuzzy','WR',603,0,null,{priorValue:42})]);
  const z={x:{id:'fuzzy',pos:'WR'},value:42,coverageGate384:true,
    production:{correctedAudit:{qualifyingSeasons:0,value:603}}};
  const result=sandbox.window.offenseConsensusAnchorV50.rebuild(z);
  assert.equal(result,z,'verified coverage fallback object and numeric value must be preserved');
});
test('missing-source penalty is not counted as an actual independent ranking source',()=>{
  const {rows}=fixture([row('te','TE',600,2,750,
    {sources:['FantasyPros','DraftSharks (not listed)','KTC']})]);
  assert.equal(rows[0].production.consensusSourceCountV50,2);
  assert.equal(rows[0].production.consensusNotListedPenaltyCountV50,1);
});

test('source recency audit uses actual snapshot updated field, not guessed refresh age',()=>{
  const {rows}=fixture([row('one','WR',800,1,800,{sources:['FantasyPros','KTC','No timestamp','DraftSharks (not listed)']})]);
  const p=rows[0].production;
  assert.equal(p.consensusSnapshotsV50.length,3);
  assert.equal(p.consensusUnknownSnapshotDatesV50,1);
  assert.equal(p.consensusSourcesOlderThan30DaysV50,1);
  assert.equal(p.consensusSnapshotsV50.find(x=>x.source==='FantasyPros').snapshotUpdatedAt,'2026-11-10T00:00:00.000Z');
  assert.equal(p.consensusSnapshotsV50.find(x=>x.source==='No timestamp').ageDays,null);
});
