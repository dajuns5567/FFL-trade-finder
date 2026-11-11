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
  assert.equal(c.detailsById.lb.idpRank,1);
  assert.equal(c.detailsById.lb.offenseSourceEvidence.length,0);
  assert.ok(Math.abs(trace.reduce((s,x)=>s+x.rank*x.weight,0)/
    trace.reduce((s,x)=>s+x.weight,0)-c.detailsById.denzel.offenseRank)<1e-10);
});
