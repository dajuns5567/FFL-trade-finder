import assert from 'node:assert/strict';
import week4Preload2026 from '../netlify/functions/inquirer-week4-2026-preload.mjs';
import {finalizeInquirerNarrative} from '../netlify/functions/inquirer-narrative-final.mjs';

// In-memory synthetic future edition only. Never publishes or writes archives.
const source=week4Preload2026();
const make=()=>{const e=structuredClone(source);e.week=5;return e;};
const sectionKinds=['lede','players','management','hot-seat','cool-throne','sentiment','outlook'];
function briefs(e){
 const teams={};
 for(const t of e.teams){
  const a=t.inquirer_article;
  const opponent=String(t.next_opponent_name||'an opponent not yet confirmed');
  teams[t.team_name]={
   opponent,
   reporter_id:String(a?.reporter?.id||'walter-mercer'),
   team_points:Number(t.points),
   opponent_points:Number(t.opponent_points)
  };
  for(const kind of sectionKinds)teams[t.team_name][kind]=[
   'Fresh synthetic '+kind+' for '+t.team_name+' in Week 5. This is a unique in-memory acceptance-test sentence only, never publication-ready prose.'
  ];
 }
 const recap={};
 const entries=(e.league_overview?.sections||[]).flatMap(s=>
  s.blocks?.length?s.blocks.map(b=>b.kind):[s.heading]);
 for(const key of entries)recap[key]=['Fresh synthetic recap section '+key+' for Week 5. This is only a fixture exercising the single-writer brief selection contract.'];
 return {season:2026,week:5,teams,recap};
}
const e=make();
assert.equal(e.teams.length,32,'expected all teams');
e.future_editorial_briefs=briefs(e);
const initialScores=e.teams.map(t=>t.points);
finalizeInquirerNarrative(e,{week:5});
assert.equal(e.editorial_quality.status,'HOLD_EDITORIAL_APPROVAL');
assert.equal(e.editorial_quality.fresh_briefs_complete,true,JSON.stringify(e.editorial_quality));
assert.equal(e.editorial_quality.missing_or_mismatched_articles.length,0);
for(const t of e.teams){
 assert.equal(t.inquirer_article.future_brief_status,'COMPLETE_UNAPPROVED',t.team_name);
 for(const kind of sectionKinds)assert.match(t.inquirer_article.sections.find(s=>s.kind===kind)?.paragraphs.join(' ')||'',/Fresh synthetic/);
}
assert.deepEqual(e.teams.map(t=>t.points),initialScores,'writer must not modify score facts');
assert.equal(e.league_overview.future_recap_brief_status,'COMPLETE_UNAPPROVED');

const broken=make();
broken.future_editorial_briefs=briefs(broken);
const first=broken.teams[0].team_name;
broken.future_editorial_briefs.teams[first].opponent='Wrong opponent';
delete broken.future_editorial_briefs.recap;
finalizeInquirerNarrative(broken,{week:5});
assert.equal(broken.editorial_quality.fresh_briefs_complete,false);
assert.equal(broken.teams[0].inquirer_article.future_brief_status,'MISSING_OR_FACT_MISMATCH');
assert.equal(broken.league_overview.future_recap_brief_status,'MISSING_OR_INCOMPLETE');
assert.equal(broken.editorial_quality.status,'HOLD_EDITORIAL_APPROVAL');
console.log('PASS: future-brief assembly, factual mismatch, missing recap and mandatory editorial hold');
