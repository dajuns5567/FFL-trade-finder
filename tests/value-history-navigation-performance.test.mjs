import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
function between(start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a);
 assert.ok(a>=0&&b>a,'Current runtime must expose '+start);
 return source.slice(a,b);
}
const fetchSource=between('// Short-lived navigation cache','async function scoringFetch(');
const loaderSource=between('async function loadPlayer(id){','function leagueTeamIds(){');
const badgeSource=between('function mergeCanonicalPlayerAwardMilestones(','function scoringMilestonesRows(');

function createFetcher(){
 let now=1_000_000,requests=[],waiters=new Map();
 const context={
   Map,Date:{now:()=>now},Promise,Error,String,encodeURIComponent,console,
   API:'/.netlify/functions/value-history',
   setTimeout:resolve=>resolve(),
   fetch:url=>{
     requests.push(url);
     return new Promise(resolve=>{
       const key=new URL(url,'https://example.netlify.app').searchParams.get('player_id');
       const q=waiters.get(key)||[];
       q.push(data=>resolve({ok:true,json:async()=>data}));
       waiters.set(key,q);
     });
   }
 };
 vm.createContext(context);
 const api=vm.runInContext(fetchSource+';({historyFetch,invalidatePlayerHistoryNavCache,playerHistoryNavCache,playerHistoryPending})',context);
 return {context,api,requests,waiters,resolve:(id,data)=>{
   const q=waiters.get(String(id))||[];
   assert.ok(q.length>0,'unresolved request for '+id);
   q.shift()(data);
 },setTime:n=>{now=n}};
}

test('revisiting a player within 15 seconds reuses only verified recent history',async()=>{
 const {api,requests,resolve,setTime}=createFetcher();
 const first=api.historyFetch('111');
 resolve('111',{points:[{value:123}]});
 assert.deepEqual((await first).points,[{value:123}]);
 setTime(1_005_000);
 const hit=await api.historyFetch('111');
 assert.equal(hit.points[0].value,123);
 assert.equal(requests.length,1,'repeated tab visit must not re-fetch immediately');
 setTime(1_015_001);
 const fresh=api.historyFetch('111');
 assert.equal(requests.length,2,'expired cache must request fresh history');
 resolve('111',{points:[{value:125}]});
 assert.equal((await fresh).points[0].value,125);
});
test('concurrent requests deduplicate, including when navigating through another player',async()=>{
 const {api,requests,resolve}=createFetcher();
 const a=api.historyFetch('111'),b=api.historyFetch('111'),c=api.historyFetch('222');
 assert.equal(requests.length,2,'one request per independent player');
 resolve('222',{points:[{value:222}]});
 resolve('111',{points:[{value:111}]});
 assert.equal((await a).points[0].value,111);
 assert.equal((await b).points[0].value,111);
 assert.equal((await c).points[0].value,222);
});
test('manual refresh invalidates cached and in-flight observations',async()=>{
 const {api,requests,resolve}=createFetcher();
 const stale=api.historyFetch('111');
 api.invalidatePlayerHistoryNavCache();
 const current=api.historyFetch('111');
 assert.equal(requests.length,2);
 resolve('111',{points:[{value:100}]});
 assert.equal((await stale).points[0].value,100);
 resolve('111',{points:[{value:200}]});
 assert.equal((await current).points[0].value,200);
 assert.equal(api.playerHistoryNavCache.get('111').data.points[0].value,200,
  'late stale response cannot overwrite current cache');
});
test('out-of-order player navigation paints only the selected player',async()=>{
 const {context,api,resolve}=createFetcher();
 let currentPlayerId='111',currentView='player',rendered=[],scored=[];
 const container={innerHTML:''};
 Object.assign(context,{
  document:{getElementById:id=>id==='vhContent'?container:null},
  historyFetch:api.historyFetch,
  renderPlayerProfile:(id,pts)=>rendered.push({id,pts}),
  loadPlayerScoring:id=>{scored.push(id);return Promise.resolve()},
  playerScoringCache:new Map(),
 });
 Object.defineProperty(context,'currentPlayerId',{get:()=>currentPlayerId});
 Object.defineProperty(context,'currentView',{get:()=>currentView});
 const load=vm.runInContext(loaderSource+';loadPlayer',context);
 const older=load('111');
 currentPlayerId='222';
 const newer=load('222');
 resolve('222',{points:[{value:22}]});
 await newer;
 resolve('111',{points:[{value:11}]});
 await older;
 assert.deepEqual(rendered.map(x=>x.id),['222']);
 assert.deepEqual(scored,['222']);
 currentView='market';
 const navigatedAway=load('333');
 resolve('333',{points:[{value:33}]});
 await navigatedAway;
 assert.deepEqual(rendered.map(x=>x.id),['222'],'hidden player tab must not paint');
});
test('valuation and manual refresh explicitly invalidate navigation cache',()=>{
 assert.match(source,/function updateLiveConsumersV102\(\)\{\s*invalidatePlayerHistoryNavCache\(\)/);
 assert.match(source,/updateBtn'\)\?\.addEventListener\('click',\(\)=>\{invalidatePlayerHistoryNavCache\(\)/);
 assert.match(source,/PLAYER_HISTORY_NAV_TTL_MS=15000/);
 assert.match(source,/playerHistoryNavCache\.size>24/);
});
test('badge merge is player-agnostic, supports older/newer years and defensive awards',()=>{
 const context={Number,String,Map,Array,Math};
 vm.createContext(context);
 const merge=vm.runInContext(badgeSource+';mergeCanonicalPlayerAwardMilestones',context);
 const awards=[
  {season:2024,week:5,award_source:'sleeper-finalized-matchups',verified_roster_count:32,
    players_of_week:{offense:{player_id:'222',points:33.2},defense:{player_id:'333',points:44.1}}},
  {season:2027,week:12,award_source:'sleeper-finalized-matchups',verified_roster_count:32,
    players_of_week:{offense:{player_id:'222',points:31.6},defense:{player_id:'333',points:46.4}}},
  {season:2027,week:18,award_source:'sleeper-finalized-matchups',verified_roster_count:32,
    players_of_week:{offense:{player_id:'222',points:42.5}}},
  {season:2027,week:19,award_source:'sleeper-finalized-matchups',verified_roster_count:32,
    players_of_week:{offense:{player_id:'222',points:999}}},
  {season:2027,week:13,award_source:'unverified',verified_roster_count:32,
    players_of_week:{offense:{player_id:'222',points:99}}}
 ];
 const offense=merge({weeklyAwards:[{season:2022,week:7,type:'offensive-player-of-week',points:20}]},awards,'222');
 const defense=merge({},awards,'333');
 assert.deepEqual(Array.from(offense.weeklyAwards,x=>x.season+'|'+x.week),['2027|18','2027|12','2024|5','2022|7']);
 assert.deepEqual(Array.from(defense.weeklyAwards,x=>x.season+'|'+x.week),['2027|12','2024|5']);
 assert.ok(offense.weeklyAwards.every(a=>a.type==='offensive-player-of-week'));
 assert.ok(defense.weeklyAwards.every(a=>a.type==='defensive-player-of-week'));
 assert.equal(merge({},awards,'444').weeklyAwards.length,0);
});
