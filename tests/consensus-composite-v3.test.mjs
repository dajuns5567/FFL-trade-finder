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
