const fs=require('fs'),vm=require('vm');
function assert(x,m){if(!x)throw new Error(m)}
const rows=[
  {x:{type:'player',id:'o0',pos:'WR'},value:1000,tag:'zero-high'},
  {x:{type:'player',id:'i1',pos:'IDP'},value:950,tag:'idp-one'},
  {x:{type:'player',id:'o1',pos:'QB'},value:900,tag:'covered-one'},
  {x:{type:'player',id:'o2',pos:'RB'},value:850,tag:'covered-two'},
  {x:{type:'player',id:'i2',pos:'IDP'},value:800,tag:'idp-two'},
  {x:{type:'player',id:'o3',pos:'TE'},value:750,tag:'zero-low'},
  {x:{type:'player',id:'o4',pos:'WR'},value:700,tag:'covered-three'},
  {x:{type:'player',id:'o5',pos:'WR'},value:650,tag:'zero-with-production'}
];
const original=rows.map(z=>z);
const players={
  o0:{full_name:'Chris Autman-Bell'},o1:{full_name:'Covered QB'},o2:{full_name:'Covered RB'},o3:{full_name:'Zero TE'},o4:{full_name:'Covered WR'},o5:{full_name:'Productive Zero'},
  i1:{full_name:'IDP One'},i2:{full_name:'IDP Two'}
};
const ctx={console};ctx.window=ctx;
ctx.state={players,rankings:{
  A:{kind:'offense',data:{'covered qb':12,'covered rb':180,'covered wr':260}},
  B:{kind:'offense',data:{'covered qb':15}},
  IDP:{kind:'idp',data:{'idp one':40,'chris bell':55}}
},consensusComposite:{detailsById:{
  // Deliberately simulate the bad fuzzy composite match that produced Chris Autman-Bell's CV.
  o0:{offenseRank:75,offenseSources:['A']},
  o1:{offenseRank:12,offenseSources:['A','B']},o2:{offenseRank:180,offenseSources:['A']},o4:{offenseRank:260,offenseSources:['A']}
}}};
ctx.playerName=id=>players[id]?.full_name||id;
ctx.groupPos=x=>x?.pos||({o0:'WR',o1:'QB',o2:'RB',o3:'TE',o4:'WR',o5:'WR'}[x?.id]||'IDP');
ctx.rawScore=id=>({ppg:id==='o5'?10:0,seasons:id==='o5'?2:0});
ctx.masterRankCache=null;ctx.valueCache=new Map();ctx.fitCache=new Map();ctx.stageCache=new Map();
ctx.masterRankings=()=>rows.map(z=>z);
ctx.ensureMaster=()=>ctx.masterRankCache||(ctx.masterRankCache=ctx.masterRankings());
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('offense-consensus-coverage-gate-v384.js','utf8'),ctx,{filename:'offense-consensus-coverage-gate-v384.js'});
const out=ctx.ensureMaster(),api=ctx.offenseConsensusCoverageGateV384;
assert(api&&api.version===385,'V385 gate API missing');
assert(out.length===rows.length,'gate changed valuation-universe size');

// Numeric slots stay identical, protecting the downstream modeled-value curve and IDP values.
assert(out.every((z,i)=>z.value===rows[i].value),'gate changed an approved numeric value slot');

// IDP must be literally untouched: same player, row object, index and value.
for(const idx of [1,4]){
  assert(out[idx]===original[idx],`IDP row at index ${idx} was modified or moved`);
  assert(out[idx].x.id===rows[idx].x.id&&out[idx].value===rows[idx].value,`IDP identity/value changed at index ${idx}`);
}
assert(api.offenseCoverage('i1')===false,'IDP leaked into offense coverage detection');

// Coverage must be exact front-to-back source coverage, not the fuzzy composite result.
assert(api.offenseCoverage('o0')===false,'fuzzy composite match incorrectly counted as real offensive source coverage');
assert(api.offenseCoverage('o1')===true&&api.offenseCoverage('o2')===true&&api.offenseCoverage('o4')===true,'exact source-listed offense was not recognized');

// Covered offense comes first. Among zero-source offense, use the existing no-consensus scoring path.
const offense=out.filter(z=>['QB','RB','WR','TE'].includes(z.x.pos));
const ids=offense.map(z=>z.x.id);
assert(JSON.stringify(ids)===JSON.stringify(['o1','o2','o4','o5','o0','o3']),'unexpected offense ordering: '+ids.join(','));
assert(api.noConsensusOffenseScore('o5')===60,'existing no-consensus scoring fallback drifted');
assert(api.noConsensusOffenseScore('o0')===1,'no-history zero-consensus offense should remain at fallback floor');

// No synthetic rank fallback is introduced here; IDP continues through its pre-existing model.
const src=fs.readFileSync('offense-consensus-coverage-gate-v384.js','utf8');
assert(!/\b260\b/.test(src),'V385 must not introduce a 260 fallback');
assert(!src.includes('idpRank')&&!src.includes('idpSources'),'V385 must not inspect or rewrite IDP consensus/scoring logic');
console.log('V385 exact-source offense coverage + no-consensus depth + IDP isolation smoke passed');
