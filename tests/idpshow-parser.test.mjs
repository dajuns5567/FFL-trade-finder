import test from "node:test";
import assert from "node:assert/strict";
import { extractIdpShowRankings } from "../netlify/functions/idpshow-adapter.mjs";
import { buildConsensusPayload } from "../netlify/functions/update.mjs";

test("extracts combined rankings and normalizes DL/LB/DB to IDP",()=>{
  const html=`<table><tr><th>Rank</th><th>Player</th><th>Position</th></tr>
  <tr><td>1</td><td>Offense One</td><td>QB</td></tr>
  <tr><td>2</td><td>Defense One</td><td>DL</td></tr>
  <tr><td>3</td><td>Defense Two</td><td>LB</td></tr>
  <tr><td>4</td><td>Defense Three</td><td>DB</td></tr></table>`;
  assert.deepEqual(extractIdpShowRankings(html),[
    {rank:1,player:"Offense One",position:"QB"},
    {rank:2,player:"Defense One",position:"IDP"},
    {rank:3,player:"Defense Two",position:"IDP"},
    {rank:4,player:"Defense Three",position:"IDP"}
  ]);
});

test("splits a validated combined source into offense and IDP snapshots",()=>{
  const result={source:"The IDP Show Combined",id:"combined-dynasty",valid:true,status:"refreshed",stage:"validated",players_extracted:4,ranking_rows:4,rankings:[
    {rank:1,player:"Offense One",position:"QB"},
    {rank:2,player:"Defense One",position:"IDP"},
    {rank:3,player:"Offense Two",position:"WR"},
    {rank:4,player:"Defense Two",position:"IDP"}
  ],timestamp:"2026-08-13T00:00:00.000Z",urls:["https://example.com"]};
  const payload=buildConsensusPayload({results:[result]});
  assert.deepEqual(payload.sources["The IDP Show Combined Offense"].data,{"offense one":1,"offense two":3});
  assert.deepEqual(payload.sources["The IDP Show Combined IDP"].data,{"defense one":2,"defense two":4});
  assert.equal(payload.sources["The IDP Show Combined IDP"].kind,"idp");
});
