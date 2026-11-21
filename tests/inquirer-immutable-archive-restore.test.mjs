import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareImmutableInquirerRestore,applyApprovedImmutableInquirerRestore} from '../netlify/functions/lib/inquirer-immutable-archive-restore.mjs';

const sha=raw=>createHash('sha256').update(raw).digest('hex');
const bytes=value=>Buffer.from(JSON.stringify(value));
const copy=value=>value===null?null:structuredClone(value);
const desks=['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'];
const beats=['lead','standings','players','decisions','league','outlook'];
const siteId='a516be3b-6c65-4f54-a9fb-23c5361bf3d2';
function fixture(){
 const raw=new Map(),site=new Map(),writes=[];
 const manifest={schema_version:1,season:2026,source:'verified-published-only',entries:[]},index=[],records=[];
 for(let week=3;week<=9;week++){
  const captured='2026-11-'+String(week+3).padStart(2,'0')+'T12:00:00.000Z';
  const edition={season:2026,week,available:true,inquirer_version:31,editorial_revision:week===4?14:107,
   generated_at:captured,...(week>=5?{published_locked:true,editorial_generation:{engine:'v31-forward'}}:{}),
   teams:Array.from({length:32},(_,i)=>({roster_id:i+1,inquirer_article:{
    headline:'Verified original Week '+week+' Team '+i,reporter:{id:'reporter-'+Math.floor(i/8)},
    sections:desks.map(kind=>({kind,paragraphs:['Verified original paragraph '+kind]}))
   }})),
   league_overview:{headline:'Original weekly recap Week '+week,sections:[
    {blocks:beats.map(kind=>({kind}))},{},{},{}]}
  };
  const path='2026/week-'+String(week).padStart(2,'0')+'.json',blob=bytes(edition);
  raw.set(path,blob);manifest.entries.push({season:2026,week,path,sha256:sha(blob)});
  index.push({type:'week',season:2026,week,key:'broadcasts/'+path,...(week>=5?{captured_at:captured}:{})});
  records.push({season:2026,week,captured_at:captured,
   ...(week>=5?{newsroom_engine:'v31-forward',newsroom_editorial_revision:107}:{}),
   players_of_week:{offense:{player_id:'o'+week},defense:{player_id:'d'+week}},
   manager_awards:[{type:'highest-scorer'},{type:'lowest-scorer'}]});
 }
 raw.set('manifest.json',bytes(manifest));raw.set('evidence/2026/index.json',bytes(index));
 raw.set('evidence/2026/weekly.json',bytes({schema_version:1,records}));
 raw.set('evidence/2026/publication-status.json',bytes({state:'editorial-hold',available:false,week:10}));
 site.set('inquirer/publication-status.json',{state:'editorial-hold',week:10,editorial_revision:109,available:false});
 const store={
  get:async key=>copy(site.get(key)??null),
  getMetadata:async key=>site.has(key)?{etag:'etag-'+key}:null,
  setJSON:async(key,value,options)=>{
   writes.push({key,options});
   if(options?.onlyIfNew&&site.has(key))return{modified:false};
   if(options?.onlyIfMatch&&options.onlyIfMatch!=='etag-'+key)return{modified:false};
   site.set(key,copy(value));return{modified:true};
  }
 };
 const fetchImpl=async url=>{
  const key=String(url).split('/inquirer-archive/')[1],v=raw.get(key);
  return v?{ok:true,arrayBuffer:async()=>v}:{ok:false,status:404};
 };
 return{site,raw,store,writes,fetchImpl};
}
const owner={authorized:true,operation:'restore-original-2026-weeks-03-09',siteId};
const production={siteId,context:'production'};
test('planning is read-only and creates only original Weeks 3–9 plus index/awards',async()=>{
 const f=fixture();
 const plan=await prepareImmutableInquirerRestore(f);
 assert.equal(plan.immutable_editions.length,7);
 assert.deepEqual(plan.summary.missing_original_newspapers,[3,4,5,6,7,8,9]);
 assert.equal(plan.summary.current_editorial_status,'editorial-hold');
 assert.equal(plan.awards.records.length,7);
 assert.equal(plan.index.length,7);
 assert.equal(f.writes.length,0);
 assert.equal(f.site.get('inquirer/publication-status.json').state,'editorial-hold');
});
test('no preview, wrong site, missing owner approval, or wrong operation can restore',async()=>{
 const f=fixture(),plan=await prepareImmutableInquirerRestore(f);
 for(const opts of [
  {approval:owner,deploy:{siteId,context:'deploy-preview'}},
  {approval:owner,deploy:{siteId:'wrong',context:'production'}},
  {approval:null,deploy:production},
  {approval:{...owner,operation:'publish-week-10'},deploy:production}
 ]){
  await assert.rejects(applyApprovedImmutableInquirerRestore({...f,plan,...opts}),/No explicit authorized/);
  assert.equal(f.writes.length,0);
 }
});
test('authorized create-only restore preserves Week 10 hold, passes readback, and is idempotent',async()=>{
 const f=fixture(),plan=await prepareImmutableInquirerRestore(f);
 const result=await applyApprovedImmutableInquirerRestore({...f,plan,approval:owner,deploy:production});
 assert.equal(result.completed,true);
 assert.equal(f.writes.length,9);
 assert.deepEqual(f.writes.map(x=>x.key).slice(-2),['awards/weekly.json','broadcasts/index.json']);
 assert(f.writes.every(x=>x.options.onlyIfNew===true));
 assert.equal(f.site.get('inquirer/publication-status.json').state,'editorial-hold');
 assert.equal(f.site.has('broadcasts/2026/week-10.json'),false);
 const second=await prepareImmutableInquirerRestore(f);
 assert.equal(second.ready_without_writes,true);
 assert.equal(second.immutable_editions.length,0);
 assert.equal(second.awards,null);assert.equal(second.index,null);
 await applyApprovedImmutableInquirerRestore({...f,plan:second,approval:owner,deploy:production});
 assert.equal(f.writes.length,9,'second run cannot overwrite originals');
});
test('wrong local edition is a fatal conflict; no other originals are written',async()=>{
 const f=fixture();
 f.site.set('broadcasts/2026/week-07.json',{available:true,season:2026,week:7,teams:[]});
 await assert.rejects(prepareImmutableInquirerRestore(f),/archive conflicts/);
 assert.equal(f.writes.length,0);
});
test('a stale or fabricated plan cannot overwrite different local archive or award data',async()=>{
 const f=fixture(),plan=await prepareImmutableInquirerRestore(f);
 plan.immutable_editions[0].edition.teams[0].inquirer_article.headline='fabricated';
 await assert.rejects(applyApprovedImmutableInquirerRestore({...f,plan,approval:owner,deploy:production}),/Restore plan or destination changed/);
 assert.equal(f.writes.length,0);
});
test('after interruption, another preflight safely resumes without replacing existing manuscripts',async()=>{
 const f=fixture(),plan=await prepareImmutableInquirerRestore(f);
 let attempt=0;
 const originalSet=f.store.setJSON;
 f.store.setJSON=async(...args)=>{
  attempt++;
  if(attempt===3)throw Error('simulated network interruption');
  return originalSet(...args);
 };
 await assert.rejects(applyApprovedImmutableInquirerRestore({...f,plan,approval:owner,deploy:production}),/simulated network interruption/);
 assert.equal(f.site.has('broadcasts/2026/week-03.json'),true);
 assert.equal(f.site.has('broadcasts/2026/week-04.json'),true);
 assert.equal(f.site.has('broadcasts/2026/week-05.json'),false);
 f.store.setJSON=originalSet;
 const resumed=await prepareImmutableInquirerRestore(f);
 assert.deepEqual(resumed.summary.missing_original_newspapers,[5,6,7,8,9]);
 await applyApprovedImmutableInquirerRestore({...f,plan:resumed,approval:owner,deploy:production});
 assert.equal(f.site.get('inquirer/publication-status.json').state,'editorial-hold');
 assert.equal((await prepareImmutableInquirerRestore(f)).ready_without_writes,true);
});
