import test from 'node:test';
import assert from 'node:assert/strict';
import {BADGE_PREVIEW_SOURCES,verifyBadgePreviewSourceParity} from '../scripts/audit-combined-badge-preview-source.mjs';
function fixture(){
 const db=new Map();
 for(const x of BADGE_PREVIEW_SOURCES){
  const content=x.file+': source '+x.pr;
  db.set(x.pr+':'+x.file,content);
  db.set('589:'+x.file,content);
 }
 db.set('589:netlify/functions/site-v29.mjs',
  '/league-hub-v451.js?v=544 /value-history-v276.js?v=545');
 return db;
}
const from=db=>(pr,file)=>{const key=pr+':'+file;if(!db.has(key))throw Error('missing '+key);return db.get(key)};
test('combined badge preview preserves all six source runtimes and loader versions',()=>{
 const report=verifyBadgePreviewSourceParity(from(fixture()));
 assert.equal(report.ok,true,JSON.stringify(report.problems));
 assert.equal(report.checked,6);
 assert.equal(report.production_deploy,false);
});
test('reverted awards producer and missing profile consumer block integration',()=>{
 const db=fixture();
 db.set('589:netlify/functions/league-hub.mjs','older awards code');
 db.delete('589:netlify/functions/value-history.mjs');
 const report=verifyBadgePreviewSourceParity(from(db));
 assert.equal(report.ok,false);
 assert(report.problems.some(x=>x.file==='netlify/functions/league-hub.mjs'));
 assert(report.problems.some(x=>x.file==='netlify/functions/value-history.mjs'));
});
test('stale or missing combined loader keys block integration',()=>{
 const db=fixture();
 db.set('589:netlify/functions/site-v29.mjs','/league-hub-v451.js?v=543 /value-history-v276.js?v=544');
 const report=verifyBadgePreviewSourceParity(from(db));
 assert.equal(report.ok,false);
 assert(report.problems.some(x=>x.file==='league-hub-v451.js'));
 assert(report.problems.some(x=>x.file==='value-history-v276.js'));
});
