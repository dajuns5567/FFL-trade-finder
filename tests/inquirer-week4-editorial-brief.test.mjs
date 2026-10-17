import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {week4EditorialBrief,validateWeek4EditorialDraft,REQUIRED_SECTION_KINDS} from '../netlify/functions/inquirer-week4-editorial-brief.mjs';

const baseline={...fixture,week:4};
const team=fixture.teams[0];

test('only a complete approved Week 4 edition may provide style samples',()=>{
  assert.throws(()=>week4EditorialBrief({team,acceptedWeek4:fixture,week:5}),/approved Week 4/);
  assert.throws(()=>week4EditorialBrief({team,acceptedWeek4:baseline,week:4}),/cannot mutate/);
  const brief=week4EditorialBrief({team,acceptedWeek4:baseline,week:5});
  const payload=JSON.parse(brief.user);
  assert.ok(payload.approved_week4_style_samples.length);
  assert.equal(payload.current_week_verified_facts.team,team.team_name);
  assert.match(brief.system,/Never lift or paraphrase/);
  assert.match(brief.system,/Do not borrow Weeks 1–3/);
  assert.doesNotMatch(brief.user,/previous_week_prose_source/);
});

test('the draft validator rejects incomplete articles and fabricated approval metadata',()=>{
  const empty=validateWeek4EditorialDraft({},team);
  assert.equal(empty.ok,false);
  assert.ok(empty.errors.length>=7);
  const good={headline:'A brutal Week 5 lesson in roster management',sections:REQUIRED_SECTION_KINDS.map(kind=>({kind,paragraphs:[
    `${team.team_name} went into its matchup with ${team.opponent_name} and finished with ${Number(team.points).toFixed(1)}. Management is going to have a very long morning explaining what everybody just saw.`,
    `The city is already arguing about the ${kind} story, and an embarrassing number of residents believe a fantasy-football argument counts as civic participation.`
  ]}))};
  assert.equal(validateWeek4EditorialDraft(good,team).ok,true);
  good.sections[0].paragraphs[0]='TODO';
  assert.equal(validateWeek4EditorialDraft(good,team).ok,false);
});
