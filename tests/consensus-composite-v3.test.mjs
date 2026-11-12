import test from "node:test";
import assert from "node:assert/strict";
import { buildConsensusComposite } from "../netlify/functions/consensus-composite-v3.mjs";

const result=(source,id,rows,reducedWeight=false)=>({source,id,valid:true,rankings:rows,reducedWeight});

test("keeps IDP rank/value separate from offensive rank/value",()=>{
  const results=[
    result("Off A","off-a",[{player:"Elite WR",rank:15,position:"WR"}]),
    result("Off B","off-b",[{player:"Elite WR",rank:15,position:"WR"}]),
    result("IDP A","idp-a",[{player:"Elite LB",rank:15,position:"LB"}]),
    result("IDP B","idp-b",[{player:"Elite LB",rank:15,position:"LB"}])
  ];
  const players=[{id:"wr",name:"Elite WR",positions:["WR"]},{id:"lb",name:"Elite LB",positions:["LB"]}];
  const c=buildConsensusComposite(results,players);
  assert.ok(c.byId.wr>c.byId.lb);
  assert.equal(c.detailsById.wr.offenseRank,1);
  assert.equal(c.detailsById.lb.idpRank,1);
});

test("dual-role player combines offense with a capped IDP contribution",()=>{
  const results=[
    result("Off A","off-a",[{player:"Dual Star",rank:10,position:"WR"}]),
    result("Off B","off-b",[{player:"Dual Star",rank:10,position:"WR"}]),
    result("IDP A","idp-a",[{player:"Dual Star",rank:5,position:"DB"}]),
    result("IDP B","idp-b",[{player:"Dual Star",rank:5,position:"DB"}])
  ];
  const c=buildConsensusComposite(results,[{id:"dual",name:"Dual Star",positions:["WR","DB"]}]);
  const d=c.detailsById.dual;
  assert.equal(d.kind,"dual");
  assert.ok(d.consensusCompositeValue>d.offenseValue);
  assert.ok(d.consensusCompositeValue<=Math.round(d.offenseValue*1.20));
});

test("matches suffixless source name to Sleeper suffix name when position is compatible",()=>{
  const results=[
    result("Off A","off-a",[{player:"Kenneth Walker",rank:20,position:"RB"}]),
    result("Off B","off-b",[{player:"Kenneth Walker",rank:22,position:"RB"}])
  ];
  const c=buildConsensusComposite(results,[{id:"kw3",name:"Kenneth Walker III",positions:["RB"]}]);
  assert.ok(c.byId.kw3>0);
  assert.equal(c.detailsById.kw3.kind,"offense");
});

test("does not assign an exact-name source row to an incompatible-position Sleeper player",()=>{
  const results=[result("Off A","off-a",[{player:"Kenneth Walker",rank:20,position:"RB"}])];
  const players=[
    {id:"wrong",name:"Kenneth Walker",positions:["WR"]},
    {id:"right",name:"Kenneth Walker III",positions:["RB"]}
  ];
  const c=buildConsensusComposite(results,players);
  assert.equal(c.byId.wrong,undefined);
  assert.ok(c.byId.right>0);
});

test("offensive ranking trace exposes source ranks and omission penalties without altering IDP",()=>{
  const mk=(name,rank)=>({player:name,rank,position:"WR"});
  const a=Array.from({length:30},(_,i)=>mk(i===9?"Denzel Boston":"A"+i,i+1));
  const b=Array.from({length:30},(_,i)=>mk(i===11?"Denzel Boston":"B"+i,i+1));
  const missing=Array.from({length:30},(_,i)=>mk("C"+i,i+1));
  const rows=[result("Ranker A","ranker-a",a),result("Ranker B","ranker-b",b),
    result("Ranker C","ranker-c",missing),
    result("IDP A","idp-a",[{player:"Elite LB",rank:1,position:"LB"}])];
  const c=buildConsensusComposite(rows,[{id:"denzel",name:"Denzel Boston",positions:["WR"]},
    {id:"lb",name:"Elite LB",positions:["LB"]}]);
  const trace=c.detailsById.denzel.offenseSourceEvidence;
  assert.equal(c.detailsById.denzel.offenseObservedSourceCount,2);
  assert.equal(trace.length,3);
  assert.deepEqual(trace.filter(x=>x.listed).map(x=>[x.source,x.rank]),
    [["Ranker A",10],["Ranker B",12]]);
  assert.equal(trace.filter(x=>!x.listed).length,1);
  assert.ok(trace[2].source.includes("(not listed)"));
  // Existing single-source IDP coverage floor is 180, not raw source rank 1.
  assert.equal(c.detailsById.lb.idpRank,180);
  assert.equal(c.detailsById.lb.offenseSourceEvidence.length,0);
  assert.ok(Math.abs(trace.reduce((s,x)=>s+x.rank*x.weight,0)/
    trace.reduce((s,x)=>s+x.weight,0)-c.detailsById.denzel.offenseRank)<1e-10);
});

test("offense never invents consensus from same-first-and-last partial name",()=>{
  const results=[
    result("Ranker A","off-a",[{player:"Chris Bell",rank:50,position:"WR"}]),
    result("Ranker B","off-b",[{player:"Chris Bell",rank:55,position:"WR"}])
  ];
  const players=[
    {id:"autman",name:"Chris Autman-Bell",positions:["WR"]},
    {id:"bell",name:"Chris Bell",positions:["WR"]}
  ];
  const c=buildConsensusComposite(results,players);
  assert.equal(c.byId.autman,undefined);
  assert.equal(c.detailsById.autman,undefined);
  assert.ok(c.byId.bell>0);
  assert.equal(c.detailsById.bell.offenseObservedSourceCount,2);
});
test("only offense tightens matching; IDP keeps its prior compatible first-and-last alias rule",()=>{
  const results=[result("IDP A","idp-a",[{player:"John Smith",rank:30,position:"LB"}]),
    result("IDP B","idp-b",[{player:"John Smith",rank:32,position:"LB"}])];
  const c=buildConsensusComposite(results,[
    {id:"john",name:"John Andrew Smith",positions:["LB"]}]);
  assert.ok(c.byId.john>0);
  assert.equal(c.detailsById.john.idpRank,1);
});

test("three identically named WR roster identities cannot inherit one publisher ranking",()=>{
  const results=[
    result("FantasyPros","fantasypros",[{player:"Kyle Williams",rank:14,position:"WR"}]),
    result("KTC","ktc",[{player:"Kyle Williams",rank:18,position:"WR"}]),
    result("FanRanked","fanranked",[{player:"Kyle Williams",rank:17}])
  ];
  const c=buildConsensusComposite(results,[
    {id:"7437",name:"Kyle Williams",positions:["WR"]},
    {id:"638",name:"Kyle Williams",positions:["WR"]},
    {id:"12547",name:"Kyle Williams",positions:["WR"]}
  ]);
  for(const id of ["7437","638","12547"])assert.equal(c.byId[id],undefined);
});
test("ambiguous suffix collision preserves a player only when position proves its identity",()=>{
  const c=buildConsensusComposite([
    result("Ranker WR","off-wr",[{player:"Kenneth Walker III",rank:12,position:"RB"}]),
    result("Ranker ambiguous","off-a",[{player:"Kenneth Walker",rank:15}])
  ],[
    {id:"rb",name:"Kenneth Walker III",positions:["RB"]},
    {id:"wr",name:"Kenneth Walker",positions:["WR"]}
  ]);
  assert.equal(c.detailsById.rb.offenseObservedSourceCount,1);
  assert.equal(c.detailsById.rb.offenseSources[0],"Ranker WR");
  assert.equal(c.byId.wr,undefined);
});
test("untyped source rank cannot be assigned to same-name players at different positions",()=>{
  const c=buildConsensusComposite([
    result("FanRanked","fanranked",[{player:"Antonio Williams",rank:2}])
  ],[
    {id:"receiver",name:"Antonio Williams",positions:["WR"]},
    {id:"back",name:"Antonio Williams",positions:["RB"]}
  ]);
  assert.equal(c.byId.receiver,undefined);
  assert.equal(c.byId.back,undefined);
});
test("same-position suffix collision is not treated as a confidently identified ranking",()=>{
  const c=buildConsensusComposite([
    result("KTC","ktc",[{player:"Frank Gore Jr.",rank:50,position:"RB"}])
  ],[
    {id:"junior",name:"Frank Gore Jr.",positions:["RB"]},
    {id:"senior",name:"Frank Gore",positions:["RB"]}
  ]);
  assert.equal(c.byId.junior,undefined);
  assert.equal(c.byId.senior,undefined);
});

test("distinct source WR/RB rows retain both validated same-name players when positions prove identity",()=>{
  const c=buildConsensusComposite([
    result("Named ranks","off-a",[
      {player:"Antonio Williams",rank:5,position:"WR"},
      {player:"Antonio Williams",rank:30,position:"RB"}
    ])
  ],[
    {id:"receiver",name:"Antonio Williams",positions:["WR"]},
    {id:"back",name:"Antonio Williams",positions:["RB"]}
  ]);
  assert.equal(c.detailsById.receiver.offenseSources[0],"Named ranks");
  assert.equal(c.detailsById.receiver.offenseSourceEvidence[0].rank,1);
  assert.equal(c.detailsById.back.offenseSources[0],"Named ranks");
  assert.equal(c.detailsById.back.offenseSourceEvidence[0].rank,2);
});

const rankedWithTarget=(name,position,rank,total=200)=>Array.from({length:total},(_,i)=>({
  player:i===rank-1?name:'Generated '+position+' '+i,rank:i+1,position
}));
test("offense suppresses one extreme publisher when four independent source peers cluster",()=>{
  const target="Matthew Golden";
  const results=[
    result("FantasyPros","fantasypros",rankedWithTarget(target,"WR",47)),
    result("DraftSharks","draftsharks",rankedWithTarget(target,"WR",37)),
    result("The IDP Show Combined","combined-dynasty",rankedWithTarget(target,"WR",133)),
    result("KTC","ktc",rankedWithTarget(target,"WR",19),true),
    result("FanRanked","fanranked",rankedWithTarget(target,"WR",24))
  ];
  const c=buildConsensusComposite(results,[{id:"golden",name:target,positions:["WR"]}]);
  const d=c.detailsById.golden,change=d.offenseOutlierAdjustments;
  assert.equal(change.length,1);
  assert.equal(change[0].source,"The IDP Show Combined Offense");
  assert.equal(change[0].rank,133);
  assert.equal(change[0].peerMedian,30.5);
  assert.equal(change[0].originalWeight,1);
  assert.equal(change[0].adjustedWeight,.25);
  assert.equal(d.offenseSourceEvidence.find(x=>x.source==="The IDP Show Combined Offense").outlierProtected,true);
  assert.equal(d.offenseObservedSourceCount,5);
  const raw=(47+37+133+.5*19+24)/4.5;
  const corrected=(47+37+.25*133+.5*19+24)/3.75;
  assert.ok(Math.abs(d.offenseRank-corrected)<1e-8);
  assert.ok(d.offenseRank<raw-15,"material outlier influence reduced");
});
test("no suppression with only three listed ranks regardless of the disagreement size",()=>{
  const target="Sparse Rookie";
  const c=buildConsensusComposite([
    result("FantasyPros","fantasypros",rankedWithTarget(target,"WR",20)),
    result("KTC","ktc",rankedWithTarget(target,"WR",22)),
    result("The IDP Show Combined","combined-dynasty",rankedWithTarget(target,"WR",170))
  ],[{id:"sparse",name:target,positions:["WR"]}]);
  assert.deepEqual(c.detailsById.sparse.offenseOutlierAdjustments,[]);
  assert.equal(c.detailsById.sparse.offenseSourceEvidence.find(x=>x.source==="The IDP Show Combined Offense").weight,1);
});
test("two camps and evenly split sources are retained as legitimate market disagreement",()=>{
  const target="Divided Rookie",results=[
    result("FantasyPros","fantasypros",rankedWithTarget(target,"WR",20)),
    result("DraftSharks","draftsharks",rankedWithTarget(target,"WR",30)),
    result("KTC","ktc",rankedWithTarget(target,"WR",125)),
    result("FanRanked","fanranked",rankedWithTarget(target,"WR",135))
  ];
  const d=buildConsensusComposite(results,[{id:"split",name:target,positions:["WR"]}]).detailsById.split;
  assert.deepEqual(d.offenseOutlierAdjustments,[]);
  assert.ok(d.offenseSourceEvidence.every(x=>x.weight===1));
});
test("single-source safety floor remains conservative, no injected consensus",()=>{
  const d=buildConsensusComposite([
    result("FantasyPros","fantasypros",rankedWithTarget("Lonely Rookie","RB",1))
  ],[{id:"solo",name:"Lonely Rookie",positions:["RB"]}]).detailsById.solo;
  assert.equal(d.offenseRank,260);
  assert.deepEqual(d.offenseOutlierAdjustments,[]);
});
test("IDP aggregation remains unchanged even with one extreme rank and three agreeing sources",()=>{
  const target="Linebacker Outlier",results=[
    result("IDP One","one-idp",rankedWithTarget(target,"LB",20)),
    result("IDP Two","two-idp",rankedWithTarget(target,"LB",21)),
    result("IDP Three","three-idp",rankedWithTarget(target,"LB",22)),
    result("IDP Four","four-idp",rankedWithTarget(target,"LB",130))
  ];
  const d=buildConsensusComposite(results,[{id:"lb",name:target,positions:["LB"]}]).detailsById.lb;
  assert.equal(d.idpRank,(20+21+22+130)/4);
  assert.deepEqual(d.offenseOutlierAdjustments,[]);
});
test("omission penalties are not counted as agreeing peers when protecting offense consensus",()=>{
  const target="Two Peers",results=[
    result("FantasyPros","fantasypros",rankedWithTarget(target,"WR",20)),
    result("DraftSharks","draftsharks",rankedWithTarget(target,"WR",25)),
    result("The IDP Show Combined","combined-dynasty",rankedWithTarget(target,"WR",150)),
    result("KTC","ktc",Array.from({length:200},(_,i)=>({player:"Absent A"+i,rank:i+1,position:"WR"}))),
    result("FanRanked","fanranked",Array.from({length:200},(_,i)=>({player:"Absent B"+i,rank:i+1,position:"WR"})))
  ];
  const d=buildConsensusComposite(results,[{id:"two",name:target,positions:["WR"]}]).detailsById.two;
  assert.deepEqual(d.offenseOutlierAdjustments,[]);
  assert.equal(d.offenseObservedSourceCount,3);
});
