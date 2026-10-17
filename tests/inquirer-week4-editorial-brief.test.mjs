import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {week4EditorialBrief,validateWeek4EditorialDraft,composeWeek4ArticleDraft,REQUIRED_SECTION_KINDS} from '../netlify/functions/inquirer-week4-editorial-brief.mjs';

const baseline={...fixture,week:4};
const team=fixture.teams[0];

test('only a complete approved Week 4 edition may provide style samples',()=>{
  assert.throws(()=>week4EditorialBrief({team,acceptedWeek4:fixture,week:5}),/approved Week 4/);
  assert.throws(()=>week4EditorialBrief({team,acceptedWeek4:{...baseline,published_locked:false},week:5}),/approved Week 4/);
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
    `${team.team_name} went into its matchup with ${team.opponent_name} and finished with ${Number(team.points).toFixed(1)} to ${Number(team.opponent_points).toFixed(1)}. ${team.starter_details[0].name} is going to have a very long morning explaining what everybody just saw.`,
    `The city is already arguing about the ${kind} story, and an embarrassing number of residents believe a fantasy-football argument counts as civic participation.`
  ]}))};
  assert.equal(validateWeek4EditorialDraft(good,team).ok,true);
  good.sections[0].paragraphs[0]='TODO';
  assert.equal(validateWeek4EditorialDraft(good,team).ok,false);
});

test('server-side composer validates JSON and can only return an unapproved draft',async()=>{
  const draft={headline:'Week 5 brought hard questions for the front office',sections:REQUIRED_SECTION_KINDS.map(kind=>({kind,paragraphs:[
    `${team.team_name} put ${Number(team.points).toFixed(1)} on the board opposite ${team.opponent_name}'s ${Number(team.opponent_points).toFixed(1)}, then watched ${team.starter_details[0].name} learn how quickly supporters can become amateur general managers.`,
    `The ${kind} conversation is going to be savage because the football was nowhere near as polite as the manager would have preferred this afternoon.`
  ]}))};
  const client={chat:{completions:{create:async args=>{
    assert.match(args.messages[0].content,/APPROVED WEEK 4/);
    return{model:'mock-model',choices:[{message:{content:JSON.stringify(draft)}}]};
  }}}};
  const result=await composeWeek4ArticleDraft({client,model:'mock-model',team,acceptedWeek4:baseline,week:5});
  assert.equal(result.review_status,'unapproved');
  assert.equal(result.article.week,5);
  assert.equal(result.article.editorial_source,'week4-v19-style-ai-draft');
  assert.equal(result.article.paragraphs.length,12);
  await assert.rejects(composeWeek4ArticleDraft({client:{chat:{completions:{create:async()=>({choices:[{message:{content:'not json'}}]})}}},model:'mock',team,acceptedWeek4:baseline,week:5}),/JSON article/);
});
