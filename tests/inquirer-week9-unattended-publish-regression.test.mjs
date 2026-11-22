import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {inquirerScheduleDecision} from '../netlify/functions/lib/inquirer-schedule-decision.mjs';
import {FORWARD_EDITORIAL_REVISION} from '../netlify/functions/inquirer-editorial-v31.mjs';
const source=readFileSync(new URL('../netlify/functions/inquirer-editorial-v31.mjs',import.meta.url),'utf8');
const begin=source.indexOf('function w2BenchRead(');
const end=source.indexOf('function w2StatKind(',begin);
assert.ok(begin>=0&&end>begin);
const isolated=source.slice(begin,end);
const context={
  w2Hash:()=>11,
  w2SlotLabel:v=>String(v||'FLEX'),
  w2One:n=>Number(n).toFixed(1),
  w2DisplayTeam:v=>String(v)
};
const benchRead=runInNewContext(isolated+';w2BenchRead',context);
const nineGrams=text=>{
 const tokens=String(text).toLowerCase().match(/[a-z0-9]+/g)||[],out=new Set();
 for(let i=0;i+9<=tokens.length;i++){
  const nine=tokens.slice(i,i+9);
  if(nine.filter(t=>/^\d+$/.test(t)).length>=2)continue;
  out.add(nine.join(' '));
 }
 return out;
};
test('Week 9 held cross-team scaffold is eliminated at its generation source',()=>{
 assert.equal(FORWARD_EDITORIAL_REVISION,112);
 assert.doesNotMatch(source,/The bench advantage deserves a Week 6 review/);
 assert.doesNotMatch(source,/Those unused points will be much louder at the next lineup meeting/);
 assert.doesNotMatch(source,/A losing week is a rough time to discover the bench had a better answer/);
 assert.match(source,/const verdict=choice===11/);
});
test('32 independent manager bench reads cannot recycle a nine-word verdict across four teams',()=>{
 const rows=[];
 for(let i=1;i<=32;i++){
  const team={team_name:'Club '+i};
  const miss={reserve:{name:'Reserve'+i},starter:{name:'Starter'+i},slot:'FLEX'};
  const line=benchRead(team,{id:'reporter'},miss,6+i/10,i%2===0,11+i);
  assert.match(line,new RegExp('Reserve'+i));
  assert.match(line,new RegExp('Starter'+i));
  assert.match(line,new RegExp('Club '+i));
  assert.doesNotMatch(line,/Week 6 review/);
  rows.push(line);
 }
 const owners=new Map();
 for(let i=0;i<rows.length;i++)for(const phrase of nineGrams(rows[i])){
  if(!owners.has(phrase))owners.set(phrase,new Set());
  owners.get(phrase).add(i);
 }
 const recycled=[...owners].filter(([,rosters])=>rosters.size>=4);
 assert.deepEqual(recycled.map(([phrase])=>phrase),[],'same nine-word scaffold must not appear in four teams');
});
test('a new reviewed revision allows automatic retry without overriding quality or publishing gates',()=>{
 const held={state:'editorial-hold',season:2026,week:9,editorial_revision:107,available:false};
 const nfl={season:2026,week:10};
 assert.equal(inquirerScheduleDecision({status:held,nfl,revision:107}).queue,false);
 const renewed=inquirerScheduleDecision({status:held,nfl,revision:FORWARD_EDITORIAL_REVISION});
 assert.equal(renewed.queue,true);
 assert.equal(renewed.finishedWeek,9);
});

test('Fleeced Daily preview reader no longer shows the redundant archive warning',()=>{
 const hub=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
 const loader=readFileSync(new URL('../netlify/functions/site-v29.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(hub,/Deploy Preview: published archive view/);
 assert.doesNotMatch(hub,/This view shows only editions stored on this Netlify project/);
 assert.match(hub,/host\.innerHTML=dailyHTML\(all,stats,w,md,spotlightW\|\|w,leagueWeek\)/);
 assert.match(loader,/league-hub-v451\.js\?v=543/);
 assert.match(hub,/inquirerPreviewMode/,'private manuscript preview entry remains available through normal controls');
});

import {assessMinorNineWordReuse} from '../netlify/functions/lib/inquirer-minor-repetition.mjs';

const repeatedFixture=(groups)=>{
 const teams=Array.from({length:32},(_,i)=>({roster_id:i+1,inquirer_article:{
  sections:[{paragraphs:[...groups.filter(group=>group.members.includes(i+1)).map(group=>
   'Distinct opening evidence for this exact documented roster ' + (i+1) + '. ' +
   group.sentence + ' Club' + (i+1) +
   ' verifies its lineup with individual opponent weekly context.')]}]}}));
 const owners=new Map();
 for(const team of teams){
  const prose=team.inquirer_article.sections.flatMap(s=>s.paragraphs).join(' ');
  const words=prose.toLowerCase().match(/[a-z0-9]+/g)||[];
  const unique=new Set();
  for(let i=0;i+9<=words.length;i++)unique.add(words.slice(i,i+9).join(' '));
  for(const phrase of unique){const ids=owners.get(phrase)||new Set();ids.add(String(team.roster_id));owners.set(phrase,ids);}
 }
 return{teams,repeated:[...owners].filter(([,ids])=>ids.size>=4)};
};
const one='The roster review reached the same conclusion without turning that single line into an interchangeable article.';
test('one short identical line in four of 32 articles is a transparent nonfatal warning',()=>{
 const fixture=repeatedFixture([{sentence:one,members:[1,2,3,4]}]);
 const audit=assessMinorNineWordReuse(fixture.teams,fixture.repeated);
 assert.equal(audit.tolerated,true);
 assert.equal(audit.team_count,4);
 assert.ok(audit.phrase_windows>0);
});
test('a fifth affected article or two independent short repeated lines are nonfatal warnings',()=>{
 const five=repeatedFixture([{sentence:one,members:[1,2,3,4,5]}]);
 assert.equal(assessMinorNineWordReuse(five.teams,five.repeated).tolerated,true);
 const two=repeatedFixture([{sentence:one,members:[1,2,3,4]},
  {sentence:'A completely separate repeated decision emerged as the manager evaluated a different lineup and roster situation.',members:[5,6,7,8]}]);
 const result=assessMinorNineWordReuse(two.teams,two.repeated);
 assert.equal(result.tolerated,true);
 assert.equal(result.sentence_count,2);
});
test('three separated short repeated lines are warnings; six affected teams remain fatal',()=>{
 const six=repeatedFixture([{sentence:one,members:[1,2,3,4,5,6]}]);
 assert.equal(assessMinorNineWordReuse(six.teams,six.repeated).tolerated,false);
 const three=repeatedFixture([{sentence:one,members:[1,2,3,4]},
  {sentence:'A second isolated managerial observation explains what each team must do after the completed match.',members:[5,6,7,8]},
  {sentence:'A third isolated editorial observation explains the upcoming roster decisions with enough independent weekly detail.',members:[9,10,11,12]}]);
 const report=assessMinorNineWordReuse(three.teams,three.repeated);
 assert.equal(report.tolerated,true);
 assert.equal(report.sentence_count,3);
 assert.equal(report.severity,'editorial-warning');
 assert.equal(report.requires_improvement,true);
});
test('four repeated sentences, even separated, remain a blocking quality failure',()=>{
 const lines=[
 one,
 'A second isolated managerial observation explains what each team must do after the completed match.',
 'A third isolated editorial observation explains the upcoming roster decisions with enough independent weekly detail.',
 'A fourth isolated repeat describes exactly how the staff discussed the latest recorded outcome.'
 ];
 const fixture=repeatedFixture(lines.map(sentence=>({sentence,members:[1,2,3,4]})));
 assert.equal(assessMinorNineWordReuse(fixture.teams,fixture.repeated).tolerated,false);
});
test('two consecutively repeated sentences block publication despite distinct surrounding copy',()=>{
 const first=one;
 const second='A separate managerial conclusion was repeated in another nearby editorial sentence for this particular roster.';
 const fixture=repeatedFixture([{sentence:first,members:[1,2,3,4]},
  {sentence:second,members:[1,2,3,4]}]);
 // Make the exact two shared lines adjacent within each affected article;
 // substantial team-specific reporting still surrounds both lines.
 for(const team of fixture.teams.slice(0,4)){
  team.inquirer_article.sections[0].paragraphs=[
   'Verified independent weekly details identify this roster '+team.roster_id+' and its special circumstances. '+
   first+' '+second+
   ' Additional detailed analysis examines this same roster '+team.roster_id+' and its individual matchup. '+
   'A unique conclusion belongs to roster '+team.roster_id+' after the game.'
  ];
 }
 const owners=new Map();
 for(const team of fixture.teams){
  const words=team.inquirer_article.sections.flatMap(section=>section.paragraphs).join(' ')
   .toLowerCase().match(/[a-z0-9]+/g)||[];
  for(let i=0;i+9<=words.length;i++){
   const phrase=words.slice(i,i+9).join(' ');
   const ids=owners.get(phrase)||new Set();
   ids.add(String(team.roster_id));owners.set(phrase,ids);
  }
 }
 const actualRepeated=[...owners].filter(([,ids])=>ids.size>=4);
 const audit=assessMinorNineWordReuse(fixture.teams,actualRepeated);
 assert.equal(audit.tolerated,false);
 assert.equal(audit.reason,'consecutive-repeated-sentences');
});
test('the best publishable candidate must prefer clean prose instead of rewarding tolerated repetitions',()=>{
 const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 assert.match(hub,/if\(!q\.metrics\?\.minor_repetition_warning\)/);
 assert.match(hub,/if\(!accepted\)\{accepted=drafted;quality=q;variationSalt=salt\}/);
});
test('a duplicated whole paragraph is still fatal even with exactly four teams',()=>{
 const fixture=repeatedFixture([{sentence:one,members:[1,2,3,4]}]);
 for(const team of fixture.teams.slice(0,4))team.inquirer_article.sections[0].paragraphs=[one];
 assert.equal(assessMinorNineWordReuse(fixture.teams,fixture.repeated).tolerated,false);
});
test('extended duplicate prose remains a fatal repeated passage',()=>{
 const long='A detailed repeated editorial passage that describes the same manager and the same lineup evaluation without distinctive player reporting and therefore repeats its conclusion instead of examining a real result or any useful tactical decision.';
 const fixture=repeatedFixture([{sentence:long,members:[1,2,3,4]}]);
 assert.equal(assessMinorNineWordReuse(fixture.teams,fixture.repeated).tolerated,false);
});
test('the production-quality gate records tolerance but retains all other failures',()=>{
 assert.match(source,/assessMinorNineWordReuse\(teams,longRecycled\)/);
 assert.match(source,/minor_repetition_warning:minorRepetition\.tolerated/);
 assert.match(source,/const blockingIssues=minorPhraseSets\?issues\.filter/);
 assert.match(source,/if\(issue\.id==='cross-team-copy-scaffold'&&minorSentenceNorms\.has\(issue\.sentence\)\)/);
 assert.match(source,/if\(issue\.id==='cross-reporter-phrase-scaffold'/);
 assert.match(source,/if\(issue\.id==='cross-team-clause-scaffold'/);
 assert.match(source,/if\(issue\.id==='paired-editorial-clause-scaffold'/);
 assert.match(source,/if\(longRecycled\.length&&!minorRepetition\.tolerated\)/);
});
