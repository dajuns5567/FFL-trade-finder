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
  mk(5,'Echo',6,130,100,125,1,112,50),mk(6,'Foxtrot',5,100,130,119,2,108,-50),
  mk(7,'Golf',8,118,116,114,9,110,75),mk(8,'Hotel',7,116,118,113,10,109,-65),
  mk(9,'India',10,142,121,128,7,117,180),mk(10,'Juliet',9,121,142,127,8,116,-140),
  mk(11,'Kilo',12,104,101,99,7,106,90),mk(12,'Lima',11,101,104,103,8,105,-80)
];
const overview={sections:[0,1,2,3].map(i=>({reporter:{id:'r'+i,name:'Reporter '+i},heading:'old',paragraphs:['old']})),hot_takes:[]};
const recap=expandWeeklyRecapV25(overview,teams,1);
assert.equal(recap.inquirer_version,26);
assert.equal(recap.editorial_revision,6);
assert.equal(recap.sections.length,4);
const body=recap.sections.flatMap(s=>s.paragraphs).join(' ');
assert.match(body,/Alpha/);
assert.ok(new Set(teams.filter(t=>body.includes(t.team_name)).map(t=>t.team_name)).size<teams.length,'Editorial recap should select stories, not mention every team by contract');

const hubSource=fs.readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
assert.ok(hubSource.includes('linkedNotebookText(value,teams,seenRecords,seenLinks)'),'League Hub must track first team mentions and one link per section while rendering Inquirer copy');
assert.ok(hubSource.includes('team?.league_context?.record'),'First-mention records must come from the archived edition’s league context');
assert.ok(hubSource.includes("label=match[0]+(first&&rec?' ('+rec+')':'')"),'First visible team mention must render its current season record');
assert.ok(hubSource.includes('seenRecords=new Set()'),'Each rendered Inquirer article/recap must reset first-mention record tracking');
const storedStart=hubSource.indexOf('function storedInquirerArticle(t,teams){'),storedEnd=hubSource.indexOf('function reporterArchiveHTML',storedStart),storedBlock=hubSource.slice(storedStart,storedEnd);
assert.ok(storedStart>=0&&storedEnd>storedStart,'League Hub must retain stored Inquirer article renderer');
assert.ok(storedBlock.indexOf('headline=renderScope(new Set())(a.headline||t.team_name)')>=0,'Stored Inquirer renderer must pre-render the visible headline in its own link scope');
assert.ok(storedBlock.indexOf('headline=renderScope(new Set())(a.headline||t.team_name)')<storedBlock.indexOf('const body='),'Headline must consume first-mention record tracking before visually later article body text');
assert.ok(storedBlock.includes('map(s=>{const render=renderScope(new Set())'),'Every stored team-article section must reset its team-link scope');
assert.ok(hubSource.includes('if(seenLinks&&seenLinks.has(id))')&&hubSource.includes('if(seenLinks)seenLinks.add(id)'),'Each team name may be underline-linked only once per Inquirer section');
assert.ok(hubSource.includes('data-lh-inquirer-team')&&hubSource.includes('data-lh-inquirer-value')&&hubSource.includes('data-lh-inquirer-report'),'Inquirer team links must open the Value History / Weekly Team Report chooser');

const source=fs.readFileSync(new URL('../netlify/functions/inquirer-reporting-v25.mjs',import.meta.url),'utf8');
for(const phrase of ['statistical lecture','arithmetic lesson','second source of points','absorb a quieter return','where sacks and forced fumbles can turn'])assert.ok(!source.includes(phrase),'Rejected arithmetic/explainer phrase survived: '+phrase);
assert.ok(source.includes('chosen.length>=5'),'Weekly Recap must cap editorial selection at five developed matchups');
assert.ok(source.includes('topGame'),'Weekly Recap must explicitly reserve a story for the league high scorer');
assert.ok(source.includes('weeklyStoryBlock'),'Weekly Recap matchup coverage must expose labeled story blocks');
assert.ok(source.includes('implicationStory'),'Weekly Recap must attach divisional/playoff/future implications to selected games');
assert.ok(source.includes('acquisitionCallback'),'Team columns must preserve ongoing trade-acquisition commentary');
assert.ok(source.includes('threeHighScorersV33'),'Team articles must gate broad multi-scorer analysis to a genuine three-headliner week');
assert.ok(source.includes("trio.every(p=>Number(p?.points)>=18)"),'Three-headliner gate must require all three highlighted scorers to clear 18 points');
assert.ok(source.includes('playerStatInsightV33'),'Team player sections must attach reporter judgment to statistics');
assert.ok(source.includes('playerUsageReadV34'),'Revision 6 may inspect football usage internally but must turn it into matchup commentary rather than restating the stat line');
assert.ok(source.includes('matchupMoodV35'),'Revision 6 must derive underdog/favorite, margin, opponent and score context for reporter commentary');
assert.ok(source.includes('teamDeepReadV34'),'Every team article must add two deeper matchup/aftershock paragraphs');
for(const phrase of ['job underneath it was','something concrete to test','did not beat ${opp} so much as remove the suspense'])assert.ok(!source.includes(phrase),'Rejected repetitive/meta phrase survived active reporting source: '+phrase);
assert.ok(source.includes('losingRecordAsideV33'),'Bad-record teams must receive reporter-specific pessimistic commentary');
assert.ok(source.includes('tradeHistoryCompleteV33'),'Trade Receipt must verify complete historical/current trade evidence before publishing');
assert.ok(source.includes('if(!tr)continue'),'Missing trade history must be silently omitted rather than explained in an article');
assert.ok(source.includes('if(!tradeHistoryCompleteV33(tr,facts))continue'),'Incomplete trade history must be silently omitted rather than explained in an article');
assert.ok(source.includes('normalizeTillyCaseV33'),'Tilly output must pass through the no-shouting case normalizer');
for(const phrase of ['which is exactly what an IDP league should reward when the work is real','The historical value snapshot is not available in this article packet','ordinary quarterback workload','entered as the projected underdog and won anyway','high-scorer line','multiple-contributor point is earned','provisional breakout label','breakout-watch invitation'])assert.ok(!source.includes(phrase),'Rejected explainer/meta phrase survived revision 6 source: '+phrase);
const leagueHub=fs.readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
assert.ok(leagueHub.includes('snapshot_through_week:Number(week||0)'),'League Hub historical context must declare the exact report-week cutoff');
assert.ok(leagueHub.includes('if(Number.isFinite(sourceWeek)&&sourceWeek>snapshotWeek)continue'),'League Hub standings must ignore matchup weeks beyond the article snapshot');
assert.ok(leagueHub.includes('next_opponent_division_context:divisionContextFor')&&leagueHub.includes('division_context:divisionContextFor(rid)'),'League Hub must attach report-week division context to next and upcoming opponents');
assert.ok(leagueHub.includes('division_context:divisionContextFor(t.roster_id)'),'League Hub must attach report-week division context to the article team itself');
assert.ok(leagueHub.includes("if(published?.available&&Array.isArray(published?.teams)&&published.teams.length)return published"),'Published Inquirer weeks must return their stored edition unchanged instead of regenerating from later data');
assert.ok(leagueHub.includes("games.filter(g=>g.result==='W').length"),'League Hub records must be reconstructed from archived matchups rather than current Sleeper roster totals');
assert.ok(leagueHub.includes("import week2Preload2026 from './inquirer-week2-2026-preload.mjs'"),'League Hub must load the locked Week 2 preload');
assert.ok(leagueHub.includes("['2026|1',week1Preload2026],['2026|2',week2Preload2026]"),'League Hub preload registry must preserve Week 1 and publish Week 2 together');
assert.ok(leagueHub.includes('for(const p of PRELOADED_BROADCASTS.values())'),'Reporter and broadcast archives must iterate every bundled Inquirer week instead of hard-coding Week 1');
const week1Generator=fs.readFileSync(new URL('./one-time-generate-inquirer-week1.mjs',import.meta.url),'utf8');
assert.ok(!week1Generator.includes('projections(season,2'),'Week 1 archive generator must not refetch Week 2 projections after the historical cutoff');
assert.ok(week1Generator.includes('next_projected:null,next_projection_coverage:0'),'Week 1 archive generator must explicitly omit later-week projection outlooks');
assert.ok(week1Generator.includes('next_week_availability:null'),'Week 1 archive generator must omit live injury/availability state that can change after the report cutoff');
assert.ok(week1Generator.includes('published_locked:true'),'Bundled Week 1 must be explicitly marked immutable once reported');
assert.ok(week1Generator.includes('next_opponent_division_context:divisionContextFor')&&week1Generator.includes('snapshot_through_week:1'),'Week 1 generator must freeze next-opponent division context to the Week 1 snapshot');
assert.ok(week1Generator.includes('division_context:divisionContextFor(t.roster_id)'),'Week 1 generator must freeze the article team division race to the Week 1 snapshot');
const week2Generator=fs.readFileSync(new URL('./one-time-generate-inquirer-week2.mjs',import.meta.url),'utf8');
assert.ok(week2Generator.includes('const season=2026, week=2'),'Week 2 generator must target the completed Week 2 edition');
assert.ok(week2Generator.includes('published_locked:true')&&week2Generator.includes('context_snapshot_through_week:2'),'Bundled Week 2 must be immutable and frozen through Week 2');
assert.ok(week2Generator.includes("if(matchups.length!==32)")&&week2Generator.includes('Week 2 player scoring is incomplete in Sleeper'),'Week 2 generator must refuse incomplete matchup/scoring data');
assert.ok(week2Generator.includes('previousByRoster')&&week2Generator.includes('week1Preload2026'),'Week 2 generator must preserve Week 1 editorial continuity without rewriting Week 1');
assert.ok(source.includes('nextOpponentLeagueContextV37')&&source.includes('division_rank')&&source.includes('same_record_teams'),'Next-week reporting must discuss opponent form and current division-race position');
assert.ok(source.includes('t.division_context||{}')&&source.includes('selfLeading=leaders.some')&&source.includes('tied for the ${division} lead'),'Next-week division roundup must call out when the article team shares its division lead');
assert.ok(source.includes("strength(next)==='strong'&&laterSoft.length")&&source.includes('highest-leverage game in the short schedule window'),'Heavyweight-before-soft-games outlook must carry expanded schedule commentary');
console.log(JSON.stringify({ok:true,version:26,breakout:true,editorial_selection:true,expanded_matchups:true,acquisition_memory:true}));
