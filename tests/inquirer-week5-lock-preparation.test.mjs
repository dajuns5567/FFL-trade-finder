import test from 'node:test';
import assert from 'node:assert/strict';
import {editorialCopyDigest} from '../netlify/functions/inquirer-publication-guard.mjs';
import {buildLockedWeek5Publication} from '../scripts/inquirer-week5-lock-preparation.mjs';
const seed=()=>{
 const team=(i)=>({roster_id:String(i+1),inquirer_article:{
 headline:'Distinct original article '+i,reporter:{id:['a','b','c','d'][i%4]},
 sections:['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'].map(kind=>({kind,paragraphs:['Real copy '+kind]}))}});
 return {season:2026,week:5,available:true,inquirer_version:31,editorial_revision:40,
 editorial_generation:{engine:'v31-forward',offline_editorial_revision_note:'editorial HOLD'},preview_only:true,
 published_locked:false,preview_warning:'Offline editorial HOLD',
 preview_generation_quality:{ok:false},preview_editorial_audit:{ok:false},
 teams:Array.from({length:32},(_,i)=>team(i)),
 league_overview:{headline:'Week 5 recap',sections:[{
 blocks:['lead','standings','players','decisions','league','outlook'].map(kind=>({kind,paragraphs:['Story']}))
 },{paragraphs:['Desk 2']},{paragraphs:['Desk 3']},{paragraphs:['Desk 4']}]}}
};
const permit=(candidate)=>{
 const sha=editorialCopyDigest(candidate);
 return {authorization:{ready_to_request_operator_import:true,publication_executed:false,editorial_sha256:sha},
 approval:{approved:true,season:2026,week:5,sha256:sha,reviewed_by:'Editor',reviewed_at:'2026-10-23T12:00:00Z'}};
};
test('approved exact copy can be locked without altering visible editorial digest',()=>{
 const original=seed(),before=structuredClone(original),args=permit(original);
 const result=buildLockedWeek5Publication(original,args);
 assert.equal(result.edition.published_locked,true);
 assert.equal(result.edition.preview_only,undefined);
 assert.equal(result.edition.preview_warning,undefined);
 assert.equal(result.edition.editorial_generation.offline_editorial_revision_note,undefined);
 assert.equal(result.target_key,'broadcasts/2026/week-05.json');
 assert.equal(result.editorial_sha256,args.approval.sha256);
 assert.equal(result.imported,false);
 assert.equal(result.awards_written,false);
 assert.deepEqual(original,before);
});
test('locking does not accept absent review or a changed narrative after approval',()=>{
 const candidate=seed(),args=permit(candidate);
 assert.throws(()=>buildLockedWeek5Publication(candidate,{authorization:args.authorization}),/approval/);
 candidate.teams[0].inquirer_article.headline='Changed after editor approved';
 assert.throws(()=>buildLockedWeek5Publication(candidate,args),/approval|digest/);
});
test('locked or historically mislabelled candidates are rejected',()=>{
 const candidate=seed(),args=permit(candidate);
 candidate.week=4;
 assert.throws(()=>buildLockedWeek5Publication(candidate,args),/approval|Week5/);
});
