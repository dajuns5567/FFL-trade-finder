import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCanonicalArchive} from '../netlify/functions/lib/inquirer-legacy-history.mjs';
const DESKS=['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'];
const BEATS=['lead','standings','players','decisions','league','outlook'];
const make=week=>({
 available:true,season:2026,week,inquirer_version:31,editorial_revision:14,
 teams:Array.from({length:32},(_,i)=>({roster_id:String(i+1),inquirer_article:{
  headline:'Verified historical '+week+' editorial '+(i+1),
  reporter:{id:'desk-'+Math.floor(i/8)},
  sections:DESKS.map(kind=>({kind,heading:'Story '+kind,paragraphs:['Real analysis']}))
 }})),
 league_overview:{headline:'Verified historic Week '+week+' recap',
  sections:[{blocks:BEATS.map(kind=>({kind,heading:'Beat '+kind}))},{},{},{}]}
});
const clone=x=>structuredClone(x);
test('only full real 2026 Week 3/4 V31 archives lacking the new lock flag qualify for legacy compatibility',()=>{
 for(const week of [3,4]){
  const item=make(week);
  assert.equal('published_locked' in item,false);
  assert.deepEqual(inspectCanonicalArchive(item,2026,week),{ok:true,legacy:true,issues:[]});
  const locked={...item,published_locked:true};
  assert.deepEqual(inspectCanonicalArchive(locked,2026,week),{ok:true,legacy:false,issues:[]});
 }
});
test('an explicit unlocked draft or any Week5+ without published_locked=true is NEVER canonical',()=>{
 const week4=make(4);
 assert.equal(inspectCanonicalArchive({...week4,published_locked:false},2026,4).ok,false);
 assert.equal(inspectCanonicalArchive({...make(5)},2026,5).ok,false);
 assert.equal(inspectCanonicalArchive({...make(5),published_locked:false},2026,5).ok,false);
 assert.equal(inspectCanonicalArchive({...make(5),published_locked:true},2026,5).ok,true);
 assert.equal(inspectCanonicalArchive({...make(4),season:2027},2027,4).ok,false);
});
test('legacy Week 4 refuses every known old-format regression',()=>{
 const original=make(4);
 const missing=clone(original);
 missing.teams[0].inquirer_article.sections=missing.teams[0].inquirer_article.sections.filter(s=>s.kind!=='cool-throne');
 assert.match(inspectCanonicalArchive(missing,2026,4).issues.join(' '),/eight editorial desks/);
 const duplicate=clone(original);
 duplicate.teams[31].roster_id='1';
 assert.match(inspectCanonicalArchive(duplicate,2026,4).issues.join(' '),/distinct roster/);
 const recap=clone(original);
 recap.league_overview.sections[0].blocks.pop();
 assert.match(inspectCanonicalArchive(recap,2026,4).issues.join(' '),/six-beat/);
 const reporters=clone(original);
 reporters.teams[0].inquirer_article.reporter.id='desk-1';
 assert.match(inspectCanonicalArchive(reporters,2026,4).issues.join(' '),/four-reporter/);
 const wrongVersion={...original,inquirer_version:30};
 assert.match(inspectCanonicalArchive(wrongVersion,2026,4).issues.join(' '),/V31/);
 const wrongRevision={...original,editorial_revision:13};
 assert.match(inspectCanonicalArchive(wrongRevision,2026,4).issues.join(' '),/revision 14/);
});
