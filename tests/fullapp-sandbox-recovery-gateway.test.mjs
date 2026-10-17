import test from 'node:test';
import assert from 'node:assert/strict';
import {makeReadOnlyGateway} from '../scripts/fullapp-sandbox-recovery-gateway.mjs';
const index={items:Array.from({length:156},(_,i)=>({path:'snapshot-'+i}))};
const good={history:{get:async()=>index},editorial:{get:async k=>({week:Number(k.match(/week-(\d+)/)?.[1]),teams:Array.from({length:32})})}};
const h=makeReadOnlyGateway(()=>good);
const req=(method='GET',suffix='')=>new Request('https://sandbox.invalid/api/recovery-status'+suffix,{method});
test('exposes only aggregate recovered metadata',async()=>{const r=await h(req());assert.equal(r.status,200);const v=await r.json();assert.equal(v.history_snapshots,156);assert.equal(v.week_coverage.length,4);assert.equal(v.articles_exposed,0);assert.equal(JSON.stringify(v).includes('paragraph'),false)});
test('rejects write methods without opening stores',async()=>{let touched=0;const guarded=makeReadOnlyGateway(()=>{touched++;return good});for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal((await guarded(req(method))).status,405);assert.equal(touched,0)});
test('rejects query before reading any store',async()=>{let touched=0;const guarded=makeReadOnlyGateway(()=>{touched++;return good});assert.equal((await guarded(req('GET','?article=1'))).status,400);assert.equal(touched,0)});
test('HEAD permits readiness without exposing data',async()=>{const r=await h(req('HEAD'));assert.equal(r.status,200);assert.equal(await r.text(),'')});
test('fails closed for missing snapshots',async()=>{const handler=makeReadOnlyGateway(()=>({...good,history:{get:async()=>({items:[]})}}));assert.equal((await handler(req())).status,503)});
test('fails closed for missing editorial issue',async()=>{const handler=makeReadOnlyGateway(()=>({...good,editorial:{get:async()=>null}}));assert.equal((await handler(req())).status,503)});
test('does not leak backend errors',async()=>{const handler=makeReadOnlyGateway(()=>{throw Error('SECRET_NETLIFY_TOKEN')});const r=await handler(req());assert.equal(r.status,503);assert(!JSON.stringify(await r.json()).includes('SECRET'))});
test('requires exact endpoint',async()=>assert.equal((await h(new Request('https://sandbox.invalid/api/other'))).status,404));

test('returns original-compatible bounded historical player points',async()=>{
 const records=Array.from({length:156},(_,i)=>({path:'value-history/snapshots/snap-'+i+'.json',t:new Date(Date.UTC(2026,8,20,0,i)).toISOString()}));
 const fixture={history:{get:async key=>key==='value-history/index.json'?{items:records}:({t:records[Number(key.match(/snap-(\\d+)\\.json$/)?.[1])].t,rows:[{id:'player123',value:500,overall:10,pos:'RB',posRank:2},{id:'private',value:300}]})},editorial:good.editorial};
 const gateway=makeReadOnlyGateway(()=>fixture);
 const res=await gateway(req('GET','?player_id=player123'));
 assert.equal(res.status,200);
 const body=await res.json();
 assert.equal(body.player_id,'player123');assert.equal(body.points.length,156);
 assert.equal(body.snapshot_count,156);assert.equal(body.history_state,'isolated-recovery');
 assert(!JSON.stringify(body).includes('private'));
});
test('rejects malformed player ids without store access',async()=>{
 let reads=0;const gateway=makeReadOnlyGateway(()=>{reads++;return good});
 for(const q of ['?player_id=','?player_id=bad%20id','?player_id=x&week=4'])assert.equal((await gateway(req('GET',q))).status,400);
 assert.equal(reads,0);
});
test('fails closed when a recovered snapshot is absent',async()=>{
 const records=Array.from({length:156},(_,i)=>({path:'value-history/snapshots/s'+i+'.json',t:'2026-09-20T00:00:00Z'}));
 const gateway=makeReadOnlyGateway(()=>({history:{get:async key=>key==='value-history/index.json'?{items:records}:null},editorial:good.editorial}));
 assert.equal((await gateway(req('GET','?player_id=player123'))).status,503);
});
