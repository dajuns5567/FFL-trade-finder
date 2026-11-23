import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isTrustedWeeklyAwardCache} from '../netlify/functions/league-hub.mjs';
import {completedLeagueWeekView} from '../netlify/functions/lib/league-completed-week.mjs';

const winner={player_id:'QB-verified',points:42};
const defender={player_id:'EDGE-verified',points:29};
const manager=[{type:'highest-scorer',roster_id:'1'},{type:'lowest-scorer',roster_id:'32'}];
const rec=(source=true)=>({
 season:2026,week:11,players_of_week:{offense:winner,defense:defender},
 manager_awards:manager,
 ...(source?{award_source:'sleeper-finalized-matchups',verified_roster_count:32}:{})
});

test('verified Sleeper League Hub week awards are valid with no Inquirer publication',()=>{
 assert.equal(isTrustedWeeklyAwardCache(rec(),2026,11),true);
 const withoutSource=rec(false);
 assert.equal(isTrustedWeeklyAwardCache(withoutSource,2026,11),false);
 assert.equal(isTrustedWeeklyAwardCache({...rec(),verified_roster_count:31},2026,11),false);
 assert.equal(isTrustedWeeklyAwardCache({...rec(),players_of_week:{offense:winner}},2026,11),false);
 assert.equal(isTrustedWeeklyAwardCache({...rec(),players_of_week:{offense:{player_id:'QB-verified',points:null},defense:defender}},2026,11),false);
 assert.equal(isTrustedWeeklyAwardCache({...rec(),players_of_week:{offense:winner,defense:{player_id:'EDGE-verified',points:'not-scored'}}},2026,11),false);
 assert.equal(isTrustedWeeklyAwardCache({...rec(),manager_awards:[]},2026,11),false);
});

test('old verified newspaper badges remain trusted and cannot be silently erased',()=>{
 const approved={...rec(false),newsroom_editorial_revision:110,newsroom_engine:'v31-forward'};
 assert.equal(isTrustedWeeklyAwardCache(approved,2026,11),true);
 assert.equal(isTrustedWeeklyAwardCache({...approved,newsroom_editorial_revision:14},2026,11),false);
});

test('the award backend uses completed Sleeeper weeks independently of newspaper index',()=>{
 const src=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 const begin=src.indexOf('export async function weeklyAwards(');
 const end=src.indexOf('// League Hub week visibility',begin);
 const implementation=src.slice(begin,end);
 assert.match(implementation,/latestCompletedLeagueWeek\(\)/);
 assert.match(implementation,/completedPublicationWeek\(Number\(p\.week\)\)/);
 assert.match(implementation,/completedLeagueWeekView/);
 assert.match(implementation,/independent:true/);
 assert.match(implementation,/award_source:'sleeper-finalized-matchups'/);
 assert.match(implementation,/if\(persist&&/);
 assert.match(implementation,/let s=null/);
 assert.match(implementation,/league-awards-newspaper-catalog-unavailable/);
 assert.match(implementation,/league-awards-cache-write-unavailable/);
 assert.match(implementation,/for\(const rec of records\)\s+if\(isTrustedWeeklyAwardCache\(rec,rec\.season,rec\.week\)\)/);
 assert.doesNotMatch(implementation,/rec\?\.award_source==='sleeper-finalized-matchups'&&\s+isTrustedWeeklyAwardCache/);

 const preview=src.slice(src.indexOf("if(isReadOnlyEditorialPreview("));
 assert.match(preview,/weeklyAwards\(\{persist:false\}\)/);
});

test('the visible Fleeced Daily dashboard invalidates old badges when a completed week advances',()=>{
 const browser=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
 const begin=browser.indexOf('async function refreshLiveLeagueWeekIfAdvanced()');
 const end=browser.indexOf('async function weeklyAwards(',begin);
 assert.ok(end>begin,'completed-week refresh boundary must remain explicit');
 const refresh=browser.slice(begin,end);
 assert.match(refresh,/clearManagerHistoryCache\(\)/,'completed week invalidates manager cache and in-flight generation');
 assert.match(browser,/function clearManagerHistoryCache\(/,'manager invalidator must exist');
 assert.match(refresh,/weeklyAwardsCache=null/);
 assert.match(refresh,/await render\(currentView\)/,'refresh correct active awards, daily or manager view');
 const loader=readFileSync(new URL('../netlify/functions/site-v29.mjs',import.meta.url),'utf8');
 assert.match(loader,/league-hub-v451\.js\?v=556/);
});

test('a missing or incomplete week cannot become independently eligible',()=>{
 const rosters=Array.from({length:32},(_,i)=>({roster_id:i+1,owner_id:'u'+i}));
 const users=rosters.map((x,i)=>({user_id:x.owner_id,display_name:'Manager '+i}));
 const games=rosters.map((x,i)=>({roster_id:x.roster_id,matchup_id:Math.floor(i/2)+1,points:90+i,players_points:{A:5}}));
 assert.equal(completedLeagueWeekView({season:2026,week:11,matchups:games,rosters,users})?.teams?.length,32);
 games[0].players_points={};
 assert.equal(completedLeagueWeekView({season:2026,week:11,matchups:games,rosters,users}),null);
});
