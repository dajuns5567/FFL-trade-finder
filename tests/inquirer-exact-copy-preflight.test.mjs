import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectImmutableWeekCandidate} from '../scripts/inquirer-week5-exact-copy-preflight.mjs';
const source=()=>({season:2026,week:5,preview_only:true,published_locked:false,editorial_revision:39,
 reporters:[{id:'one'}],league_overview:{headline:'Week 5',sections:[{blocks:['lead','standings','players','decisions','league','outlook'].map(kind=>({kind,paragraphs:[kind]})),
 paragraphs:['lead','standings','players','decisions','league','outlook']}],hot_takes:[]},
 teams:Array.from({length:32},(_,i)=>({roster_id:String(i+1),points:100+i,opponent_points:101+i,
 inquirer_article:{headline:'headline '+i,sections:[{kind:'lede',paragraphs:['copy '+i]}],paragraphs:['copy '+i]}}))});
test('offline copy preflight never authorizes publication, even on a valid source clone',()=>{
 const a=source(),result=inspectImmutableWeekCandidate(a,structuredClone(a));
 assert.equal(result.publication_authorized,false);
 assert.equal(result.never_activate_scheduler,true);
 assert.equal(result.changes.length,0);
});
test('offline preflight refuses changed score, roster omission, or public lock status',()=>{
 const a=source(),b=structuredClone(a);
 b.teams[0].points=1;
 assert.ok(inspectImmutableWeekCandidate(a,b).failures.some(x=>x.includes('Fact or context modified')));
 b.teams[0].points=a.teams[0].points;b.teams.pop();
 assert.ok(inspectImmutableWeekCandidate(a,b).failures.some(x=>x.includes('32 team')));
 b.teams.push(structuredClone(a.teams[31]));b.published_locked=true;
 assert.ok(inspectImmutableWeekCandidate(a,b).failures.some(x=>x.includes('unpublished')));
});
test('offline preflight rejects an unsynchronized team article or recap mirror',()=>{
 const a=source(),b=structuredClone(a);
 b.teams[0].inquirer_article.paragraphs=['other'];
 assert.ok(inspectImmutableWeekCandidate(a,b).failures.some(x=>x.includes('Article mirror')));
 b.teams[0].inquirer_article.paragraphs=['copy 0'];
 b.league_overview.sections[0].paragraphs=['bad'];
 assert.ok(inspectImmutableWeekCandidate(a,b).failures.some(x=>x.includes('Recap paragraph mirror')));
});
