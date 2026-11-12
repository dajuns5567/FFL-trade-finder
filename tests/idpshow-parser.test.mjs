import test from "node:test";
import assert from "node:assert/strict";
import { extractIdpShowRankings, discoverPublishedChartEmbed, refreshIdpShow } from "../netlify/functions/idpshow-adapter.mjs";
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

test("discovers only an unambiguous version for the publisher-linked chart",()=>{
  assert.equal(discoverPublishedChartEmbed('<iframe src="https://datawrapper.dwcdn.net/gNM2r/8/"></iframe>'),
    "https://datawrapper.dwcdn.net/gNM2r/8/");
  assert.equal(discoverPublishedChartEmbed('<iframe src="https:\\/\\/datawrapper.dwcdn.net\\/gNM2r\\/9\\/"></iframe>'),
    "https://datawrapper.dwcdn.net/gNM2r/9/");
  assert.equal(discoverPublishedChartEmbed('<iframe src="https://datawrapper.dwcdn.net/unrelated/18/"></iframe>'),null);
  assert.equal(discoverPublishedChartEmbed('<iframe src="https://datawrapper.dwcdn.net/gNM2r/8/"></iframe><iframe src="https://datawrapper.dwcdn.net/gNM2r/9/"></iframe>'),null);
});
test("publisher-linked chart revision drives the validated data fetch; source rank positions remain intact",async()=>{
  const csv=["Rank,Player,Position",...Array.from({length:80},(_,i)=>`${i+1},Player ${i+1},${i%2?"LB":"WR"}`)].join("\n");
  const calls=[];
  const fetchImpl=async url=>{
    calls.push(url);
    const text=String(url).includes("theidpshow.com")?
      '<iframe src="https://datawrapper.dwcdn.net/gNM2r/6/"></iframe>':
      String(url).endsWith("/gNM2r/6/")?
        '<script>var data="dataset.csv"</script>':
        String(url).endsWith("/gNM2r/6/dataset.csv")?csv:"";
    return {ok:!!text,status:text?200:404,text:async()=>text};
  };
  const result=await refreshIdpShow({fetchImpl});
  assert.equal(result.valid,true,result.error);
  assert.equal(result.rankings.length,80);
  assert.equal(result.rankings[0].rank,1);
  assert.equal(result.rankings[1].position,'IDP');
  assert.equal(result.diagnostics.source_provenance.chartRevision,'6');
  assert.equal(result.diagnostics.source_provenance.publisherLatestRevisionVerified,true);
  assert.equal(result.diagnostics.source_provenance.pinnedRevision,false);
  assert.ok(calls.includes("https://datawrapper.dwcdn.net/gNM2r/6/dataset.csv"));
  assert.ok(!calls.includes("https://datawrapper.dwcdn.net/gNM2r/1/"));
});
test("publisher page failure retains original validated pinned fallback, clearly unverified",async()=>{
  const csv=["Rank,Player,Position",...Array.from({length:80},(_,i)=>`${i+1},Player ${i+1},WR`)].join("\n");
  const fetchImpl=async url=>{
    if(String(url).includes("theidpshow.com"))throw new Error("publisher unavailable");
    const text=String(url).endsWith("/gNM2r/1/")?"<script>dataset.csv</script>":
      String(url).endsWith("/gNM2r/1/dataset.csv")?csv:"";
    return {ok:!!text,status:text?200:404,text:async()=>text};
  };
  const result=await refreshIdpShow({fetchImpl});
  assert.equal(result.valid,true,result.error);
  assert.equal(result.diagnostics.source_provenance.publisherLatestRevisionVerified,false);
  assert.equal(result.diagnostics.source_provenance.pinnedRevision,true);
  assert.match(result.diagnostics.source_provenance.publisherDiscoveryError,/publisher unavailable/);
});
