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
 assert.equal(FORWARD_EDITORIAL_REVISION,108);
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
 assert.match(hub,/host\.innerHTML=dailyHTML\(all,stats,w,md,spotlightW\|\|w\)/);
 assert.match(loader,/league-hub-v451\.js\?v=542/);
 assert.match(hub,/inquirerPreviewMode/,'private manuscript preview entry remains available through normal controls');
});

import {assessMinorNineWordReuse} from '../netlify/functions/lib/inquirer-minor-repetition.mjs';

const repeatedFixture=(groups)=>{
 const teams=Array.from({length:32},(_,i)=>({roster_id:i+1,inquirer_article:{
  sections:[{paragraphs:[...groups.filter(group=>group.members.includes(i+1)).map(group=>group.sentence)]}]}}));
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
test('a fifth affected article or two repeated sentences cannot use the minor tolerance',()=>{
 const five=repeatedFixture([{sentence:one,members:[1,2,3,4,5]}]);
 assert.equal(assessMinorNineWordReuse(five.teams,five.repeated).tolerated,false);
 const two=repeatedFixture([{sentence:one,members:[1,2,3,4]},
  {sentence:'A completely separate repeated decision emerged as the manager evaluated a different lineup and roster situation.',members:[5,6,7,8]}]);
 assert.equal(assessMinorNineWordReuse(two.teams,two.repeated).tolerated,false);
});
test('extended duplicate prose remains a fatal repeated passage',()=>{
 const long='A detailed repeated editorial passage that describes the same manager and the same lineup evaluation without distinctive player reporting and therefore repeats its conclusion instead of examining a real result or any useful tactical decision.';
 const fixture=repeatedFixture([{sentence:long,members:[1,2,3,4]}]);
 assert.equal(assessMinorNineWordReuse(fixture.teams,fixture.repeated).tolerated,false);
});
test('the production-quality gate records tolerance but retains all other failures',()=>{
 assert.match(source,/assessMinorNineWordReuse\(teams,longRecycled\)/);
 assert.match(source,/minor_repetition_warning:minorRepetition\.tolerated/);
 assert.match(source,/if\(longRecycled\.length&&!minorRepetition\.tolerated\)/);
});
