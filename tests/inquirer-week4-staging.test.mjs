import test from 'node:test';
import assert from 'node:assert/strict';
import fixture from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {REQUIRED_SECTION_KINDS} from '../netlify/functions/inquirer-week4-editorial-brief.mjs';
import {stageWeek4EditorialBatch,week4DraftKey} from '../netlify/functions/inquirer-week4-staging.mjs';

test('draft key is digest-addressed and cannot overlap publication namespaces',()=>{
  const key=week4DraftKey({season:2026,week:5,digest:'a'.repeat(64)});
  assert.equal(key,'inquirer/week4-style-drafts/2026/week-05/'+ 'a'.repeat(64)+'.json');
  assert.doesNotMatch(key,/broadcasts|editorial-staging/);
  assert.throws(()=>week4DraftKey({season:2026,week:4,digest:'a'.repeat(64)}),/Invalid future-week/);
  assert.throws(()=>week4DraftKey({season:2026,week:5,digest:'not-a-hash'}),/digest/);
});

test('operator draft writes to isolated review storage, never approves or publishes',async()=>{
  const writes=[];
  const store={setJSON:async(key,value)=>{writes.push({key,value})}};
  const client={chat:{completions:{create:async request=>{
    const facts=JSON.parse(request.messages[1].content);
    if(facts.verified_games)return{choices:[{message:{content:JSON.stringify({headline:'Week five league dispatch',
      sections:Array.from({length:4},(_,i)=>({heading:'Roundup '+i,paragraphs:[
        'An uproar swept through the standings as the latest slate created a lot of difficult questions for some very confident front offices.',
        'The next round will offer an unusually direct verdict on which clubs are solving their problems and which are still inventing excuses.'
      ]})),hot_takes:Array.from({length:4},(_,i)=>({title:'Take '+i,take:'A reckoning awaits.'}))})}}]};
    const f=facts.current_week_verified_facts;
    return{choices:[{message:{content:JSON.stringify({headline:'Another bruise on the record for '+f.team,
      sections:REQUIRED_SECTION_KINDS.map(kind=>({kind,heading:'The '+kind+' report',paragraphs:[
        `${f.team} faced ${f.opponent} with a score of ${f.score} against ${f.opponent_score}. ${f.top_players[0].name} was the name on everyone's lips when the clock finally stopped.`,
        `The ${kind} report had everyone talking about the dangers of a fantasy football front office that believes good intentions count in the standings.`
      ]}))})}}]};
  }}}};
  const result=await stageWeek4EditorialBatch({store,edition:{...fixture,week:5},acceptedWeek4:{...fixture,week:4},client,model:'mock',concurrency:4});
  assert.equal(writes.length,1);
  assert.equal(writes[0].key,result.key);
  assert.match(result.key,/^inquirer\/week4-style-drafts\/2026\/week-05\/[a-f0-9]{64}\.json$/);
  assert.equal(result.publishable,false);
  assert.equal(writes[0].value.review_status,'unapproved');
  assert.equal(writes[0].value.edition.published_locked,false);
  assert.equal(writes[0].value.edition.teams.length,32);
  assert.equal(writes[0].value.quality.ok,false,'mock repetitive content cannot be approved');
});

test('no storage writes happen if the source or model is rejected',async()=>{
  let writes=0,calls=0;
  const store={setJSON:async()=>{writes++}};
  const client={chat:{completions:{create:async()=>{calls++;throw Error('must not be called')}}}};
  await assert.rejects(stageWeek4EditorialBatch({store,edition:{...fixture,week:5,teams:fixture.teams.slice(1)},acceptedWeek4:{...fixture,week:4},client,model:'mock'}),/complete future-week edition|Unverified weekly source/);
  assert.equal(calls,0);
  assert.equal(writes,0);
});
