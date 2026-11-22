import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COMPOSITIONAL_VOICE_CONTRACT,reinforceForwardReporterVoice,rotateForwardRecapOpening}
 from '../netlify/functions/lib/inquirer-compositional-voice.mjs';
import {FORWARD_EDITORIAL_REVISION} from '../netlify/functions/inquirer-editorial-v31.mjs';

const reporters=['walter-mercer','tess-delaney','mack-hollis','nora-voss'];
const team=i=>({
 roster_id:i+1,team_name:'Club '+(i+1),opponent_name:'Opponent '+(i+1),points:110+i,
 opponent_points:91+i,starter_details:[{name:'Starter '+(i+1),points:1.2+i/10},
 {name:'Second scorer '+(i+1),points:31+i/10}],
 inquirer_article:{headline:'Archived original headline',reporter:{id:reporters[i%4]},
 sections:[{kind:'sentiment',paragraphs:['Original meaningful source-grounded fan sentiment.']},
 {kind:'management',paragraphs:['Original factual manager reporting.']}],
 paragraphs:['Original meaningful source-grounded fan sentiment.','Original factual manager reporting.']}
});
const recap=()=>({sections:[{blocks:[
 {kind:'lead',paragraphs:['Original source-backed lede.', 'Original second paragraph.']}
],paragraphs:['Original source-backed lede.','Original second paragraph.']}],paragraphs:[]});

test('automatic publisher uses compositional editorial contract rather than a finite opener bank',()=>{
 assert.equal(COMPOSITIONAL_VOICE_CONTRACT,1);
 assert.equal(FORWARD_EDITORIAL_REVISION,112);
 const publisher=readFileSync(new URL('../scripts/publish-inquirer-github-native.mjs',import.meta.url),'utf8');
 const newsroom=readFileSync(new URL('../netlify/functions/inquirer-editorial-v31.mjs',import.meta.url),'utf8');
 assert.match(publisher,/applyInquirerEditorialV31/);
 assert.match(publisher,/FORWARD_EDITORIAL_REVISION/);
 assert.match(newsroom,/composeReporterVoice\(teams,week,salt,history\)/);
 assert.match(newsroom,/composeRecapOpening\(overview,teams,week,salt,history\)/);
});

test('all 32 future articles get different fact-grounded commentary with four distinct reporter voices',()=>{
 const teams=Array.from({length:32},(_,i)=>team(i));
 const original=JSON.stringify(teams);
 reinforceForwardReporterVoice(teams,11,0,[]);
 assert.notEqual(JSON.stringify(teams),original);
 const lines=teams.map(t=>t.inquirer_article.sections[0].paragraphs.at(-1));
 assert.equal(new Set(lines).size,32);
 for(let i=0;i<32;i++){
  assert.match(lines[i],new RegExp('Club '+(i+1)));
  assert.match(lines[i],new RegExp('Starter '+(i+1)));
  assert.match(lines[i],new RegExp((1.2+i/10).toFixed(1).replace('.','\\.') ));
  assert.equal(teams[i].inquirer_article.paragraphs.join('|'),
   teams[i].inquirer_article.sections.flatMap(s=>s.paragraphs).join('|'));
 }
});

test('recap composition yields more than twelve distinct beginnings without reusing archived openings',()=>{
 const teams=Array.from({length:32},(_,i)=>team(i));
 const history=[],seen=new Set();
 for(let week=11;week<=18;week++)for(let salt=0;salt<5;salt++){
  const overview=recap();
  rotateForwardRecapOpening(overview,teams,week,salt,history);
  const opening=overview.sections[0].blocks[0].paragraphs[0];
  assert.match(opening,/Club \d+/);
  assert.match(opening,/\d+\.\d/);
  assert(!seen.has(opening),'recap must never reuse a recent opener');
  seen.add(opening);
  assert.equal(overview.sections[0].paragraphs[0],opening);
  history.push({league_overview:JSON.parse(JSON.stringify(overview))});
 }
 assert(seen.size>12);
});

test('historical editions and non-source-backed copy are never rewritten',()=>{
 const original=Array.from({length:32},(_,i)=>team(i));
 const before=JSON.stringify(original);
 const historical=JSON.parse(before);reinforceForwardReporterVoice(historical,9,1,[]);
 assert.equal(JSON.stringify(historical),before);
 const incomplete=team(5);incomplete.starter_details=[];reinforceForwardReporterVoice([incomplete],11,0,[]);
 assert.equal(incomplete.inquirer_article.sections[0].paragraphs.length,1);
 const overview=recap();rotateForwardRecapOpening(overview,[],11,0,[]);
 assert.equal(overview.sections[0].blocks[0].paragraphs[0],'Original source-backed lede.');
});


test('compositional writing covers Week 1 in subsequent seasons without rewriting 2026 approved Weeks 1–9',()=>{
 const fresh=Array.from({length:32},(_,i)=>team(i));
 const original=JSON.stringify(fresh);
 reinforceForwardReporterVoice(fresh,1,0,[],2027);
 assert.notEqual(JSON.stringify(fresh),original,'2027 Week 1 must use the new newsroom voice');
 const overview=recap();
 rotateForwardRecapOpening(overview,fresh,1,0,[],2027);
 assert.notEqual(overview.sections[0].blocks[0].paragraphs[0],'Original source-backed lede.');
 const preserved=Array.from({length:32},(_,i)=>team(i));
 const before=JSON.stringify(preserved);
 reinforceForwardReporterVoice(preserved,5,0,[],2026);
 assert.equal(JSON.stringify(preserved),before);
});


test('recap grammar inflects verbs for plural and singular subjects across many compositions',()=>{
 const teams=Array.from({length:32},(_,i)=>team(i));
 for(let week=1;week<=18;week++)for(let salt=0;salt<16;salt++){
  const overview=recap();
  rotateForwardRecapOpening(overview,teams,week,salt,[],2027);
  const text=overview.sections[0].blocks[0].paragraphs[0];
  assert.doesNotMatch(text,/\b(?:finalized fantasy scores|scorekeeper’s notes|week’s finished numbers|final fantasy totals)\s+(?:records|sets|opens|leads|puts|documents|frames|features|prints|makes|presents|files|places)\b/i);
  assert.doesNotMatch(text,/\b(?:completed-week ledger|Sunday archive|league scoreboard|matchup record|scoring summary|full-league account|morning-after accounting|finished score sheet)\s+(?:record|set out|open with|lead with|put forward|document|frame|feature|print|make room|present|file|place on)\b/i);
 }
});
