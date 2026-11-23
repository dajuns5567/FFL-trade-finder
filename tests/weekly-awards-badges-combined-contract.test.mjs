import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isTrustedWeeklyAwardCache} from '../netlify/functions/league-hub.mjs';
import {playerWeeklyMilestoneAwards} from '../netlify/functions/lib/player-weekly-milestone-awards.mjs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const hub=read('netlify/functions/league-hub.mjs');
const history=read('netlify/functions/value-history.mjs');
const browser=read('value-history-v276.js');
const loader=read('netlify/functions/site-v29.mjs');
const scheduler=read('netlify/functions/weekly-awards-refresh.mjs');

const verifiedRecord={
 season:2026,week:11,award_source:'sleeper-finalized-matchups',verified_roster_count:32,
 players_of_week:{
  offense:{player_id:'OFF-WINNER',points:36.75},
  defense:{player_id:'IDP-WINNER',points:29.5}
 },
 manager_awards:[{type:'highest-scorer',roster_id:'1'},{type:'lowest-scorer',roster_id:'32'}]
};
const bridge=playerId=>playerWeeklyMilestoneAwards({
 playerId,season:2026,week:11,currentSeason:2026,currentCompletedWeek:11,
 verifiedCompletedWeek:11,canonical:verifiedRecord,payload:{},scoring:{},
 score:()=>{throw Error('canonical official winner must be authoritative')}
});

test('verified completed-week League Hub award produces the same offense and IDP milestone badges',()=>{
 assert.equal(isTrustedWeeklyAwardCache(verifiedRecord,2026,11),true);
 assert.deepEqual(bridge('OFF-WINNER').map(x=>({title:x.title,points:x.points,week:x.week})),
  [{title:'Top Offensive Scorer',points:36.75,week:11}]);
 assert.deepEqual(bridge('IDP-WINNER').map(x=>({title:x.title,points:x.points,week:x.week})),
  [{title:'Top Defensive Scorer',points:29.5,week:11}]);
 assert.deepEqual(bridge('LOSER'),[]);
});

test('backend validation and badge consumption reject missing scorer points rather than presenting zeros',()=>{
 const broken={...verifiedRecord,players_of_week:{
  offense:{player_id:'OFF-WINNER',points:null},
  defense:{player_id:'IDP-WINNER',points:29.5}}};
 assert.equal(isTrustedWeeklyAwardCache(broken,2026,11),false);
 assert.deepEqual(playerWeeklyMilestoneAwards({
  playerId:'OFF-WINNER',season:2026,week:11,currentSeason:2026,
  currentCompletedWeek:11,verifiedCompletedWeek:0,canonical:broken,
  payload:{},scoring:{},score:()=>0
 }),[]);
});

test('combined runtime contains one preserved League Hub revision and a fresh Value History revision',()=>{
 assert.match(loader,/league-hub-v451\.js\?v=557/);
 assert.match(loader,/value-history-v276\.js\?v=549/);
 assert.match(browser,/setInterval\(refreshVisiblePlayerWeeklyBadges,PLAYER_WEEKLY_BADGE_REFRESH_MS\)/);
 assert.match(history,/verifiedCompletedAwardWeek\(origin,currentSeason\)/);
 assert.match(history,/\.netlify\/functions\/league-hub\?weekly_awards=1/);
 assert.match(hub,/if\(u\.searchParams\.get\('weekly_awards'\)==='1'\)/);
 assert.match(hub,/weeklyAwards\(\{persist:false\}\)/);
});

test('weekly storage remains non-destructive and scheduled capture is production-only',()=>{
 assert.match(hub,/const verifiedByWeek=new Map\(next\.map\(/);
 assert.match(hub,/records:persisted/);
 assert.match(hub,/Scheduled weekly badge readback disagrees with verified awards/);
 assert.match(scheduler,/schedule:'15 \*\/2 \* \* \*'/);
 assert.match(scheduler,/context!=='production'/);
 assert.match(scheduler,/weeklyAwards\(\{persist:true,strictPersist:true\}\)/);
});

test('the combined branch retains the existing Award and Milestone surface test contracts',()=>{
 for(const file of [
  'tests/league-awards-independent-week-sync.test.mjs',
  'tests/weekly-awards-scheduled-capture.test.mjs',
  'tests/player-weekly-milestone-awards.test.mjs',
  'tests/player-weekly-badge-completion-readback.test.mjs'
 ])assert.ok(read(file).length>300,file+' is missing');
});
