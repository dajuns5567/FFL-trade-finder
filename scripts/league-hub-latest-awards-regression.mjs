import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import week4Loader from '../netlify/functions/inquirer-week4-2026-preload.mjs';
import {rebuildWeek4Editorial} from '../netlify/functions/inquirer-week4-editorial-rebuild.mjs';
const source=fs.readFileSync('league-hub-v451.js','utf8');
function take(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0&&b>a,'Missing '+start);return source.slice(a,b)}
const functions=take('function publishedStarterLeaders(w){','function awardsHTML(rows){');
const context={esc:x=>String(x??''),playerName:x=>String(x),weeklyAwardsCache:null};
vm.createContext(context);
vm.runInContext('function latestWeeklyAwardRecord(data){const rows=Array.isArray(data?.records)?data.records:[];return rows.slice().sort((a,b)=>Number(b.season)-Number(a.season)||Number(b.week)-Number(a.week))[0]||null;}\n'+functions,context);
const w={season:2026,week:4,available:true,teams:[
 {starter_details:[{id:'o1',name:'Receiver One',position:'WR',points:30,team:'NO'},{id:'d1',name:'Linebacker One',position:'LB',points:27,team:'TB'}]},
 {starter_details:[{id:'o2',name:'Receiver Two',position:'WR',points:35,team:'BUF'},{id:'d2',name:'Linebacker Two',position:'LB',points:28,team:'SEA'}]}
]};
const missing={records:[{season:2026,week:3,players_of_week:{offense:{player_id:'old',player_name:'Old Player',points:90}}}]};
const html=context.playersOfWeekHTML(w,missing);
assert.match(html,/Players of the Week/);
assert.match(html,/Receiver Two/);
assert.match(html,/Linebacker Two/);
assert.doesNotMatch(html,/Old Player/);
const official={records:[{season:2026,week:4,players_of_week:{offense:{player_id:'officialO',player_name:'Official Offense',points:50},defense:{player_id:'officialD',player_name:'Official Defense',points:42}}}]};
const officialHtml=context.playersOfWeekHTML(w,official);
assert.match(officialHtml,/Official Offense/);
assert.match(officialHtml,/Official Defense/);
assert.doesNotMatch(officialHtml,/Receiver Two/);
assert.match(context.playersOfWeekHTML({season:2026,week:5,teams:[]},{records:[]}),/Players of the Week/);
assert(source.includes('current.outerHTML=playersOfWeekHTML(w,data)'),'Open article must refresh the Players of the Week section after verified awards arrive');
assert(source.includes('discoverLatestWeek().then(x=>'),'Daily view must discover latest published week');
assert(source.includes('if(x?.available&&Array.isArray(x.teams)&&x.teams.length)acceptEdition(x)'),'Latest edition must become selected');
const awardFns=take('const safeProjection=x=>','async function ensureCurrentWeekAwards(w){');
vm.runInContext(awardFns,context);
const fixture={available:true,season:2026,week:4,teams:[
 {roster_id:1,manager_name:'Projected Favorite',points:99,opponent_roster_id:2,opponent_points:101,won:false,projected:120,projection_coverage:9},
 {roster_id:2,manager_name:'Narrow Winner',points:101,opponent_roster_id:1,opponent_points:99,won:true,projected:105,projection_coverage:9},
 {roster_id:3,manager_name:'No Coverage',points:90,opponent_roster_id:4,opponent_points:130,won:false,projected:180,projection_coverage:0},
 {roster_id:4,manager_name:'Big Winner',points:130,opponent_roster_id:3,opponent_points:90,won:true,projected:null,projection_coverage:0}
]};
const awards=context.managerAwardsFromWeek(fixture);
assert.equal(awards.find(x=>x.type==='hot-seat')?.roster_id,'1','A verified favorite losing is Hot Seat before missing-coverage fallbacks');
assert.equal(awards.find(x=>x.type==='cool-throne')?.roster_id,'4','Cool Throne should use strongest actual win');
const noProjected=structuredClone(fixture);noProjected.teams[0].projection_coverage=0;
const fallbackAwards=context.managerAwardsFromWeek(noProjected);
assert.equal(fallbackAwards.find(x=>x.type==='hot-seat')?.roster_id,'3','Uncovered projections must not artificially determine Hot Seat');
const unverifiedMargin=structuredClone(noProjected);
unverifiedMargin.teams[3].projection_coverage=9;
unverifiedMargin.teams[3].projected=110;
const unverifiedHot=context.managerAwardsFromWeek(unverifiedMargin).find(x=>x.type==='hot-seat');
assert.equal(unverifiedHot?.roster_id,'3','Actual-loss Hot Seat fallback remains stable when its own projection is unverified');
assert.doesNotMatch(unverifiedHot.detail,/Projected/i,'Unverified team projection must never produce a fabricated projected upset label');

const actualWeek4=rebuildWeek4Editorial(week4Loader());
const actualAwards=context.managerAwardsFromWeek(actualWeek4);
const hotActual=actualAwards.find(x=>x.type==='hot-seat'),coolActual=actualAwards.find(x=>x.type==='cool-throne');
assert(hotActual&&coolActual,'Week 4 must produce both Hot Seat and Cool Throne');
const rosterById=new Map(actualWeek4.teams.map(t=>[String(t.roster_id),t]));
assert.equal(rosterById.get(hotActual.roster_id)?.won,false,'Week 4 Hot Seat must have lost');
assert.equal(rosterById.get(coolActual.roster_id)?.won,true,'Week 4 Cool Throne must have won');
const hotRoster=rosterById.get(hotActual.roster_id);
const hotOpponent=rosterById.get(String(hotRoster?.opponent_roster_id));
const verifiedProjection=Number(hotRoster?.projection_coverage)>0&&Number(hotOpponent?.projection_coverage)>0&&hotRoster?.projected!=null&&hotOpponent?.projected!=null;
if(!verifiedProjection)assert.doesNotMatch(hotActual.detail,/Projected/i,'Actual Week 4 Hot Seat must not invent projections');
console.log('WEEK4_MANAGER_SPOTLIGHT',JSON.stringify({hot:hotActual,cool:coolActual,projection_verified:verifiedProjection}));

// Exercise the actual Manager Spotlight renderer, not merely award calculations.
const spotlightSource=take('function spotlightBlock(md,w){','function graveyardScoringHTML(g){');
vm.runInContext(spotlightSource,context);
const spotlightHtml=context.spotlightBlock({career:[],current:[]},actualWeek4);
assert.doesNotMatch(spotlightHtml,/<small>Hot Seat<\/small><b>n\/a<\/b>/,'Completed Week 4 must display a Hot Seat manager');
assert.doesNotMatch(spotlightHtml,/<small>Cool Throne<\/small><b>n\/a<\/b>/,'Completed Week 4 must display a Cool Throne manager');
const missingFlags=structuredClone(fixture);for(const t of missingFlags.teams)delete t.won;
const restoredHtml=context.spotlightBlock({career:[],current:[]},missingFlags);
assert.match(restoredHtml,/Projected Favorite/,'Hot Seat must recover from completed matchup scores when won flags are missing');
assert.match(restoredHtml,/Big Winner/,'Cool Throne must recover from completed matchup scores when won flags are missing');
console.log('WEEK4_SPOTLIGHT_RENDER',JSON.stringify({hot:hotActual?.team_name,cool:coolActual?.team_name,wonFlagFallback:true}));

// Guard the real Sleeper projection ingestion shape: historical feeds may be
// keyed by player ID rather than returning player_id inside every record.
const backendSource=fs.readFileSync('netlify/functions/league-hub.mjs','utf8');
const pStart=backendSource.indexOf('const score=(stats,scoring)=>');
const pEnd=backendSource.indexOf('function txByRoster(rows)',pStart);
assert(pStart>=0&&pEnd>pStart,'Projection ingestion code must remain auditable');
const projectedContext={fetchJson:async()=>({
  'p-one':{stats:{rec:4,idp_sack:2}},
  'p-two':{stats:{rec:0}},
  'p-unknown':{stats:{}}
})};
vm.createContext(projectedContext);
vm.runInContext(backendSource.slice(pStart,pEnd),projectedContext);
const parsed=await projectedContext.projections(2026,4,{rec:1,idp_sack:3});
assert.equal(parsed['p-one'],10,'Keyed projections must be scored with the custom IDP settings');
assert.equal(parsed['p-two'],0,'Real zero-point projections must remain valid');
assert.equal(Object.hasOwn(parsed,'p-unknown'),false,'Absent stats must not become fabricated zero projections');
assert(backendSource.includes('projectedKnown===starters.length'),'A team forecast must require complete starter coverage');
assert(backendSource.includes('nextProjectedKnown===nextStarters.length'),'A next-week forecast must require complete starter coverage');
console.log('KEYED_PROJECTION_INGESTION_VERIFIED',JSON.stringify({scored:parsed['p-one'],trueZero:parsed['p-two'],missingStatsExcluded:true}));
console.log('Players of the Week fallback, verified awards precedence, and latest-edition wiring passed');
