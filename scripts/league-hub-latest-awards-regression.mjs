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
assert(source.includes('discoverLatestWeek().then(x=>'),'Daily view must discover latest published week');
assert(source.includes('if(x?.available&&Array.isArray(x.teams)&&x.teams.length)acceptEdition(x)'),'Latest edition must become selected');
console.log('Players of the Week fallback, verified awards precedence, and latest-edition wiring passed');
