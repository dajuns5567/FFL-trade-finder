import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
const begin=source.indexOf('let canonicalPlayerAwardRecordsCache=');
const end=source.indexOf('function scoringMilestonesRows(',begin);
const loadStart=source.indexOf('async function loadPlayerScoring(');
const loadEnd=source.indexOf('const PLAYER_WEEKLY_BADGE_REFRESH_MS',loadStart);
assert.ok(begin>0&&end>begin&&loadStart>0&&loadEnd>loadStart);
const helpers=source.slice(begin,end),loader=source.slice(loadStart,loadEnd);
const makeRecord=(year,week,player,points,extra={})=>({
 season:year,week,award_source:'sleeper-finalized-matchups',verified_roster_count:32,
 players_of_week:{offense:{player_id:player,points}},...extra
});
const records=[
 makeRecord(2026,6,'4034',30.7),
 makeRecord(2026,10,'4034',46.3),
 makeRecord(2026,9,'8151',36.3)
];
const existing={
 highWeek:{points:48.7,season:2023,week:4},highSeason:{points:420,season:2025},
 weeklyAwards:[
  {type:'offensive-player-of-week',title:'Top Offensive Scorer',season:2025,week:7,points:39.1},
  {type:'offensive-player-of-week',title:'Top Offensive Scorer',season:2023,week:15,points:41.7},
  {type:'offensive-player-of-week',title:'Top Offensive Scorer',season:2023,week:4,points:48.7}
 ]
};
function fixture({feed=records,scoring=existing,scoringFetchOverride=null}={}){
 const node={innerHTML:''},cache=new Map(),at=new Map();
 const ctx={fetch:async url=>{
  assert.equal(url,'/.netlify/functions/league-hub?weekly_awards=1');
  return{ok:true,json:async()=>({records:feed})};
 },Date,Map,Promise,Number,String,Object,Array,Math,console,
 playerScoringCache:cache,playerScoringCacheAt:at,currentPlayerId:'4034',
 scoringFetch:scoringFetchOverride||async()=>({scoring_milestones:scoring}),
 document:{getElementById:id=>id==='vhScoringMilestones'?node:null},
 scoringMilestonesRows:v=>JSON.stringify(v.weeklyAwards)
 };
 vm.createContext(ctx);
 vm.runInContext(helpers+'\n'+loader+
  ';globalThis.merge=mergeCanonicalPlayerAwardMilestones;globalThis.load=loadPlayerScoring;',ctx);
 return{ctx,node,cache};
}
test('McCaffrey keeps all three historical badges plus 2026 Weeks 6 and 10',async()=>{
 const {ctx,cache,node}=fixture();
 await ctx.load('4034');
 const badges=cache.get('4034').weeklyAwards;
 assert.equal(badges.length,5,'there must be no three-award display limit');
 assert.deepEqual(Array.from(badges,x=>x.season+'|'+x.week),
  ['2026|10','2026|6','2025|7','2023|15','2023|4']);
 assert.equal(badges[0].points,46.3);
 assert.equal(badges[1].points,30.7);
 assert.ok(node.innerHTML.includes('"week":10'));
 assert.equal(cache.get('4034').highWeek.points,48.7);
});
test('unverified or another player awards cannot leak into this profile',()=>{
 const {ctx}=fixture();
 const modified=[...records,makeRecord(2026,11,'4034',99,{verified_roster_count:31}),
  makeRecord(2026,8,'4034',50,{award_source:'unverified',verified_roster_count:32})];
 const r=ctx.merge(existing,modified,'4034');
 assert.equal(r.weeklyAwards.length,5);
 assert.equal(r.weeklyAwards.some(a=>a.week===11),false);
 assert.equal(r.weeklyAwards.some(a=>a.week===8),false);
});
test('canonical weekly winner supersedes a stale calculated score without duplicating',()=>{
 const {ctx}=fixture();
 const old={weeklyAwards:[{type:'offensive-player-of-week',season:2026,week:10,points:35}]};
 const r=ctx.merge(old,records,'4034');
 assert.equal(r.weeklyAwards.filter(a=>a.season===2026&&a.week===10).length,1);
 assert.equal(r.weeklyAwards.find(a=>a.week===10).points,46.3);
});
test('more than three distinct verified awards are all retained, descending by season and week',()=>{
 const {ctx}=fixture(),many=Array.from({length:12},(_,i)=>makeRecord(2026,i+1,'4034',i+10));
 const r=ctx.merge({weeklyAwards:[]},many,'4034');
 assert.equal(r.weeklyAwards.length,12);
 assert.equal(r.weeklyAwards[0].week,12);
 assert.equal(r.weeklyAwards.at(-1).week,1);
});
test('reader requests canonical League Hub awards independently from scoring endpoint',()=>{
 assert.match(helpers,/\.netlify\/functions\/league-hub\?weekly_awards=1/);
 assert.match(loader,/Promise\.allSettled/);
 assert.doesNotMatch(helpers,/weeklyAwards\.slice\(0,\s*3\)/);
});

test('verified Week 10 badges paint before slow historical stats complete',async()=>{
 let resolveScoring;
 const slow=new Promise(resolve=>{resolveScoring=resolve});
 const {ctx,node,cache}=fixture({scoringFetchOverride:()=>slow});
 const reading=ctx.load('4034');
 for(let i=0;i<12&&!cache.get('4034')?.weeklyAwards?.length;i++)await Promise.resolve();
 const quick=cache.get('4034')?.weeklyAwards||[];
 assert.deepEqual(Array.from(quick,x=>x.season+'|'+x.week),['2026|10','2026|6']);
 assert.ok(node.innerHTML.includes('"week":10'),'verified badge visible during slow stats');
 resolveScoring({scoring_milestones:existing});
 await reading;
 assert.deepEqual(Array.from(cache.get('4034').weeklyAwards,x=>x.season+'|'+x.week),
  ['2026|10','2026|6','2025|7','2023|15','2023|4']);
 assert.equal(cache.get('4034').highWeek.points,48.7);
});

test('late stale scoring cannot overwrite canonical weekly winner',async()=>{
 let resolveScoring;
 const slow=new Promise(resolve=>{resolveScoring=resolve});
 const {ctx,cache}=fixture({scoringFetchOverride:()=>slow});
 const reading=ctx.load('4034');
 for(let i=0;i<12&&!cache.get('4034')?.weeklyAwards?.length;i++)await Promise.resolve();
 resolveScoring({scoring_milestones:{weeklyAwards:[
  {type:'offensive-player-of-week',season:2026,week:10,points:12},
  ...existing.weeklyAwards
 ]}});
 await reading;
 const awards=cache.get('4034').weeklyAwards;
 assert.equal(awards.filter(a=>a.season===2026&&a.week===10).length,1);
 assert.equal(awards.find(a=>a.season===2026&&a.week===10).points,46.3);
});
test('independent award loading persists in approved browser source overlay',async()=>{
 const {applyApprovedPlayerBadgeReadback}=await import('../scripts/approved-player-badge-readback-overlay.mjs');
 const base='function scoringMilestonesRows(scoring,loading=false){\n}\n'+
  'async function loadPlayerScoring(id){\n  const key=String(id);if(playerScoringCache.has(key)&&Date.now()-(playerScoringCacheAt.get(key)||0)<60000)return;\n  try{\n    const data=await scoringFetch(key);\n    const value=data?.scoring_milestones;\n    playerScoringCache.set(key,value&&typeof value===\'object\'?value:null);playerScoringCacheAt.set(key,Date.now());\n  }catch(error){\n    console.warn(\'Player scoring milestones unavailable\',key,error);\n    // A transient Sleeper or badge endpoint failure cannot erase previously\n    // verified Player-of-the-Week awards on an open profile.\n    if(!playerScoringCache.has(key))playerScoringCache.set(key,null);\n    playerScoringCacheAt.set(key,Date.now());\n  }\n  if(String(currentPlayerId)!==key)return;\n  const target=document.getElementById(\'vhScoringMilestones\');if(target)target.innerHTML=scoringMilestonesRows(playerScoringCache.get(key),false);\n}\n';
 const applied=applyApprovedPlayerBadgeReadback(base);
 assert.match(applied,/const awardsTask=canonicalPlayerAwardRecords\(\)\.then/);
 assert.match(applied,/const scoringTask=scoringFetch\(key\)\.then/);
 assert.match(applied,/await Promise\.allSettled\(\[awardsTask,scoringTask\]\)/);
});
