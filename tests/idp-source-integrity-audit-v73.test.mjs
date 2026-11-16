import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
const start=src.indexOf('window.idpSourceIntegrityAuditV73=function()');
const end=src.indexOf("const card=document.querySelector('#settings .card')",start);
assert.ok(start>=0&&end>start,'read-only source audit must be callable from active IDP code');
const code=src.slice(start,end);
function fixture(){
 const state={players:{
  'a':{position:'LB',team:null,age:27,years_exp:4},
  'b':{position:'DE',team:'DAL',age:24,years_exp:2},
  'c':{position:'DE',team:'NYG',age:23,years_exp:1},
  'd':{position:'LB',team:'CHI',age:24,years_exp:2},
  'qb':{position:'QB',team:'BUF',age:29,years_exp:8},
 },consensusComposite:{detailsById:{a:{idpSources:['IDP Show']},b:{idpSources:['IDP Show','Source B (not listed)']},c:{idpSources:[]},d:{idpSources:[]}}}};
 const master=[
  {x:{type:'player',id:'a'},value:258,consensus:358,production:{}},
  {x:{type:'player',id:'b'},value:255,consensus:620,production:{}},
  {x:{type:'player',id:'c'},value:200,consensus:null,production:{idpUnverifiedNoConsensusFallbackV73:true,idpEffectiveFallbackScoringV73:180}},
  {x:{type:'player',id:'d'},value:180,consensus:null,production:{}},
  {x:{type:'player',id:'qb'},value:999,consensus:1000,production:{}},
 ];
 const audits={
  a:{qualifyingSeasons:0,seasons:[],confidence:0},
  b:{qualifyingSeasons:1,seasons:[{season:2026,currentSeason:true,games:2,ppg:22.5}],confidence:.42},
  c:{qualifyingSeasons:0,seasons:[],confidence:0},
  d:{qualifyingSeasons:2,seasons:[{season:2026,currentSeason:true,games:9,ppg:12.2}],confidence:.74},
 };
 const sandbox={window:{},state,Math,Number,Array,String,Set,Date,Map,
  ensureMaster:()=>master,groupPos:x=>x.id==='qb'?'QB':'IDP',
  isIndividualIdp25:()=>true,baseAudit25:id=>audits[id],
  playerName:id=>({a:'Josh Allen',b:'Player B',c:'Player C',d:'Player D',qb:'Josh Allen'})[id]
 };
 vm.runInNewContext(code,sandbox);
 return sandbox.window.idpSourceIntegrityAuditV73();
}
test('audit examines only defensive player universe and does not confuse the QB/IDP names',()=>{
 const r=fixture();
 assert.equal(r.readOnly,true);
 assert.equal(r.summary.rankedIdp,4);
 assert.equal(r.summary.withConsensus,2);
 assert.equal(r.flags.filter(x=>x.kind==='same-canonical-idp-name').length,0);
 assert.deepEqual(Array.from(r.rows,x=>x.id),['a','b','c','d']);
});
test('source, evidence and missing-history cohorts are distinct and fully auditable',()=>{
 const r=fixture();
 assert.equal(r.summary.missingConsensusAndScoring,1);
 assert.equal(r.summary.missingConsensusWithVerifiedScoring,1);
 assert.equal(r.summary.publisherConsensusWithoutScoring,1);
 assert.equal(r.rows.find(x=>x.id==='c').effectiveScoringFallback,180);
 assert.deepEqual(Array.from(r.rows.find(x=>x.id==='b').sources),['IDP Show']);
 assert.ok(r.flags.some(x=>x.kind==='small-current-scoring-sample'&&x.id==='b'));
 assert.ok(r.flags.some(x=>x.kind==='publisher-consensus-no-scoring-or-team'&&x.id==='a'));
});
test('integrity audit is inspection only, not a second ranking engine',()=>{
 assert.doesNotMatch(code,/masterRankings\s*=|baseValue\s*=|\.sort\s*\(/);
 assert.doesNotMatch(code,/fetch\s*\(|POST|setJSON|Math\.random/);
 assert.match(code,/sourceCount:new Set\(observedSources\)\.size/);
});
