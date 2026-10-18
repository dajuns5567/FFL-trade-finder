import test from 'node:test';
import assert from 'node:assert/strict';
import {isPreviewDiagnosticContext,summarizePreviewDiagnostic} from '../netlify/functions/inquirer-preview-diagnostics.mjs';

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
