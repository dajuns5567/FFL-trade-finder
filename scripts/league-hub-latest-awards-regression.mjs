import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
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
console.log('Players of the Week fallback, verified awards precedence, and latest-edition wiring passed');
