import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
const snippet=(start,end)=>{
 const a=source.indexOf(start),b=source.indexOf(end,a);
 assert.ok(a>=0&&b>a,'Current browser implementation anchors must exist: '+start);
 return source.slice(a,b);
};
const scoring=snippet('async function scoringFetch(id,','function signalTone(');
const milestones=snippet('function mergeCanonicalPlayerAwardMilestones(','const PLAYER_WEEKLY_BADGE_REFRESH_MS=');

test('canonical partial 2026 award cache cannot suppress full historical scorer readback',async()=>{
 const existing={weeklyAwards:[{season:2026,week:10,type:'offensive-player-of-week'},
                                   {season:2026,week:6,type:'offensive-player-of-week'}]};
 const hit=[];
 const context={
  playerScoringCache:new Map([['4034',existing]]),
  playerScoringCacheAt:new Map([['4034',1000]]),
  playerScoringCompleteAt:new Map(),
  playerScoringPending:new Map(),
  Date:{now:()=>1001},String,Promise,Map,Error,encodeURIComponent,
  API:'/.netlify/functions/value-history',
  fetch:async url=>{hit.push(url);return{ok:true,json:async()=>({
    player_id:'4034',scoring_milestones:{weeklyAwards:[
      {season:2025,week:7,type:'offensive-player-of-week'},
      {season:2023,week:15,type:'offensive-player-of-week'},
      {season:2023,week:4,type:'offensive-player-of-week'}
    ]}})}},
  setTimeout:()=>0
 };
 vm.createContext(context);
 const load=vm.runInContext(scoring+';scoringFetch',context);
 assert.equal((await load('4034')).scoring_milestones.weeklyAwards.length,2);
 assert.equal(hit.length,0,'ordinary cached caller remains unchanged');
 const forced=await load('4034',{requireCompleteReadback:true});
 assert.equal(forced.scoring_milestones.weeklyAwards.length,3);
 assert.equal(hit.length,1,'badge loader must bypass partial cache');
});

test('actual player loader merges 3 historical wins with verified 2026 Week 6/10 awards',async()=>{
 const partial={weeklyAwards:[{season:2026,week:10,type:'offensive-player-of-week',title:'Top Offensive Scorer',points:46.3},
    {season:2026,week:6,type:'offensive-player-of-week',title:'Top Offensive Scorer',points:30.7}]};
 let requestedComplete=false,paintCount=0;
 const records=[6,10].map(w=>({season:2026,week:w,award_source:'sleeper-finalized-matchups',
   verified_roster_count:32,players_of_week:{offense:{player_id:'4034',points:w===10?46.3:30.7}}}));
 const ctx={
  playerScoringCache:new Map([['4034',partial]]),
  playerScoringCacheAt:new Map(),playerScoringCompleteAt:new Map(),currentPlayerId:'4034',currentView:'player',
  canonicalPlayerAwardRecords:async()=>records,
  scoringFetch:async (_id,opts)=>{requestedComplete=opts?.requireCompleteReadback===true;
    return{scoring_milestones:{weeklyAwards:[
      {season:2025,week:7,type:'offensive-player-of-week',title:'Top Offensive Scorer',points:39.1},
      {season:2023,week:15,type:'offensive-player-of-week',title:'Top Offensive Scorer',points:41.7},
      {season:2023,week:4,type:'offensive-player-of-week',title:'Top Offensive Scorer',points:48.7}
    ]}};},
  document:{getElementById:()=>({set innerHTML(v){paintCount++}})},
  scoringMilestonesRows:()=>'<div/>',
  console,Date,Map,Number,String,Array,Promise,Set,Math,
  esc:x=>String(x),dateShort:x=>String(x)
 };
 vm.createContext(ctx);
 const load=vm.runInContext(milestones+';loadPlayerScoring',ctx);
 await load('4034');
 const got=ctx.playerScoringCache.get('4034').weeklyAwards;
 assert.equal(requestedComplete,true);
 assert.equal(got.length,5);
 assert.deepEqual(Array.from(got,a=>a.season+'|'+a.week),[
  '2026|10','2026|6','2025|7','2023|15','2023|4'
 ]);
 assert.ok(paintCount>=2);
});

test('date metadata is omitted when unavailable, never fabricated',()=>{
 assert.doesNotMatch(source,/:'date unavailable'/);
 assert.match(source,/a\.week_started_at\?' • '/);
});
