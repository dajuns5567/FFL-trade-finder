import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceFingerprint,marketObservationFreshness,buildFreshnessSnapshot,ageFreshness}
  from '../netlify/functions/consensus-source-freshness.mjs';
import {buildConsensusPayload} from '../netlify/functions/update.mjs';
import {readFileSync as readFileSyncApi} from 'node:fs';

test('fingerprint tracks substantive ranking changes independent of key ordering',()=>{
  assert.equal(sourceFingerprint({alpha:1,beta:2}),sourceFingerprint({beta:2,alpha:1}));
  assert.notEqual(sourceFingerprint({alpha:1,beta:2}),sourceFingerprint({alpha:1,beta:3}));
});
test('successful repeat fetch does not claim publisher updated the rankings',()=>{
  const prior={data:{alpha:1,beta:2},freshness:{observedFirstAt:'2026-09-01T00:00:00.000Z',contentLastChangedAt:'2026-10-01T00:00:00.000Z',unchangedFetchCount:4}};
  const next=buildFreshnessSnapshot({data:{beta:2,alpha:1}},prior,'2026-11-11T00:00:00.000Z');
  assert.equal(next.publisherUpdatedAt,null);
  assert.equal(next.publisherUpdateStatus,'unknown');
  assert.equal(next.contentChangeStatus,'unchanged');
  assert.equal(next.unchangedFetchCount,5);
  assert.equal(next.contentLastChangedAt,'2026-10-01T00:00:00.000Z');
  assert.equal(next.observedFirstAt,'2026-09-01T00:00:00.000Z');
  assert.equal(next.fetchedAt,'2026-11-11T00:00:00.000Z');
  assert.equal(ageFreshness(next,'2026-11-12T00:00:00.000Z').publisherAgeKnown,false);
});
test('first seen snapshot does not fabricate a content-change date',()=>{
  const n=buildFreshnessSnapshot({data:{a:10}},null,'2026-11-11T00:00:00.000Z');
  assert.equal(n.contentLastChangedAt,null);
  assert.equal(n.contentChangeStatus,'unknown-baseline');
});
test('changed ranking snapshot records observed change time, not publisher time',()=>{
  const n=buildFreshnessSnapshot({data:{a:20}},{data:{a:10}},'2026-11-11T00:00:00.000Z');
  assert.equal(n.contentLastChangedAt,'2026-11-11T00:00:00.000Z');
  assert.equal(n.publisherUpdatedAt,null);
  assert.equal(n.contentChangeStatus,'changed');
});
test('FanRanked stale per-player observations are visible alongside current ones',()=>{
  const p=marketObservationFreshness([{capturedAt:'2026-11-10T00:00:00Z'},{capturedAt:'2026-07-01T00:00:00Z'},{}],
    '2026-11-11T00:00:00.000Z');
  assert.equal(p.sampleSize,3);
  assert.equal(p.undatedRows,1);
  assert.equal(p.rowsOlderThan30Days,1);
  assert.equal(p.publisherUpdatedAt,null);
  assert.equal(p.oldestObservationAt,'2026-07-01T00:00:00.000Z');
});
test('all-source candidate still withholds replacement if any required source fails',()=>{
  const good=(id,source)=>({id,source,valid:true,timestamp:'2026-11-11T00:00:00Z',
    rankings:[{player:'Player One',rank:1,position:'WR'}],ranking_rows:1});
  const results=[good('fantasypros','FantasyPros'),good('draftsharks','DraftSharks'),
    good('combined-dynasty','The IDP Show Combined'),good('ktc','KTC'),
    good('draftsharks-idp','DraftSharks IDP'),good('rotowire-idp','RotoWire IDP'),
    {...good('fanranked','FanRanked'),valid:false}];
  const payload=buildConsensusPayload({results},[{id:'1',name:'Player One',positions:['WR']}]);
  assert.equal(payload.withheld,true);
  assert.deepEqual(payload.sources,{});
  assert.equal(payload.integrity.all_sources_valid,false);
});

test('existing diagnostics distinguish fetched, unpromoted, retained and publisher-unknown data',()=>{
  const ui=readFileSyncApi(new URL('../index.html',import.meta.url),'utf8');
  for(const field of ['last-known-good','fresh-not-promoted','Last successful fetch: ','Publisher update: ','Observed ranking change: ','Market observations older than 30 days: '])
    assert.ok(ui.includes(field),'missing visible freshness distinction: '+field);
  assert.ok(!ui.includes('Freshly refreshed'),'legacy label must not imply publisher refresh');
  assert.equal((ui.match(/function renderConsensusDiagnostics\\(/g)||[]).length,1,'only one authoritative diagnostics renderer must exist');
  assert.ok(!ui.includes('window.renderConsensusDiagnostics=function'),'a later legacy script must not override the authoritative renderer');
  assert.ok(!ui.includes('freshly refreshed'),'legacy status cannot reappear in the page');
});
