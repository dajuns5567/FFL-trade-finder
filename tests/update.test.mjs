import test from "node:test";
import assert from "node:assert/strict";
import { buildConsensusPayload } from "../netlify/functions/update.mjs";

test("adapts valid rankings, diagnostics, and composite",()=>{
  const results=Array.from({length:8},(_,index)=>({
    source:`Source ${index+1}`,
    id:index===7?"source-idp":`source-${index+1}`,
    valid:index<2,
    status:index<2?"refreshed":"failed",
    stage:index<2?"validated":"fetch",
    players_extracted:index<2?2:0,
    ranking_rows:index<2?2:0,
    rankings:index<2?[
      {player:"Ja'Marr Chase",rank:1,position:"WR"},
      {player:"Justin Jefferson",rank:2,position:"WR"}
    ]:[],
    timestamp:"2026-08-13T00:00:00.000Z",
    error:index<2?null:"mock failure",
    urls:[`https://example.com/${index+1}`]
  }));
  const players=[{id:"1",name:"Ja'Marr Chase",position:"WR",positions:["WR"]},{id:"2",name:"Justin Jefferson",position:"WR",positions:["WR"]}];
  const payload=buildConsensusPayload({results},players,"2026-08-13T01:00:00.000Z");
  assert.deepEqual(Object.keys(payload.sources),["Source 1","Source 2"]);
  assert.deepEqual(payload.sources["Source 1"].data,{"ja'marr chase":1,"justin jefferson":2});
  assert.equal(payload.summary.results.length,8);
  assert.equal(payload.summary.successful,2);
  assert.equal(payload.summary.failed,6);
  assert.equal(payload.summary.total,8);
  assert.equal(payload.summary.results[2].status,"failed");
  assert.ok(payload.composite.byId["1"]>payload.composite.byId["2"]);
});
