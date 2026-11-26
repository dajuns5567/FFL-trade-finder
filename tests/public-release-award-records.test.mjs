import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeDraftRecords,mergeAwardPeriods,nextAwardRecords,verifiedAwardRecords} from '../netlify/functions/lib/award-records-durable.mjs';
const fixture={captured_at:'2026-11-25T12:00:00Z',source_commit:'a'.repeat(40),canonical_fingerprint:'abcdef',award_period:'Sep 14, 2026',
 award_winners:Array.from({length:20},(_,i)=>({key:'category-'+i,title:'Category '+i,roster_id:'1',detail:'Winner'})),
 draft_records:[{season:2026,roster_id:'1',player_id:'12345',pick_no:1,captured_value:1000,delta:500}]};
test('trusted scheduled history appends without losing original first observation or replacing period winners',()=>{
 const a=nextAwardRecords(null,fixture);
 assert.equal(verifiedAwardRecords(a),a);assert.equal(a.records.length,1);assert.equal(a.history.length,1);
 const next=nextAwardRecords(a,{...fixture,captured_at:'2026-11-25T13:00:00Z',award_winners:fixture.award_winners.map(x=>({...x,roster_id:'2'}))});
 assert.deepEqual(next.records,a.records);assert.deepEqual(next.history,a.history);
 const c=nextAwardRecords(next,{...fixture,captured_at:'2026-11-25T14:00:00Z',draft_records:fixture.draft_records.map(x=>({...x,captured_value:1100,delta:600}))});
 assert.equal(c.records.length,2);assert.deepEqual(c.records[0],a.records[0]);
 assert.equal(mergeDraftRecords(a.records,c.records).length,2);assert.deepEqual(mergeAwardPeriods(a.history,c.history),a.history);
});
test('incomplete or malformed scheduled observations fail closed',()=>{
 for(const patch of [{award_winners:[]},{draft_records:[]},{draft_records:[{...fixture.draft_records[0],roster_id:'99'}]},{captured_at:'invalid'}])assert.throws(()=>nextAwardRecords(null,{...fixture,...patch}));
 assert.equal(verifiedAwardRecords({schema_version:1,records:[],history:[]}),null);
});
