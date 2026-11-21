import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../netlify/functions/lib/inquirer-cutover-source-readiness.mjs',import.meta.url),'utf8');
const scheduler=readFileSync(new URL('../netlify/functions/inquirer-publish-scheduled.mjs',import.meta.url),'utf8');
const worker=readFileSync(new URL('../netlify/functions/inquirer-cutover-background.mjs',import.meta.url),'utf8');
const clean=source.replace(/^import .*;\s*$/gm,'').replaceAll('export ','');
const context={FORWARD_EDITORIAL_REVISION:107,getStore(){throw Error('not called')},
 privatePreviewStoreName:()=> 'fleeced-inquirer-private-pr427-persistent'};
vm.createContext(context);
vm.runInContext(clean+'\n globalThis.check=checkApprovedCutoverSource;',context);
const draft=(week)=>({
 season:2026,week,preview_only:true,published_locked:false,
 editorial_revision:107,teams:Array.from({length:32},(_,id)=>({roster_id:id+1})),
 league_overview:{headline:'Sample'},
 preview_editorial_audit:{ok:true},preview_generation_quality:{ok:true}
});
function fakeStore(map){
 const reads=[];
 return{reads,get:async(key)=>{reads.push(key);return map[key]??null}};
}
const key=(week)=>'2026/week-'+String(week).padStart(2,'0')+'/editorial-r107/edition.json';
test('incomplete site-local source blocks cutover with actionable missing-week detail',async()=>{
 const store=fakeStore({});
 const r=await context.check({store,revision:107});
 assert.equal(r.ready,false);
 assert.match(r.reason,/Week 7 approved private manuscript not transferred/);
 assert.match(r.reason,/Week 8 approved private manuscript not transferred/);
 assert.deepEqual(store.reads,[key(7),key(8)]);
});
test('only exact verified private source copies pass the read-only gate',async()=>{
 const store=fakeStore({[key(7)]:draft(7),[key(8)]:draft(8)});
 const r=await context.check({store,revision:107});
 assert.equal(r.ready,true);
});
test('unverified source cannot be treated as an approved newspaper',async()=>{
 const store=fakeStore({[key(7)]:draft(7),[key(8)]:{...draft(8),teams:[],published_locked:true}});
 const r=await context.check({store,revision:107});
 assert.equal(r.ready,false);assert.match(r.reason,/Week 8 transferred manuscript fails/);
});
test('scheduler verifies source before credentials or background cutover enqueue',()=>{
 const start=scheduler.indexOf('const source=await approvedCutoverSourceReadiness()');
 const credential=scheduler.indexOf('const key=await resolveInquirerQueueCredential({',start);
 const enqueue=scheduler.indexOf("new URL('/.netlify/functions/inquirer-cutover-background'",start);
 assert.ok(start>=0&&credential>start&&enqueue>credential);
 assert.match(scheduler,/if\(!source.ready\)return skip\('Approved Week 7–8 source unavailable/);
});
test('old preview site remains a source identity, never the authorized publication site',()=>{
 assert.match(worker,/const SITE_ID='a516be3b-6c65-4f54-a9fb-23c5361bf3d2'/);
 assert.match(worker,/const SOURCE_SITE_HOST='precious-dango-fb4633.netlify.app'/);
 assert.match(source,/Netlify site-wide Blob storage does not follow a hostname/);
});
