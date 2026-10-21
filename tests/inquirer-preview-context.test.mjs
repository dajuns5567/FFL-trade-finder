import test from 'node:test';
import assert from 'node:assert/strict';
import {isPreviewDiagnosticContext,PREVIEW_DIAGNOSTIC_STATUS,PREVIEW_DIAGNOSTIC_EDITION,PREVIEW_DIAGNOSTIC_REJECTED} from '../netlify/functions/lib/inquirer-preview-diagnostics.mjs';

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
