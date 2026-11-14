import test from 'node:test';
import assert from 'node:assert/strict';
import { findUnverifiedChartRegression } from '../netlify/functions/consensus-source-promotion-guard.mjs';
import { discoverPublishedChartEmbed } from '../netlify/functions/idpshow-adapter.mjs';

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
