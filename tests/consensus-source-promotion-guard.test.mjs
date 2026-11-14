import test from 'node:test';
import assert from 'node:assert/strict';
import { findUnverifiedChartRegression } from '../netlify/functions/consensus-source-promotion-guard.mjs';
import { discoverPublishedChartEmbed } from '../netlify/functions/idpshow-adapter.mjs';
import { buildConsensusPayload,applyPublisherRevisionGate } from '../netlify/functions/update.mjs';

const item=(revision,publisherMatched,ok=true)=>({
 source:'The IDP Show Combined',
 ok,
 source_provenance:{
  kind:'datawrapper-chart',
  chartRevision:String(revision),
  pinnedRevision:!publisherMatched,
  publisherArticleRevisionMatched:publisherMatched,
  publisherLatestRevisionVerified:false
 }
});
test('unverified pinned fallback never overwrites a distinct publisher-verified revision',()=>{
 const original=[item(8,true)],fallback=[item(1,false)];
 const d=findUnverifiedChartRegression(fallback,original);
 assert.equal(d?.previousRevision,'8');
 assert.equal(d?.incomingRevision,'1');
 assert.match(d?.reason||'',/last-known-good/);
});
test('first startup can use validated pinned fallback without prior publisher evidence',()=>{
 assert.equal(findUnverifiedChartRegression([item(1,false)],[]),null);
 assert.equal(findUnverifiedChartRegression([item(1,false)],[item(1,false)]),null);
});
test('same-revision pinned fallback does not induce a false promotion hold',()=>{
 assert.equal(findUnverifiedChartRegression([item(8,false)],[item(8,true)]),null);
});
test('a verified new publisher revision is immediately permitted as natural market movement',()=>{
 assert.equal(findUnverifiedChartRegression([item(9,true)],[item(8,true)]),null);
 assert.equal(findUnverifiedChartRegression([item(7,true)],[item(8,true)]),null);
});
test('partial or failed responses cannot be misclassified as successful version fallback',()=>{
 assert.equal(findUnverifiedChartRegression([item(1,false,false)],[item(8,true)]),null);
 assert.equal(findUnverifiedChartRegression([{...item(1,false),source:'Another'}],[item(8,true)]),null);
});
test('reproduction: verified Datawrapper article revision then intermittent article-fetch fallback',()=>{
 const article='<iframe src="https://datawrapper.dwcdn.net/gNM2r/8/"></iframe>';
 assert.equal(discoverPublishedChartEmbed(article),'https://datawrapper.dwcdn.net/gNM2r/8/');
 assert.equal(discoverPublishedChartEmbed(''),null);
 assert.ok(findUnverifiedChartRegression([item(1,false)],[item(8,true)]));
});

const assembledCandidate=revision=>{
 const mk=(id,source,rows,provenance=null)=>({
   id,source,valid:true,rankings:rows,timestamp:'2026-11-14T00:00:00.000Z',
   diagnostics:{source_provenance:provenance}
 });
 const runner={player:'Example Runner',position:'RB',rank:1};
 const defender={player:'Example Defender',position:'IDP',rank:2};
 const results=[
  mk('fantasypros','FantasyPros',[runner]),
  mk('draftsharks','DraftSharks',[runner]),
  mk('combined-dynasty','The IDP Show Combined',[runner,defender],item(revision,revision!=='1').source_provenance),
  mk('ktc','KTC',[runner]),
  mk('draftsharks-idp','DraftSharks IDP',[defender]),
  mk('rotowire-idp','RotoWire IDP',[defender]),
  mk('fanranked','FanRanked',[runner])
 ];
 return buildConsensusPayload({results},[
   {id:'rb',name:'Example Runner',positions:['RB']},
   {id:'lb',name:'Example Defender',positions:['IDP']}
 ]);
};
const previousVerified=()=>{
 const c=assembledCandidate('8');
 return {
   sources:c.sources,composite:c.composite,
   sourceManifest:c.summary.results.map(r=>({source:r.source,source_provenance:r.source_provenance}))
 };
};
test('end-to-end consensus candidate is held and reports 6/7 when publisher article becomes unavailable',()=>{
 const candidate=assembledCandidate('1'),previous=previousVerified();
 assert.equal(candidate.withheld,false);
 assert.equal(candidate.summary.successful,7);
 assert.ok(previous.composite.byId.rb);
 const guarded=applyPublisherRevisionGate(candidate,previous);
 assert.ok(guarded);
 assert.equal(candidate.withheld,true);
 assert.equal(candidate.summary.successful,6);
 assert.equal(candidate.summary.failed,1);
 assert.equal(candidate.integrity.all_sources_valid,false);
 assert.equal(candidate.integrity.failed_sources.includes('The IDP Show Combined'),true);
 assert.equal(candidate.summary.results.find(x=>x.source==='The IDP Show Combined').ok,false);
 // The caller chooses the unchanged previous composite and source set.
 assert.ok(previous.sources['The IDP Show Combined IDP']);
 assert.ok(previous.sources['The IDP Show Combined Offense']);
});
test('verified change to another publisher-linked revision remains immediately promotable',()=>{
 const candidate=assembledCandidate('9'),previous=previousVerified();
 assert.equal(applyPublisherRevisionGate(candidate,previous),null);
 assert.equal(candidate.withheld,false);
 assert.equal(candidate.summary.successful,7);
});
test('first boot with no validated prior set preserves original pinned fallback',()=>{
 const candidate=assembledCandidate('1');
 assert.equal(applyPublisherRevisionGate(candidate,null),null);
 assert.equal(candidate.withheld,false);
});
