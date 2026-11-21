import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../netlify/functions/inquirer-publication-readiness.mjs',import.meta.url),'utf8');
const body=source.replace(/^import .*;\s*$/gm,'').replace('export default async function','async function');
function fixture(complete=false){
 const reads=[],writes=[];
 const data={};
 if(complete){
  for(let w=3;w<=8;w++)data['broadcasts/2026/week-'+String(w).padStart(2,'0')+'.json']={season:2026,week:w,available:true};
  data['broadcasts/index.json']=[3,4,5,6,7,8].map(week=>({season:2026,week}));
  data['awards/weekly.json']={records:[3,4,5,6,7,8].map(week=>({season:2026,week}))};
 }
 const store={
  async get(key){reads.push(key);return data[key]??null},
  async setJSON(key){writes.push(key);throw Error('read-only attempted write')}
 };
 const ctx={
  Response,process:{env:{}},console:{error(){}},
  getStore:()=>store,
  inspectCanonicalArchive:(edition,season,week)=>({ok:!!edition&&edition.season===season&&edition.week===week}),
  verifiedNewSiteCutoverHistory:({week3,week4,week5,week6})=>({ready:!!week3&&!!week4&&!!week5&&!!week6,reason:'baseline'}),
  verifiedWeekNineAutopublishCutoverHistory:({week7,week8})=>({ready:!!week7&&!!week8,reason:'forward'}),
  approvedCutoverSourceReadiness:async()=>({ready:false,reason:'not transferred'})
 };
 vm.createContext(ctx);
 vm.runInContext(body+'\nglobalThis.handler=inquirerPublicationReadiness;',ctx);
 return{handler:ctx.handler,reads,writes,ctx};
}
test('readiness endpoint never accepts mutating methods',async()=>{
 const f=fixture();
 const result=await f.handler({method:'POST'});
 assert.equal(result.status,405);
 assert.equal(f.reads.length,0);assert.equal(f.writes.length,0);
});
test('empty destination archive explicitly reports blocked publication, with no article content',async()=>{
 const f=fixture();const response=await f.handler({method:'GET'});
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.archives_ready_for_week9_plus,false);
 assert.equal(result.ready_for_unattended_week9_plus,false);
 assert.equal(result.historical_weeks.length,6);
 assert.ok(result.historical_weeks.every(w=>w.locked_verified===false));
 assert.equal(result.site_writes_performed,false);
 assert.equal(result.last_published_week,null);
 assert.equal(f.writes.length,0);
 assert.doesNotMatch(JSON.stringify(result),/\bteams\b|\barticles\b|secret|queue-credential/i);
});
test('valid archive without owner publisher flag is not marked ready for unattended publishing',async()=>{
 const f=fixture(true);
 const response=await f.handler({method:'GET'});
 const result=await response.json();
 assert.equal(result.archives_ready_for_week9_plus,true);
 assert.equal(result.publisher_activation_enabled,false);
 assert.equal(result.ready_for_unattended_week9_plus,false);
 assert.equal(result.transfer_source.ready,true);
 assert.equal(f.writes.length,0);
});
test('never exposes any key, queue credential, or article contents',()=>{
 assert.doesNotMatch(source,/return new Response\(JSON\.stringify\(\{.*key:/s);
 assert.match(source,/cache-control':'no-store/);
 assert.match(source,/method!=='GET'/);
 assert.doesNotMatch(source,/\.setJSON\(|\.set\(/);
});
