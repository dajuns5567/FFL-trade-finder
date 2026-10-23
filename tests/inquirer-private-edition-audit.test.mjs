import test from 'node:test';
import assert from 'node:assert/strict';
import {auditPrivateEdition} from '../netlify/functions/lib/inquirer-preview-diagnostics.mjs';

const desks=['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'];
const beats=['lead','standings','players','decisions','league','outlook'];
function makeDraft(){
 return {preview_only:true,published_locked:false,preview_editorial_audit:{ok:true},preview_generation_quality:{ok:true},
  teams:Array.from({length:32},(_,i)=>({roster_id:String(i+1),inquirer_article:{
   headline:'Team '+(i+1),reporter:{id:'reporter-'+Math.floor(i/8)},
   sections:desks.map((kind,j)=>({kind,paragraphs:[Array.from({length:42},(_,k)=>'word'+i+'x'+j+'x'+k).join(' ')]}))
  }})),
  league_overview:{sections:[{blocks:beats.map(kind=>({kind}))},{},{},{}]}};
}
test('complete unpublished 32-team draft passes structural audit',()=>{
 const a=auditPrivateEdition(makeDraft());
 assert.equal(a.passed,true,JSON.stringify(a.issues));
 assert.equal(a.article_count,32);
 assert.equal(a.word_counts.minimum,336);
 assert.equal(Object.keys(a.reporter_counts).length,4);
});
test('rejects missing desks, recap, incomplete reporter distribution, and draft audit failures',()=>{
 const e=makeDraft();
 e.teams[0].inquirer_article.sections.pop();
 e.teams[31].inquirer_article.reporter.id='reporter-0';
 e.league_overview.sections[0].blocks.pop();
 e.preview_editorial_audit.ok=false;
 const a=auditPrivateEdition(e);
 assert.equal(a.passed,false);
 assert.match(a.issues.join(' '),/missing desks/);
 assert.match(a.issues.join(' '),/four reporters/);
 assert.match(a.issues.join(' '),/six-beat recap/);
 assert.match(a.issues.join(' '),/underlying editorial audit/);
});
test('three identical cross-roster paragraphs are rejected',()=>{
 const e=makeDraft(),shared=e.teams[0].inquirer_article.sections[0].paragraphs[0];
 for(const i of [1,2])e.teams[i].inquirer_article.sections[0].paragraphs[0]=shared;
 assert.equal(auditPrivateEdition(e).passed,false);
 assert.match(auditPrivateEdition(e).issues.join(' '),/repeated cross-roster/);
});
