const fs=require('fs'),vm=require('vm');
function assert(x,m){if(!x)throw new Error(m)}
const rows=[
  {x:{type:'player',id:'o0',pos:'WR'},value:1000,tag:'zero-high'},
  {x:{type:'player',id:'i1',pos:'IDP'},value:950,tag:'idp-one'},
  {x:{type:'player',id:'o1',pos:'QB'},value:900,tag:'covered-one'},
  {x:{type:'player',id:'o2',pos:'RB'},value:850,tag:'covered-two'},
  {x:{type:'player',id:'i2',pos:'IDP'},value:800,tag:'idp-two'},
  {x:{type:'player',id:'o3',pos:'TE'},value:750,tag:'zero-low'},
  {x:{type:'player',id:'o4',pos:'WR'},value:700,tag:'covered-three'}
];
const original=rows.map(z=>z);
const ctx={console};ctx.window=ctx;
ctx.state={consensusComposite:{detailsById:{
  o1:{offenseRank:12,offenseSources:['A','B']},
  o2:{offenseRank:180,offenseSources:['A']},
  o4:{offenseRank:260,offenseSources:['C']},
  // IDP has no offensive coverage on purpose. It must never enter the offense gate.
  i1:{idpRank:40,idpSources:['IDP Source']}
}}};
ctx.groupPos=x=>x?.pos||'IDP';
ctx.masterRankCache=null;ctx.valueCache=new Map();ctx.fitCache=new Map();ctx.stageCache=new Map();
ctx.masterRankings=()=>rows.map(z=>z);
ctx.ensureMaster=()=>ctx.masterRankCache||(ctx.masterRankCache=ctx.masterRankings());
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('offense-consensus-coverage-gate-v384.js','utf8'),ctx,{filename:'offense-consensus-coverage-gate-v384.js'});
const out=ctx.ensureMaster(),api=ctx.offenseConsensusCoverageGateV384;
assert(api&&api.version===384,'V384 gate API missing');
assert(out.length===rows.length,'gate changed valuation-universe size');

// The global numeric slot sequence must be identical. This is the isolation guarantee
// that keeps the downstream modeled-value curve and IDP numeric values unchanged.
assert(out.every((z,i)=>z.value===rows[i].value),'gate changed an approved numeric value slot');

// IDP must be literally untouched: same player, same row object, same index, same value.
for(const idx of [1,4]){
  assert(out[idx]===original[idx],`IDP row at index ${idx} was modified or moved`);
  assert(out[idx].x.id===rows[idx].x.id&&out[idx].value===rows[idx].value,`IDP identity/value changed at index ${idx}`);
}
assert(api.offenseCoverage('i1')===false,'IDP consensus data leaked into offense coverage detection');

// All offense with any real offensive consensus coverage must precede all zero-coverage offense.
const offense=out.filter(z=>['QB','RB','WR','TE'].includes(z.x.pos));
const ids=offense.map(z=>z.x.id);
assert(JSON.stringify(ids)===JSON.stringify(['o1','o2','o4','o0','o3']),'covered offense does not fully precede zero-consensus offense: '+ids.join(','));

// Existing model/scoring order inside each cohort is preserved.
assert(ids.indexOf('o1')<ids.indexOf('o2')&&ids.indexOf('o2')<ids.indexOf('o4'),'covered-offense prior order changed');
assert(ids.indexOf('o0')<ids.indexOf('o3'),'zero-consensus offense model/scoring order changed');

// No synthetic rank fallback is introduced here; IDP continues through the pre-existing IDP model.
const src=fs.readFileSync('offense-consensus-coverage-gate-v384.js','utf8');
assert(!/\b260\b/.test(src),'V384 must not introduce a 260 fallback');
assert(!src.includes('idpRank')&&!src.includes('idpSources'),'V384 must not inspect or rewrite IDP consensus/scoring logic');
console.log('V384 offense zero-consensus coverage gate isolation smoke passed');
