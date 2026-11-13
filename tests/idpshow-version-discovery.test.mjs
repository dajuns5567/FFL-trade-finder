import test from "node:test";
import assert from "node:assert/strict";
import { discoverPublishedChartEmbed, refreshIdpShow } from "../netlify/functions/idpshow-adapter.mjs";

const csv=["Rank,Player,Position",...Array.from({length:80},(_,i)=>`${i+1},Player ${i+1},${i%2?"LB":"WR"}`)].join("\n");
const mock=(article,version="1")=>{
  const requests=[];
  const fetchImpl=async url=>{
    requests.push(String(url));
    if(String(url).includes("theidpshow.com")){
      if(article===null)throw Error("publisher unavailable");
      return {ok:true,status:200,text:async()=>article};
    }
    const content=String(url).endsWith("/gNM2r/"+version+"/")?"<script>dataset.csv</script>":
      String(url).endsWith("/gNM2r/"+version+"/dataset.csv")?csv:"";
    return{ok:!!content,status:content?200:404,text:async()=>content};
  };
  return{fetchImpl,requests};
};
test("publisher chart revision parser refuses conflicting versions",()=>{
  assert.equal(discoverPublishedChartEmbed('<iframe src="https://datawrapper.dwcdn.net/gNM2r/7/"></iframe>'),"https://datawrapper.dwcdn.net/gNM2r/7/");
  assert.equal(discoverPublishedChartEmbed('<iframe src="https://datawrapper.dwcdn.net/gNM2r/7/"></iframe><iframe src="https://datawrapper.dwcdn.net/gNM2r/8/"></iframe>'),null);
  assert.equal(discoverPublishedChartEmbed('<iframe src="https://datawrapper.dwcdn.net/wrong/8/"></iframe>'),null);
});
test("publisher-linked version is selected and parsed, not an assumed latest timestamp",async()=>{
  const x=mock('<iframe src="https://datawrapper.dwcdn.net/gNM2r/7/"></iframe>',"7");
  const r=await refreshIdpShow({fetchImpl:x.fetchImpl});
  assert.equal(r.valid,true,r.error);
  assert.equal(r.rankings.length,80);
  assert.equal(r.rankings[1].position,"IDP");
  assert.equal(r.diagnostics.source_provenance.chartRevision,"7");
  assert.equal(r.diagnostics.source_provenance.publisherArticleRevisionMatched,true);
  assert.equal(r.diagnostics.source_provenance.publisherLatestRevisionVerified,false);
  assert.ok(x.requests.some(url=>url.endsWith("/gNM2r/7/dataset.csv")));
  assert.ok(!x.requests.some(url=>url.endsWith("/gNM2r/1/")));
});
test("failed article lookup retains validated pinned fallback without claiming freshness",async()=>{
  const x=mock(null,"1");
  const r=await refreshIdpShow({fetchImpl:x.fetchImpl});
  assert.equal(r.valid,true,r.error);
  assert.equal(r.diagnostics.source_provenance.pinnedRevision,true);
  assert.equal(r.diagnostics.source_provenance.publisherArticleRevisionMatched,false);
  assert.match(r.diagnostics.source_provenance.publisherDiscoveryError,/publisher unavailable/);
  assert.ok(x.requests.some(url=>url.endsWith("/gNM2r/1/dataset.csv")));
});
