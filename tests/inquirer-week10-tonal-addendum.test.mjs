import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {addWeekTenEditorialHumor} from '../netlify/functions/lib/inquirer-week10-humor-addendum.mjs';

const fixture=()=>({
 available:true,published_locked:true,season:2026,week:10,
 editorial_generation:{engine:'v31-forward'},teams:Array.from({length:32},(_,i)=>({
  roster_id:String(i+1),team_name:'Team '+(i+1),opponent_name:'Opponent '+(i+1),
  points:110+i,opponent_points:95+i,
  starter_details:[{name:'Starter '+(i+1),points:2+i/10}],
  inquirer_article:{reporter:{id:['walter-mercer','tess-delaney','mack-hollis','nora-voss'][i%4]},
   headline:'Original verified headline '+(i+1),
   sections:[{kind:'sentiment',paragraphs:['Original reporter prose for '+(i+1)]}],
   paragraphs:['Original reporter prose for '+(i+1)]}
 }))
});

test('Week 10 gets unique, score-backed sarcasm in all 32 team articles without altering original archive',()=>{
 const original=fixture(),frozen=JSON.stringify(original),updated=addWeekTenEditorialHumor(original);
 assert.equal(JSON.stringify(original),frozen,'original hashed edition must stay untouched');
 assert.equal(updated.teams.length,32);
 assert.equal(updated.reader_tonal_addendum.archive_original_unchanged,true);
 const lines=updated.teams.map(t=>t.inquirer_article.sections[0].paragraphs.at(-1));
 assert.equal(new Set(lines).size,32);
 for(let i=0;i<32;i++){
  assert.match(lines[i],new RegExp('Team '+(i+1)));
  assert.match(lines[i],new RegExp('Starter '+(i+1)));
  assert.equal(updated.teams[i].inquirer_article.paragraphs.length,2);
 }
 assert.equal(addWeekTenEditorialHumor(updated),updated,'no repeated tone augmentation on cache reads');
});
test('no alteration of other weeks, unapproved drafts or incomplete issues',()=>{
 const w9=fixture();w9.week=9;assert.equal(addWeekTenEditorialHumor(w9),w9);
 const draft=fixture();draft.published_locked=false;assert.equal(addWeekTenEditorialHumor(draft),draft);
 const broken=fixture();broken.teams.pop();assert.equal(addWeekTenEditorialHumor(broken),broken);
});
test('publisher source never imports reader-only humor and public read uses verified archive first',()=>{
 const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 const publisher=readFileSync(new URL('../scripts/publish-inquirer-github-native.mjs',import.meta.url),'utf8');
 assert.match(hub,/githubPublishedInquirerEdition\(season,week\)/);
 assert.match(hub,/const reviewedReaderEdition=edition=>addWeekTenEditorialHumor\(correctWeekNineReaderEdition\(edition\)\)/);
 assert.doesNotMatch(publisher,/inquirer-week10-humor-addendum/);
});
