import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectHotSeat,supplementCompletedHotSeat} from '../netlify/functions/lib/league-hot-seat.mjs';

const ui=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const backend=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
const base=[
 {roster_id:'1',manager_name:'Manager One',team_name:'Team 1',won:false,points:90,opponent_points:112},
 {roster_id:'2',manager_name:'Manager Two',team_name:'Team 2',won:false,points:73,opponent_points:165},
 {roster_id:'3',manager_name:'Manager Three',team_name:'Team 3',won:true,points:165,opponent_points:73}
];
test('Hot Seat refuses results-only data rather than fabricating a projection',()=>{
 assert.equal(selectHotSeat(base),null);
});
test('a verified projected favorite who loses earns Hot Seat',()=>{
 const teams=base.map(x=>({...x}));
 teams[0].projected=130;teams[0].opponent_projected=110;
 const hot=selectHotSeat(teams);
 assert.equal(hot.roster_id,'1');
 assert.equal(hot.hot_seat_basis,'projected-upset');
 assert.match(hot.hot_seat_detail,/Projected by 20.0 to win/);
});
test('zero or null projections never count as genuine pregame upset evidence',()=>{
 const hot=selectHotSeat(base.map(x=>({...x,projected:null,opponent_projected:null})));
 assert.equal(hot,null);
 assert.equal(selectHotSeat(base.map(x=>({...x,won:true}))),null);
});
test('read-only weekly award response fills one missing Hot Seat without rewriting cached records',()=>{
 const old={schema_version:1,records:[{season:2026,week:10,
  manager_awards:[{type:'cool-throne',roster_id:'3'}]}]};
 const completed={available:true,season:2026,week:10,teams:[
  {...base[0],projected:145,opponent_projected:112},...base.slice(1),...Array.from({length:29},(_,i)=>({
   roster_id:String(i+4),won:i%2===0,points:i%2===0?112:80,
   opponent_points:i%2===0?80:112
  }))
 ]};
 const next=supplementCompletedHotSeat(old,completed);
 assert.equal(next.records[0].manager_awards.length,2);
 assert.equal(next.records[0].manager_awards[0].type,'hot-seat');
 assert.equal(next.records[0].manager_awards[0].roster_id,'1');
 assert.equal(next.records[0].manager_awards[0].provisional,true);
 assert.equal(old.records[0].manager_awards.length,1,'original locked record must not be modified');
 assert.equal(supplementCompletedHotSeat(old,{...completed,week:9}),old);
 assert.equal(supplementCompletedHotSeat(next,completed).records[0].manager_awards.length,2);
});

test('League Hub backend and spotlight only award verified projected upsets',()=>{
 assert.match(backend,/hot=selectHotSeat\(teams\)/);
 assert.match(backend,/item\('hot-seat','🔥 Hot Seat',hot,hot\?\.hot_seat_detail/);
 assert.match(ui,/hot=losses\.filter\(g=>g\?\.projected!=null&&g\?\.opponent_projected!=null&&g\?\.projection_coverage===1/);
 assert.match(ui,/Number\(g\.projected\)>Number\(g\.opponent_projected\)&&Number\(g\.points\)<Number\(g\.opponent_points\)/);
 assert.doesNotMatch(ui,/largest-finalized-defeat|Largest completed-week defeat/);
});
test('missing weekly Hot Seat card is filled by the finalized feed, marked provisional',()=>{
 const a=ui.indexOf('function pendingHotSeatFromCompletedWeek(');
 const b=ui.indexOf('function managerWeeklyBadgesHTML(',a);
 assert(a>=0&&b>a);
 const fixture={season:2026,week:10,manager_awards:[{type:'cool-throne',title:'🧊 Cool Throne',roster_id:'3'}]};
 const fn=new Function('latestWeeklyAwardRecord','spotlightWeeklyCache','liveLeagueWeekCache','esc','teamName',ui.slice(a,b)+'return weeklyAwardCardsHTML')(
  d=>d.records[0],{available:true,season:2026,week:10,teams:[{...base[0],projected:145,opponent_projected:112},...base.slice(1)]},null,
  x=>String(x??''),x=>'Team '+x);
 const markup=fn({records:[fixture]});
 assert.match(markup,/Hot Seat/);
 assert.match(markup,/Projected to win by 33\.0/);
 assert.match(markup,/pending archival/);
});
test('a newly finalized week refreshes Hot Seat and awards even when Managers or Awards view is open',()=>{
 const start=ui.indexOf('async function refreshLiveLeagueWeekIfAdvanced()');
 const stop=ui.indexOf('async function weeklyAwards(',start);
 assert(start>=0&&stop>start);
 const refresh=ui.slice(start,stop);
 assert.match(refresh,/\['daily','managers','awards'\]\.includes\(currentView\)/);
 assert.match(refresh,/weeklyAwardsCache=null/);
 assert.match(refresh,/spotlightWeeklyCache=null/);
 assert.match(refresh,/await render\(currentView\)/);
 assert.doesNotMatch(refresh,/currentView!=='daily'/);
});

test('All-Time Highs shows all current standings until first timestamped record, never calls them recorded peaks',()=>{
 const a=ui.indexOf('function awardRecordsHTML('),b=ui.indexOf('function rankingsHTML(rows,key){',a);
 assert(a>=0&&b>a);
 const fn=new Function('awardHighHistory','awardRecordKey','esc','teamName','fmt',
  ui.slice(a,b)+'return awardRecordsHTML')([],x=>x,x=>String(x??''),x=>'Team '+x,x=>String(x));
 const standings=Array.from({length:32},(_,i)=>({roster_id:String(i+1),score:100+i,detail:'Current value '+i}));
 const markup=fn({key:'deal-maker',standings});
 assert.equal((markup.match(/data-lh-current-benchmark/g)||[]).length,32);
 assert.match(markup,/not timestamped All-Time Highs/);
 assert.doesNotMatch(markup,/Recorded \d/);
});
test('timestamped records replace the provisional list when the durable archive becomes readable',()=>{
 const a=ui.indexOf('function awardRecordsHTML('),b=ui.indexOf('function rankingsHTML(rows,key){',a);
 const fn=new Function('awardHighHistory','awardRecordKey','esc','teamName','fmt',
  ui.slice(a,b)+'return awardRecordsHTML')(
   [{award_key:'deal-maker',roster_id:'2',score:10,captured_at:'2026-11-22T13:00:00Z'}],
   x=>x,x=>String(x??''),x=>'Team '+x,x=>String(x));
 const markup=fn({key:'deal-maker',standings:base});
 assert.match(markup,/Recorded/);
 assert.doesNotMatch(markup,/data-lh-highs-pending/);
});
