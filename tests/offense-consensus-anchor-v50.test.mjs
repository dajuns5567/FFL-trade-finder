import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../valuation-offense-v40.js',import.meta.url),'utf8');
const precisionSource=readFileSync(new URL('../combined-market-precision-v386.js',import.meta.url),'utf8');
function fixture(rows){
  const byId={},detailsById={};
  for(const r of rows){if(r.c!=null)byId[r.id]=r.c;detailsById[r.id]={offenseRank:r.rank??100}}
  const master=rows.map(r=>({x:{id:r.id,type:'player',pos:r.pos},value:r.priorValue??500,
    context:r.context??r.c??500,production:{ageFactor:r.ageFactor??1,
      correctedAudit:{value:r.production,qualifyingSeasons:r.seasons}}}));
  const sandbox={window:{assetCurveAudit:raw=>({exact:raw,curved:Math.round(raw)})},
    state:{consensusComposite:{byId,detailsById}},groupPos:x=>x.pos,
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
