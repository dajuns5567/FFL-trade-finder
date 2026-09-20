import assert from 'node:assert/strict';
import fs from 'node:fs';
import {breakoutWatch,expandWeeklyRecapV25} from '../netlify/functions/inquirer-reporting-v25.mjs';

const breakoutTeam={team_name:'Test Club',starter_details:[
  {id:'young',name:'Young Receiver',position:'WR',age:23,points:18,projected:11,real_stats:{rec_tgt:9},recent_form:{games:6,last3_avg:15,prior3_avg:8}},
  {id:'veteran',name:'Veteran Star',position:'WR',age:30,points:25,projected:20,real_stats:{rec_tgt:12},recent_form:{games:6,last3_avg:20,prior3_avg:10}}
]};
const breakout=breakoutWatch(breakoutTeam);
assert.match(breakout,/Young Receiver/);
assert.doesNotMatch(breakout,/Veteran Star/);
assert.equal(breakoutWatch({team_name:'Thin Sample',starter_details:[{id:'x',name:'No Baseline',position:'RB',age:22,points:20,real_stats:{rush_att:18},recent_form:{games:1,last3_avg:20,prior3_avg:null}}]}),null);

const mk=(id,name,opp,points,oppPoints,projected,next,nextProj,valueDelta)=>({
  roster_id:String(id),team_name:name,opponent_roster_id:String(opp),points,opponent_points:oppPoints,projected,
  next_opponent_roster_id:String(next),next_projected:nextProj,value_history_week:{delta:valueDelta},
  league_context:{record:{wins:1,losses:0}},
  starter_details:[{id:'p'+id,name:'Player '+id,position:'WR',points:points/4,projected:points/5,age:24,real_stats:{rec_tgt:8},recent_form:{games:6,last3_avg:15,prior3_avg:9}}],
  inquirer_article:{sections:[{kind:'management',paragraphs:['n/a']}]}
});
const teams=[
  mk(1,'Alpha',2,150,90,120,3,111,500),mk(2,'Bravo',1,90,150,130,4,109,-400),
  mk(3,'Charlie',4,111,109,105,1,115,250),mk(4,'Delta',3,109,111,106,2,114,-100),
  mk(5,'Echo',6,130,100,125,1,112,50),mk(6,'Foxtrot',5,100,130,119,2,108,-50)
];
const overview={sections:[0,1,2,3].map(i=>({reporter:{id:'r'+i,name:'Reporter '+i},heading:'old',paragraphs:['old']})),hot_takes:[]};
const recap=expandWeeklyRecapV25(overview,teams,1);
assert.equal(recap.inquirer_version,25);
assert.equal(recap.sections.length,4);
const body=recap.sections.flatMap(s=>s.paragraphs).join(' ');
assert.match(body,/Alpha/);
assert.ok(new Set(teams.filter(t=>body.includes(t.team_name)).map(t=>t.team_name)).size<teams.length,'Editorial recap should select stories, not mention every team by contract');

const source=fs.readFileSync(new URL('../netlify/functions/inquirer-reporting-v25.mjs',import.meta.url),'utf8');
for(const phrase of ['second source of points','absorb a quieter return','where sacks and forced fumbles can turn'])assert.ok(!source.includes(phrase),'Rejected arithmetic/explainer phrase survived: '+phrase);
console.log(JSON.stringify({ok:true,version:25,breakout:true,editorial_selection:true}));
