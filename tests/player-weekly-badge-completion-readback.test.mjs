import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const backend=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
const ui=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
const gateStart=backend.indexOf('let verifiedAwardWeekCache=null');
const gateEnd=backend.indexOf('async function scoringMilestones(',gateStart);
assert.ok(gateStart>=0&&gateEnd>gateStart,'Read the real independent week-verification code');
const gateCode=backend.slice(gateStart,gateEnd);
const badgeStart=ui.indexOf('const PLAYER_WEEKLY_BADGE_REFRESH_MS=60000;');
const badgeEnd=ui.indexOf('async function loadPlayer(id){',badgeStart);
assert.ok(badgeStart>=0&&badgeEnd>badgeStart,'Read the actual visible-profile polling code');
const badgeCode=ui.slice(badgeStart,badgeEnd);

function completedWeekFixture(){
 let requests=0,week=10,season=2026,available=true,now=1000000;
 let teams=Array.from({length:32},(_,i)=>({roster_id:i+1,points:80+i,opponent_points:95+i}));
 const ctx={fetch:async url=>{
  assert.match(url,/league-hub\?league_latest=1/);
  requests++;
  return{ok:true,json:async()=>({available,season,week,teams})};
 },console,Date:{now:()=>now}};
 vm.createContext(ctx);
 const read=vm.runInContext(gateCode+';verifiedCompletedAwardWeek',ctx);
 return{read,requests:()=>requests,
  teams:x=>{teams=x},season:x=>{season=x},available:x=>{available=x},
  week:x=>{week=x},clock:x=>{now=x}};
}

test('weekly badges require fully scored 32-unique-roster independent completed league week',async()=>{
 const fresh=completedWeekFixture();
 assert.equal(await fresh.read('https://example.netlify.app',2026),10);
 assert.equal(fresh.requests(),1);
 assert.equal(await fresh.read('https://example.netlify.app',2026),10);
 assert.equal(fresh.requests(),1,'positive verifier result cached for 30s');
 for(const broken of [
  Array.from({length:31},(_,i)=>({roster_id:i+1,points:100,opponent_points:90})),
  Array.from({length:32},(_,i)=>({roster_id:i===31?1:i+1,points:100,opponent_points:90})),
  Array.from({length:32},(_,i)=>({roster_id:i+1,points:i===4?null:100,opponent_points:90}))
 ]){
  const f=completedWeekFixture();f.teams(broken);
  assert.equal(await f.read('https://example.netlify.app',2026),0);
 }
 const wrong=completedWeekFixture();wrong.season(2025);
 assert.equal(await wrong.read('https://example.netlify.app',2026),0);
 const unavailable=completedWeekFixture();unavailable.available(false);
 assert.equal(await unavailable.read('https://example.netlify.app',2026),0);
});

test('newly completed week is picked up without rebuilding the site',async()=>{
 const f=completedWeekFixture();
 assert.equal(await f.read('https://example.netlify.app',2026),10);
 f.week(11);f.clock(1031000);
 assert.equal(await f.read('https://example.netlify.app',2026),11);
 assert.equal(f.requests(),2);
});

test('visible Player Value History refreshes every minute on focus or week rollover, without writing stale tabs',async()=>{
 let now=100000,fetches=0,current='p123';
 const cacheAt=new Map(),ctx={
  Date:{now:()=>now},console,
  document:{hidden:false,getElementById:id=>id==='valueHistory'?{hidden:false}:null,addEventListener(){}},
  window:{addEventListener(){}},
  setInterval(){},
  currentView:'player',currentPlayerId:current,
  playerScoringCacheAt:cacheAt,
  loadPlayerScoring:async id=>{fetches++;cacheAt.set(String(id),now)}
 };
 vm.createContext(ctx);vm.runInContext(badgeCode,ctx);
 vm.runInContext('refreshVisiblePlayerWeeklyBadges()',ctx);
 assert.equal(fetches,1);
 vm.runInContext('refreshVisiblePlayerWeeklyBadges()',ctx);
 assert.equal(fetches,1);
 now+=60001;vm.runInContext('refreshVisiblePlayerWeeklyBadges()',ctx);
 assert.equal(fetches,2);
 ctx.document.hidden=true;now+=60001;
 vm.runInContext('refreshVisiblePlayerWeeklyBadges()',ctx);assert.equal(fetches,2);
 ctx.document.hidden=false;ctx.currentView='market';
 vm.runInContext('refreshVisiblePlayerWeeklyBadges()',ctx);assert.equal(fetches,2);
 ctx.currentView='player';ctx.currentPlayerId='p456';
 vm.runInContext('refreshVisiblePlayerWeeklyBadges()',ctx);assert.equal(fetches,3);
 assert.match(ui,/installPlayerWeeklyBadgeRefresh\(\)/);
 assert.match(ui,/setInterval\(refreshVisiblePlayerWeeklyBadges,PLAYER_WEEKLY_BADGE_REFRESH_MS\)/);
});

test('new-year and current year badge cutoff avoid dropping old verified season',()=>{
 assert.match(backend,/Number\(nflState\?\.season\)>Number\(league\?\.season\)\?18/);
 assert.match(backend,/verifiedCompletedWeek:year<currentSeason\?17:Math\.min\(17,currentCompletedWeek,verifiedCurrentWeek\)/);
 assert.match(backend,/playerMilestoneCache\.get\(cacheKey\)/);
 assert.match(backend,/now-cachedMilestone\.t<60000/);
 assert.match(ui,/const previous=playerScoringCache\.get\(key\)/,'retain previously verified badge history');
 assert.match(ui,/Promise\.allSettled\(/,'canonical award feed and milestone scorer are independent');
 assert.match(ui,/const awardsTask=canonicalPlayerAwardRecords\(\)\.then/,'canonical awards paint independently');
 assert.match(ui,/const scoringTask=scoringFetch\(key\)\.then/,'scoring response paints independently');
 assert.match(ui,/mergeCanonicalPlayerAwardMilestones\(next,canonicalRecords,key\)/,'late scoring cannot overwrite canonical awards');
});
