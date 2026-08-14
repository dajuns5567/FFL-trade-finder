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

test("matches a source name without a suffix to a Sleeper suffix name",()=>{
  const results=[
    result("Off A","off-a",[{player:"Kenneth Walker",rank:8,position:"RB"}]),
    result("Off B","off-b",[{player:"Kenneth Walker",rank:9,position:"RB"}])
  ];
  const c=buildConsensusComposite(results,[{id:"kw3",name:"Kenneth Walker III",positions:["RB"]}]);
  assert.ok(c.byId.kw3>0);
  assert.equal(c.detailsById.kw3.kind,"offense");
  assert.deepEqual(c.detailsById.kw3.offenseSources,["Off A","Off B"]);
});

test("does not force an ambiguous suffixless match",()=>{
  const results=[
    result("Off A","off-a",[
      {player:"Alex Smith Jr.",rank:10,position:"WR"},
      {player:"Alex Smith III",rank:11,position:"WR"}
    ])
  ];
  const c=buildConsensusComposite(results,[{id:"amb",name:"Alex Smith",positions:["WR"]}]);
  assert.equal(c.byId.amb,undefined);
});
