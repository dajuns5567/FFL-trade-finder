import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {buildWeek4EditorialBatch,week4RecapBrief,verifyWeeklyEditorialSource,composeWeek4RecapDraft,repairWeek4EditorialBatch} from '../netlify/functions/inquirer-week4-batch.mjs';
import {REQUIRED_SECTION_KINDS} from '../netlify/functions/inquirer-week4-editorial-brief.mjs';

const accepted={...fixture,week:4};
const input={...fixture,week:5,teams:fixture.teams.map(team=>({...team}))};

test('recap uses sixteen reciprocal games and approved Week 4 style only',()=>{
  const brief=week4RecapBrief({edition:input,acceptedWeek4:accepted});
  const data=JSON.parse(brief.user);
  assert.equal(data.verified_games.length,16);
  assert.ok(data.approved_week4_recap_style_samples.length>=2);
  assert.match(brief.system,/Never copy or paraphrase/i);
  assert.throws(()=>week4RecapBrief({edition:{...input,teams:input.teams.slice(1)},acceptedWeek4:accepted}),/Unverified weekly source/);
});

test('contradictory source scores and roster IDs fail before spending any model calls',async()=>{
  let calls=0;
  const client={chat:{completions:{create:async()=>{calls++;throw Error('should not call model')}}}};
  const run=async teams=>buildWeek4EditorialBatch({edition:{...input,teams},acceptedWeek4:accepted,client,model:'mock'});
  const mismatched=input.teams.map((t,i)=>i===0?{...t,opponent_points:Number(t.opponent_points)+20}:t);
  assert.match(verifyWeeklyEditorialSource({...input,teams:mismatched}).issues.join(' '),/reciprocal scores disagree/);
  await assert.rejects(run(mismatched),/reciprocal scores disagree/);
  const duplicated=input.teams.map((t,i)=>i===0?{...t,roster_id:input.teams[1].roster_id}:t);
  await assert.rejects(run(duplicated),/duplicate or missing roster identifiers/);
  const noLineup=input.teams.map((t,i)=>i===0?{...t,starter_details:[]}:t);
  await assert.rejects(run(noLineup),/verified lineup missing/);
  assert.equal(calls,0);
});

test('generic recap with no real matchups fails even with long paragraphs and hot takes',async()=>{
  const generic={headline:'The day that shook the league',sections:Array.from({length:4},(_,i)=>({heading:'League beat '+i,paragraphs:[
    'Managers spent the entire afternoon fighting about difficult decisions and inexplicable roster choices in a week full of fantasy football drama.',
    'The loudest supporters began demanding answers from the coaching staff while rivals celebrated as though victory had ended a generation of misery.'
  ]})),hot_takes:Array.from({length:4},(_,i)=>({title:'Take '+i,take:'Managers have questions.'}))};
  const client={chat:{completions:{create:async()=>({choices:[{message:{content:JSON.stringify(generic)}}]})}}};
  await assert.rejects(composeWeek4RecapDraft({client,model:'mock',edition:input,acceptedWeek4:accepted}),/insufficient specific verified matchup/);
});

test('batch builds 32 review-only drafts and never publishes a failing audit',async()=>{
  let calls=0;
  const client={chat:{completions:{create:async request=>{
    calls++;
    const prompt=JSON.parse(request.messages[1].content);
    if(prompt.verified_games){
      const grounded=prompt.verified_games.slice(0,4).map(g=>`${g.team.team} scored ${g.team.score} against ${g.opponent.team}'s ${g.opponent.score}.`).join(' ');
      const recap={headline:'Week 5: An assortment of regrettable Sundays',deck:'The league has opinions',
        sections:Array.from({length:4},(_,i)=>({heading:'Recap section '+i,paragraphs:[
          `${grounded} Everyone around the league is rehearsing a complaint about this week's results while rivals rehearse an even more aggravating victory speech.`,
          `Some managers earned their celebration and others earned a compulsory review of the lineup card before the next Sunday makes today's mistake look historic.`
        ]})),hot_takes:Array.from({length:4},(_,i)=>({title:'Take '+i,take:'Somebody must answer for Sunday.'}))};
      return{choices:[{message:{content:JSON.stringify(recap)}}]};
    }
    const f=prompt.current_week_verified_facts;
    const article={headline:'This Week Was a Football Crime Scene for '+f.team,sections:REQUIRED_SECTION_KINDS.map(kind=>({kind,heading:'The '+kind+' report',paragraphs:[
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

test('shallow model drafts are preserved for review but can never pass publication quality',async()=>{
  let calls=0;
  const client={chat:{completions:{create:async()=>{calls++;return{choices:[{message:{content:'{}'}}]}}}}};
  const result=await buildWeek4EditorialBatch({edition:input,acceptedWeek4:accepted,client,model:'mock',concurrency:1});
  assert.equal(calls,33,'one request per team and one recap request, with no blind paid retries');
  assert.equal(result.publishable,false);
  assert.equal(result.quality.ok,false);
  assert.equal(result.quality.article_review_issues.length,32);
  assert.equal(result.quality.recap_review_issue,'recap_draft_invalid');
  assert.equal(result.edition.teams.length,32);
});

test('targeted review repair preserves facts, does not rerun passing stories blindly, and remains unapproved',async()=>{
  let calls=0;
  const client={chat:{completions:{create:async()=>{calls++;return{choices:[{message:{content:'{}'}}]}}}}};
  const source={...input,teams:input.teams.map(t=>({...t}))};
  const before=JSON.stringify(source);
  const result=await repairWeek4EditorialBatch({
    edition:source,acceptedWeek4:accepted,client,model:'mock',concurrency:2});
  assert.equal(JSON.stringify(source),before,'the original staged manuscript must remain unmodified');
  assert.equal(result.edition.teams.length,32);
  assert.equal(result.edition.published_locked,false);
  assert.equal(result.publishable,false);
  assert.equal(result.review_status,'unapproved');
  assert.equal(result.quality.ok,false,'invalid repairs may never be approved');
  assert(calls<=33,'at most 32 targeted article calls and one recap call');
  assert(calls>=1,'recap salvage is attempted once');
  for(let i=0;i<32;i++){
    const {inquirer_article:beforeArticle,...beforeFacts}=source.teams[i];
    const {inquirer_article:afterArticle,...afterFacts}=result.edition.teams[i];
    assert.deepEqual(afterFacts,beforeFacts,'repair must preserve verified football and manager facts');
  }
});
