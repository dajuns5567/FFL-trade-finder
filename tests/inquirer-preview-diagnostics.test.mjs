import test from 'node:test';
import assert from 'node:assert/strict';
import {isPreviewDiagnosticContext,privatePreviewStoreName,summarizePreviewDiagnostic,detectStalledPreview} from '../netlify/functions/lib/inquirer-preview-diagnostics.mjs';

test('diagnostics are permitted only in Deploy Preview',()=>{
 const original=process.env.CONTEXT;
 try{
  for(const context of ['production','branch-deploy','dev','']){process.env.CONTEXT=context;assert.equal(isPreviewDiagnosticContext(),false);}
  process.env.CONTEXT='deploy-preview';
  assert.equal(isPreviewDiagnosticContext(),true);
 }finally{
  if(original===undefined)delete process.env.CONTEXT;else process.env.CONTEXT=original;
 }
});
test('only the exact PR preview hostname can supplement a missing context',()=>{
 const original=process.env.CONTEXT;
 try{
  process.env.CONTEXT='production';
  assert.equal(isPreviewDiagnosticContext('https://deploy-preview-402--brilliant-faun-c5b649.netlify.app/.netlify/functions/inquirer-preview-diagnostic'),true);
  assert.equal(isPreviewDiagnosticContext('https://brilliant-faun-c5b649.netlify.app/.netlify/functions/inquirer-preview-diagnostic'),false);
  assert.equal(isPreviewDiagnosticContext('https://deploy-preview-403--brilliant-faun-c5b649.netlify.app/'),false);
 }finally{if(original===undefined)delete process.env.CONTEXT;else process.env.CONTEXT=original;}
});
test('summary has audit results without article manuscripts',()=>{
 const report={available:true,preview_only:true,published_locked:false,week:5,season:2026,
  preview_editorial_audit:{ok:true,issues:[]},preview_generation_quality:{ok:true,issues:[]},
  teams:[{team_name:'Example',inquirer_article:{reporter:{id:'desk-a'},headline:'Example wins',sections:[{paragraphs:['Private manuscript']}]}}]};
 const summary=summarizePreviewDiagnostic(report);
 assert.equal(summary.article_count,1);
 assert.equal(summary.reporter_counts['desk-a'],1);
 assert.equal(summary.editorial_audit.ok,true);
 assert.equal(JSON.stringify(summary).includes('Private manuscript'),false);
});

test('stalled private jobs are reported as timed out, without changing a completed manuscript',()=>{
 const started_at='2026-10-26T22:49:20.012Z';
 const running={state:'running',season:2026,week:5,started_at};
 const now=Date.parse(started_at);
 assert.equal(detectStalledPreview(running,now+19*60*1000).state,'running');
 const stale=detectStalledPreview(running,now+20*60*1000);
 assert.equal(stale.state,'error');
 assert.equal(stale.timed_out,true);
 assert.match(stale.error,/retry window/);
 assert.equal(detectStalledPreview({state:'completed',started_at},now+30*60*1000).state,'completed');
 assert.equal(detectStalledPreview({state:'running',started_at:'bad'},now).state,'error');
});


test('private diagnostic store is distinct per PR and rejects non-preview hosts',()=>{
 const host=n=>'https://deploy-preview-'+n+'--transcendent-manatee-2f0123.netlify.app/.netlify/functions/inquirer-preview-diagnostic';
 assert.equal(privatePreviewStoreName(host(402)),'fleeced-inquirer-private-pr402-persistent');
 assert.equal(privatePreviewStoreName(host(403)),'fleeced-inquirer-private-pr403-persistent');
 assert.equal(privatePreviewStoreName(host(404)),'fleeced-inquirer-private-pr404-persistent');
 assert.notEqual(privatePreviewStoreName(host(403)),privatePreviewStoreName(host(404)));
 for(const url of [
  'https://transcendent-manatee-2f0123.netlify.app/',
  'https://main--transcendent-manatee-2f0123.netlify.app/',
  'https://deploy-preview-403--brilliant-faun-c5b649.netlify.app/',
  'https://deploy-preview-403--transcendent-manatee-2f0123.netlify.app.attacker.com/',
  'not-a-url'
 ])assert.equal(privatePreviewStoreName(url),null,url);
});
