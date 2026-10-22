import test from 'node:test';
import assert from 'node:assert/strict';
import {isPreviewDiagnosticContext,resolvePreviewIdentity,PREVIEW_DIAGNOSTIC_STATUS,PREVIEW_DIAGNOSTIC_EDITION,PREVIEW_DIAGNOSTIC_REJECTED} from '../netlify/functions/lib/inquirer-preview-diagnostics.mjs';

const preview=(site,n=402)=>'https://deploy-preview-'+n+'--'+site+'.netlify.app/.netlify/functions/inquirer-preview-diagnostic';

test('old and new project previews are accepted without a runtime CONTEXT variable',()=>{
 const prior=process.env.CONTEXT;
 try{
  delete process.env.CONTEXT;
  assert.equal(isPreviewDiagnosticContext(preview('brilliant-faun-c5b649')),true);
  assert.equal(isPreviewDiagnosticContext(preview('transcendent-manatee-2f0123')),true);
  assert.equal(isPreviewDiagnosticContext(preview('transcendent-manatee-2f0123',1002)),true);
 }finally{if(prior===undefined)delete process.env.CONTEXT;else process.env.CONTEXT=prior}
});

test('production and unrelated Netlify projects never expose the private diagnostic',()=>{
 const prior=process.env.CONTEXT;
 try{
  delete process.env.CONTEXT;
  for(const url of [
   'https://transcendent-manatee-2f0123.netlify.app/.netlify/functions/inquirer-preview-diagnostic',
   'https://brilliant-faun-c5b649.netlify.app/.netlify/functions/inquirer-preview-diagnostic',
   preview('unrelated-project'),
   'https://example.org/.netlify/functions/inquirer-preview-diagnostic'
  ])assert.equal(isPreviewDiagnosticContext(url),false,url);
 }finally{if(prior===undefined)delete process.env.CONTEXT;else process.env.CONTEXT=prior}
});

test('trusted Netlify deploy-preview context is accepted for actual function URLs',()=>{
 const prior=process.env.CONTEXT;
 try{
  process.env.CONTEXT='deploy-preview';
  assert.equal(isPreviewDiagnosticContext('https://localhost/.netlify/functions/inquirer-preview-diagnostic'),true);
 }finally{if(prior===undefined)delete process.env.CONTEXT;else process.env.CONTEXT=prior}
});

test('isolated per-deploy preview keys are not permanently named after Week 5',()=>{
 for(const key of [PREVIEW_DIAGNOSTIC_STATUS,PREVIEW_DIAGNOSTIC_EDITION,PREVIEW_DIAGNOSTIC_REJECTED]){
  assert.ok(key.endsWith('.json'));
  assert.doesNotMatch(key,/week-?5/i);
 }
});

test('diagnostic keys differ across the same season Week 3, Week 5 and Week 6',async()=>{
 const savedFetch=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({season:2026,week:7}),{status:200,headers:{'content-type':'application/json'}});
 try{
  const u='https://deploy-preview-402--transcendent-manatee-2f0123.netlify.app/.netlify/functions/inquirer-preview-diagnostic';
  const w3=await resolvePreviewIdentity(u+'?preview_week=3');
  const w5=await resolvePreviewIdentity(u+'?preview_week=5');
  const w6=await resolvePreviewIdentity(u+'?preview_week=6');
  const latest=await resolvePreviewIdentity(u);
  assert.deepEqual([w3.week,w5.week,w6.week,latest.week],[3,5,6,6]);
  assert.equal(new Set([w3.status,w5.status,w6.status]).size,3);
  assert.equal(new Set([w3.edition,w5.edition,w6.edition]).size,3);
  assert.equal(new Set([w3.rejected,w5.rejected,w6.rejected]).size,3);
  assert.match(w5.status,/2026\/week-05\/status\.json$/);
  assert.equal(w6.status,latest.status);
 }finally{globalThis.fetch=savedFetch}
});

test('new 2027 week reuses no old 2026 preview status',async()=>{
 const savedFetch=globalThis.fetch;
 let year=2026;
 globalThis.fetch=async()=>new Response(JSON.stringify({season:year,week:7}),{status:200});
 try{
  const url='https://deploy-preview-402--transcendent-manatee-2f0123.netlify.app/?inquirer_preview=1&preview_week=5';
  const prev=await resolvePreviewIdentity(url);
  year=2027;
  const next=await resolvePreviewIdentity(url);
  assert.notEqual(prev.status,next.status);
  assert.notEqual(prev.edition,next.edition);
 }finally{globalThis.fetch=savedFetch}
});
