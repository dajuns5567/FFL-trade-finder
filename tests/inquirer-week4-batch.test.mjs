import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {buildWeek4EditorialBatch,week4RecapBrief} from '../netlify/functions/inquirer-week4-batch.mjs';
import {REQUIRED_SECTION_KINDS} from '../netlify/functions/inquirer-week4-editorial-brief.mjs';

const accepted={...fixture,week:4};
const input={...fixture,week:5,teams:fixture.teams.map(team=>({...team}))};

test('recap uses sixteen reciprocal games and approved Week 4 style only',()=>{
  const brief=week4RecapBrief({edition:input,acceptedWeek4:accepted});
  const data=JSON.parse(brief.user);
  assert.equal(data.verified_games.length,16);
  assert.ok(data.approved_week4_recap_style_samples.length>=2);
  assert.match(brief.system,/Never copy or paraphrase/i);
  assert.throws(()=>week4RecapBrief({edition:{...input,teams:input.teams.slice(1)},acceptedWeek4:accepted}),/Missing reciprocal opponent|16 verified games/);
});

test('batch builds 32 review-only drafts and never publishes a failing audit',async()=>{
  let calls=0;
  const client={chat:{completions:{create:async request=>{
    calls++;
    const prompt=JSON.parse(request.messages[1].content);
    if(prompt.verified_games){
      const recap={headline:'Week 5: An assortment of regrettable Sundays',deck:'The league has opinions',
        sections:Array.from({length:4},(_,i)=>({heading:'Recap section '+i,paragraphs:[
          `Everyone around the league is rehearsing a very specific complaint about this week's results while their rivals rehearse an even more aggravating victory speech.`,
          `Some managers earned their celebration and others earned a compulsory review of the lineup card before the next Sunday makes today's mistake look historic.`
        ]})),hot_takes:Array.from({length:4},(_,i)=>({title:'Take '+i,take:'Somebody must answer for Sunday.'}))};
      return{choices:[{message:{content:JSON.stringify(recap)}}]};
    }
    const f=prompt.current_week_verified_facts;
    const article={headline:'This Week Was a Football Crime Scene for '+f.team,sections:REQUIRED_SECTION_KINDS.map(kind=>({kind,paragraphs:[
      `${f.team} faced ${f.opponent} and scored ${Number(f.score).toFixed(1)} fantasy points to the opponent's ${Number(f.opponent_score).toFixed(1)}. ${f.top_players[0].name} gave the whole city a reason to hold an unnecessarily theatrical town meeting.`,
      `The ${kind} discussion is going to be noisy because management did enough this weekend to inspire several weeks of arguments from its least patient supporters.`
    ]}))};
    return{choices:[{message:{content:JSON.stringify(article)}}]};
  }}}};
  const result=await buildWeek4EditorialBatch({edition:input,acceptedWeek4:accepted,previousEdition:fixture,client,model:'mock',concurrency:3});
  assert.equal(calls,33);
  assert.equal(result.edition.teams.length,32);
  assert.equal(result.publishable,false);
  assert.equal(result.review_status,'unapproved');
  assert.equal(result.edition.published_locked,false);
  assert.ok(result.edition.league_overview.sections.every(s=>s.reporter?.id));
  assert.ok(result.edition.league_overview.hot_takes.every(t=>t.reporter?.id));
  assert.equal(result.quality.ok,false,'repetitive fake model content must not pass editorial admission');
  for(let i=0;i<32;i++){
    const {inquirer_article:beforeArticle,...before}=input.teams[i];
    const {inquirer_article:afterArticle,...after}=result.edition.teams[i];
    assert.deepEqual(after,before,'all factual, matchup, awards-context and manager fields remain untouched');
    assert.equal(afterArticle.reporter.id,beforeArticle.reporter.id);
  }
  assert.deepEqual(accepted,{...fixture,week:4},'the Week 4 baseline is read-only');
});

test('invalid articles abort the whole batch before any recap call',async()=>{
  let calls=0;
  const client={chat:{completions:{create:async()=>{calls++;return{choices:[{message:{content:'{}'}}]}}}}};
  await assert.rejects(buildWeek4EditorialBatch({edition:input,acceptedWeek4:accepted,client,model:'mock',concurrency:1}),/held/);
  assert.equal(calls,1);
});
