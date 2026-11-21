import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inspectPublisherArchiveReadiness} from '../netlify/functions/lib/inquirer-publisher-archive-readiness.mjs';

const json=value=>Buffer.from(JSON.stringify(value));
const hash=value=>createHash('sha256').update(value).digest('hex');
function setup({missing=[],conflicts=[],hold=false}={}){
 const source=new Map(),site=new Map(),manifest={schema_version:1,season:2026,source:'verified-published-only',entries:[]};
 const index=[],records=[];
 for(let week=3;week<=9;week++){
  const captured='2026-11-'+String(week+3).padStart(2,'0')+'T12:00:00.000Z';
  const original={season:2026,week,available:true,generated_at:captured,
   ...(week>=5?{published_locked:true,editorial_generation:{engine:'v31-forward'}}:{}),
   teams:Array.from({length:32},(_,i)=>({roster_id:i+1,inquirer_article:{headline:'Original '+week+' '+i}}))};
  const path='2026/week-'+String(week).padStart(2,'0')+'.json';
  const body=json(original);source.set(path,body);
  manifest.entries.push({season:2026,week,path,sha256:hash(body)});
  index.push({type:'week',season:2026,week,key:'broadcasts/'+path,...(week>=5?{captured_at:captured}:{})});
  records.push({season:2026,week,captured_at:captured,
   ...(week>=5?{newsroom_engine:'v31-forward',newsroom_editorial_revision:109}:{}),
   players_of_week:{offense:{player_id:'off-'+week},defense:{player_id:'def-'+week}},
   manager_awards:[{type:'highest-scorer'},{type:'lowest-scorer'}]});
  if(!missing.some(x=>x.week===week&&x.key==='newspaper'))
   site.set('broadcasts/'+path,conflicts.some(x=>x.week===week&&x.key==='newspaper')?
     {...original,teams:[...original.teams].reverse()}:original);
 }
 site.set('broadcasts/index.json',index.filter(row=>!missing.some(x=>x.week===row.week&&x.key==='index')));
 site.set('awards/weekly.json',{schema_version:1,records:records.filter(row=>!missing.some(x=>x.week===row.week&&x.key==='awards'))});
 site.set('inquirer/publication-status.json',hold?
  {state:'editorial-hold',season:2026,week:10,editorial_revision:109,available:false}:
  {state:'completed',season:2026,week:9,available:true});
 source.set('manifest.json',json(manifest));
 source.set('evidence/2026/index.json',json(index));
 source.set('evidence/2026/weekly.json',json({schema_version:1,records}));
 source.set('evidence/2026/publication-status.json',json({state:'editorial-hold',week:10,available:false}));
 const fetchImpl=async url=>{
  const file=String(url).split('/inquirer-archive/')[1],data=source.get(file);
  return data?{ok:true,arrayBuffer:async()=>data}:{ok:false,status:404};
 };
 let reads=0;
 const store={get:async(key)=>{reads++;return site.has(key)?structuredClone(site.get(key)):null}};
 return {store,fetchImpl,source,site,get reads(){return reads}};
}
test('fully restored originals pass read-only publisher continuity audit',async()=>{
 const fixture=setup(),before=fixture.site.size;
 const audit=await inspectPublisherArchiveReadiness(fixture);
 assert.equal(audit.ready,true);
 assert.deepEqual(audit.verified,[3,4,5,6,7,8,9]);
 assert.deepEqual(audit.conflicts,[]);
 assert.equal(audit.highest_local_verified_week,9);
 assert.equal(fixture.site.size,before,'Audit may never write');
 assert(fixture.reads>0);
});
test('missing newspaper, index and awards are explicit and never silently promoted',async()=>{
 const fixture=setup({missing:[{week:8,key:'newspaper'},{week:9,key:'index'},{week:9,key:'awards'}]});
 const result=await inspectPublisherArchiveReadiness(fixture);
 assert.equal(result.ready,false);
 assert.deepEqual(result.conflicts,[]);
 assert.deepEqual(result.missing,[{week:8,keys:['newspaper']},{week:9,keys:['index','awards']}]);
 assert.equal(fixture.site.has('broadcasts/2026/week-08.json'),false);
});
test('different original manuscript bytes are a blocking conflict, not a migration candidate',async()=>{
 const fixture=setup({conflicts:[{week:7,key:'newspaper'}]});
 const result=await inspectPublisherArchiveReadiness(fixture);
 assert.equal(result.ready,false);
 assert.deepEqual(result.conflicts,[{week:7,kinds:['newspaper-conflict']}]);
});
test('Week 10 editorial hold is preserved and is never fabricated from archive',async()=>{
 const fixture=setup({hold:true});
 const state=fixture.site.get('inquirer/publication-status.json');
 const audit=await inspectPublisherArchiveReadiness(fixture);
 assert.equal(audit.ready,true);
 assert.equal(audit.preserved_editorial_hold,true);
 assert.equal(audit.current_publication_status,'editorial-hold');
 assert.deepEqual(fixture.site.get('inquirer/publication-status.json'),state);
 assert.equal(fixture.source.has('2026/week-10.json'),false);
});
test('tampered source is rejected before treating it as a publisher continuity record',async()=>{
 const fixture=setup();
 fixture.source.set('2026/week-09.json',json({available:true,season:2026,week:9,teams:[]}));
 await assert.rejects(inspectPublisherArchiveReadiness(fixture),/checksum mismatch/);
});
test('inspector requires an explicitly provided read-only store and an original verified week range',async()=>{
 const fixture=setup();
 await assert.rejects(inspectPublisherArchiveReadiness({fetchImpl:fixture.fetchImpl}),/Read-only Blob store required/);
 await assert.rejects(inspectPublisherArchiveReadiness({...fixture,throughWeek:10}),/only supports originally verified/);
});

test('publisher continuity diagnostic is credential-gated and cannot write to Blobs',async()=>{
 const {readFileSync}=await import('node:fs');
 const file=readFileSync(new URL('../netlify/functions/inquirer-publication-status.mjs',import.meta.url),'utf8');
 const guarded=file.indexOf("if(req.method!=='GET'||!expected||req.headers.get('x-fleeced-queue-key')!==expected)");
 const diagnostic=file.indexOf("if(new URL(req.url).searchParams.get('archive_readiness')==='1')");
 assert(guarded>0&&diagnostic>guarded,'Authentication must precede read-only audit');
 const end=file.indexOf(' const [stage,idx,edition,managerCache,status]',diagnostic);
 assert(end>diagnostic);
 const scope=file.slice(diagnostic,end);
 assert.match(scope,/inspectPublisherArchiveReadiness\(\{store:s,throughWeek\}\)/);
 assert.doesNotMatch(scope,/\.setJSON\(|\.delete\(|\.set\(/);
 assert.match(scope,/throughWeek<3\|\|throughWeek>9/);
 assert.match(scope,/status:503/);
});
