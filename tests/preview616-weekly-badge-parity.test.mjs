import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
const begin=source.indexOf('async function canonicalWeeklyAwards(origin){');
const end=source.indexOf('async function scoringMilestones(playerId){',begin);
assert.ok(begin>=0&&end>begin,'Use the exact current backend canonical reader');
const code=source.slice(begin,end);
const verified=(week,id,points)=>({
 season:2026,week,award_source:'sleeper-finalized-matchups',verified_roster_count:32,
 manager_awards:[{type:'highest-scorer'},{type:'lowest-scorer'}],
 players_of_week:{
   offense:{player_id:id,points},
   defense:{player_id:'1000',points:24.2}
 }
});
test('protected deploy preview reads validated Weeks 6 and 10 directly from shared Blob',async()=>{
 let blobReads=0,selfFetches=0;
 const context={
   getStore:(name,options)=>{
     assert.equal(name,'fleeced-league-hub');assert.equal(options.consistency,'strong');
     return {get:async(key,opts)=>{
       assert.equal(key,'awards/weekly.json');assert.equal(opts.type,'json');blobReads++;
       return {records:[
         verified(6,'4034',30.7),
         verified(10,'4034',46.3),
         {...verified(11,'4034',99),verified_roster_count:31},
         {...verified(12,'4034',99),award_source:'unverified'}
       ]};
     }};
   },
   fetch:async()=>{selfFetches++;throw Error('blocked by Team Access')},
   console,Number,String,Array,Date,Math
 };
 vm.createContext(context);
 const read=vm.runInContext(code+';canonicalWeeklyAwards',context);
 const awards=await read('https://deploy-preview-617--example.netlify.app');
 assert.deepEqual(Array.from(awards,r=>[r.season,r.week,r.players_of_week.offense.player_id]),[
   [2026,6,'4034'],[2026,10,'4034']]);
 assert.equal(blobReads,1);assert.equal(selfFetches,0);
});
test('missing Blob data preserves existing public endpoint fallback',async()=>{
 const context={getStore:()=>{throw Error('not configured')},
   fetch:async()=>({ok:true,json:async()=>({records:[verified(10,'4034',46.3)]})}),
   console,Number,String,Array,Date,Math
 };
 vm.createContext(context);
 const reader=vm.runInContext(code+';canonicalWeeklyAwards',context);
 const out=await reader('https://example.netlify.app');
 assert.equal(out.length,1);
 assert.equal(out[0].week,10);
});

test('visible player milestones render independent verified weekly wins before slow scorer completes',()=>{
 const ui=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
 assert.match(ui,/async function canonicalPlayerAwardRecords\(/);
 assert.match(ui,/mergeCanonicalPlayerAwardMilestones\(/);
 assert.match(ui,/const awardsTask=canonicalPlayerAwardRecords\(\)\.then/);
 assert.match(ui,/const scoringTask=scoringFetch\(key\)\.then/);
 assert.match(ui,/await Promise\.allSettled\(\[awardsTask,scoringTask\]\)/);
 assert.match(ui,/loadPlayerScoring\(key\);/);
 assert.match(ui,/installPlayerWeeklyBadgeRefresh\(\)/);
 assert.match(ui,/const previous=playerScoringCache\.get\(key\)/);
 assert.doesNotMatch(ui,/playerScoringCache\.set\(key,null\)/);
});

test('McCaffrey retains three historical awards plus both verified 2026 wins',()=>{
 const ui=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
 const start=ui.indexOf('function mergeCanonicalPlayerAwardMilestones(');
 const end=ui.indexOf('function scoringMilestonesRows(',start);
 assert.ok(start>=0&&end>start,'Use actual browser merge function');
 const ctx={Number,String,Array,Map,Date,Math};
 vm.createContext(ctx);
 const merge=vm.runInContext(ui.slice(start,end)+';mergeCanonicalPlayerAwardMilestones',ctx);
 const old={weeklyAwards:[
   {season:2025,week:7,type:'offensive-player-of-week',points:39.1},
   {season:2023,week:15,type:'offensive-player-of-week',points:41.7},
   {season:2023,week:4,type:'offensive-player-of-week',points:48.7}
 ]};
 const now=[verified(6,'4034',30.7),verified(10,'4034',46.3),
    {...verified(11,'4034',100),verified_roster_count:31}];
 const out=merge(old,now,'4034');
 assert.equal(out.weeklyAwards.length,5);
 assert.deepEqual(Array.from(out.weeklyAwards.slice(0,2),a=>[a.season,a.week,a.points]),
  [[2026,10,46.3],[2026,6,30.7]]);
 assert.ok(out.weeklyAwards.some(a=>a.season===2023&&a.week===4));
});
