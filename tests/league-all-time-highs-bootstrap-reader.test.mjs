import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifiedDurableAwardHighRecords,CANONICAL_AWARD_KEYS} from '../netlify/functions/lib/league-all-time-highs.mjs';
import {requiresDurableHighsWrite,nextDurableHighs} from '../scripts/archive-league-all-time-highs.mjs';
const league='1316867686394769408',exported='2026-11-23T04:54:08.381Z';
function sample(){
 const records=[];
 for(let c=0;c<20;c++)for(let n=1;n<=32;n++){
  if(CANONICAL_AWARD_KEYS[c]==='trade-average:trade-adjusted-v1'&&n===32)continue;
  records.push({award_key:CANONICAL_AWARD_KEYS[c],roster_id:String(n),score:c+n,
   detail:'original validated record',captured_at:'2026-11-23T04:36:36.469Z'});
 }
 return{schema_version:1,league_id:league,source:'github-verified-netlify-blob-bootstrap',
  latest_observation_at:exported,import_provenance:{
   source:'ffl-verified-netlify-blob-all-time-highs-readback',
   preview_origin:'https://deploy-preview-614--animated-dasik-3de74a.netlify.app',
   blob_record_count:639,exported_at:exported
  },records};
}
test('verified 639-row bootstrap becomes readable without relabeling its source',()=>{
 const x=sample(),saved=verifiedDurableAwardHighRecords(x,league);
 assert.equal(saved.length,639);assert.deepEqual(saved,x.records);
 assert.equal(x.source,'github-verified-netlify-blob-bootstrap');
});
test('bootstrap reader fails closed on forged provenance and incomplete score history',()=>{
 const mutations=[
  x=>x.import_provenance.preview_origin='https://fake.netlify.app',
  x=>x.import_provenance.blob_record_count=640,
  x=>x.import_provenance.exported_at='2026-11-20T00:00:00Z',
  x=>x.source='github-canonical-headless-all-time-highs-fake',
  x=>x.records[1]={...x.records[0]},
  x=>x.records[0].score=NaN,
  x=>x.records[0].captured_at='2999-01-01T00:00:00Z',
  x=>x.records=x.records.filter(r=>r.award_key!==CANONICAL_AWARD_KEYS[19]),
  x=>x.records=x.records.filter(r=>r.roster_id!=='32')
 ];
 for(const modify of mutations){const x=sample();modify(x);
  assert.deepEqual(verifiedDurableAwardHighRecords(x,league),[]);
 }
 assert.deepEqual(verifiedDurableAwardHighRecords(sample(),'wrong-league'),[]);
});
test('canonical scheduled award reader remains accepted after bootstrap handoff',()=>{
 const x=sample();x.source='github-canonical-headless-all-time-highs';delete x.import_provenance;
 assert.equal(verifiedDurableAwardHighRecords(x,league).length,639);
});
test('same-score scheduled writes promote bootstrap provenance and retain dates',()=>{
 const before=sample();
 const categories=[...new Set(before.records.map(r=>r.award_key))];
 const obs={schema_version:1,source:'canonical-live-32-team-awards',team_count:32,
  trade_count:1,draft_count:1,categories:20,canonical_fingerprint:'real-source-token',
  model_used:'idp-v96-single-source-continuous-v95-evidence',source_commit:'b'.repeat(40),
  captured_at:new Date().toISOString(),
  observations:before.records.map(({award_key,roster_id,score,detail})=>({award_key,roster_id,score,detail}))};
 assert.equal(categories.length,20);
 const next=nextDurableHighs(before,obs);
 assert.equal(requiresDurableHighsWrite(before,next),true);
 assert.equal(next.records.length,639);
 assert.equal(next.records.every(r=>r.captured_at==='2026-11-23T04:36:36.469Z'),true);
 assert.equal(next.source,'github-canonical-headless-all-time-highs');
});
test('League Hub invokes strict source reader instead of requiring canonical label only',()=>{
 const site=fs.readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 assert.match(site,/records:verifiedDurableAwardHighRecords\(result,LEAGUE\)/);
 assert.match(site,/mergeAwardHighs\(fromBlob,durable\.records,now\)/);
});
