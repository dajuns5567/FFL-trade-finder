import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {playerWeeklyMilestoneAwards} from '../netlify/functions/lib/player-weekly-milestone-awards.mjs';
const src=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
const first=src.indexOf('function weeklyHasData(');
const last=src.indexOf('function weeklyAwardGroup(',first);
assert.ok(first>=0&&last>first);
const source=src.slice(first,last);
function setup(){
 const calls=[];
 const archive={'9':{OTHER:{rec:2}},'10':{CMC10:{rec:14},OTHER:{rec:1}}};
 const live={9:{OTHER:{rec:2}},10:{OTHER:{rec:4}}};
 const context={SCORING_API:'https://mock.test',SCORING_RAW:'https://archive.test',
   scoringCache:new Map(),Date,Object,Array,Promise,Map,Math,Number,String,
   scoringJson:async url=>{
     calls.push(url);
     if(url.includes('weekly-stats.json'))return archive;
     const week=Number(url.split('/').pop());
     return live[week]||{};
   }
 };
 vm.createContext(context);
 vm.runInContext(source+';globalThis.scoringSeasonWeeks=scoringSeasonWeeks',context);
 return{context,calls};
}
test('missing Week 10 winning player survives when some prior weeks and partial Week 10 succeeded',async()=>{
 const {context,calls}=setup();
 const weeks=await context.scoringSeasonWeeks(2026,2026,10);
 assert.equal(weeks[9].OTHER.rec,2);
 assert.equal(weeks[10].OTHER.rec,4,'fresh live player overrides older archive stats');
 assert.equal(weeks[10].CMC10.rec,14,'historical source fills a missing player without overwriting live');
 assert.equal(calls.filter(x=>x.includes('weekly-stats.json')).length,1);
 const award=playerWeeklyMilestoneAwards({
   playerId:'CMC10',season:2026,week:10,currentSeason:2026,currentCompletedWeek:10,
   verifiedCompletedWeek:10,canonical:null,payload:weeks[10],
   players:{CMC10:{position:'RB'},OTHER:{position:'WR'}},
   scoring:{rec:1},score:(row,s)=>row.rec*s.rec
 });
 assert.equal(award[0]?.type,'offensive-player-of-week');
 assert.equal(award[0]?.week,10);
 assert.equal(award[0]?.points,14);
});
test('missing latest stats do not manufacture a badge for an unverified week',()=>{
 const results=playerWeeklyMilestoneAwards({
   playerId:'CMC10',season:2026,week:10,currentSeason:2026,currentCompletedWeek:10,
   verifiedCompletedWeek:9,canonical:null,payload:{CMC10:{rec:14}},
   players:{CMC10:{position:'RB'}},scoring:{rec:1},
   score:(row,s)=>row.rec*s.rec
 });
 assert.deepEqual(results,[]);
});
test('gapfill is per completed week, not gated by presence of any earlier data',()=>{
 assert.match(source,/for\(let week=1;week<=limit;week\+\+\)/);
 assert.match(source,/for\(const row of scoringPayloadRows\(historical\)\)/);
 assert.match(source,/for\(const row of scoringPayloadRows\(weekly\[week\]\)\)/);
 assert.doesNotMatch(source,/if\(!weeklyHasData\(weekly\)\)\{/);
});
