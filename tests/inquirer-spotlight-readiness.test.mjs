import test from 'node:test';
import assert from 'node:assert/strict';
import {hasCompleteManagerSpotlightCache} from '../netlify/functions/inquirer-publish-background.mjs';
const report={teams:Array.from({length:32},(_,i)=>({roster_id:String(i+1)}))};
const cache={current:Array.from({length:32},(_,i)=>({roster_id:String(i+1),user_id:'u'+(i+1)})),
 career:Array.from({length:32},(_,i)=>({user_id:'u'+(i+1),wins:i,losses:2}))};
test('Manager Spotlight requires real profiles for all 32 teams',()=>{
 assert.equal(hasCompleteManagerSpotlightCache(report,cache),true);
 assert.equal(hasCompleteManagerSpotlightCache(report,null),false);
 assert.equal(hasCompleteManagerSpotlightCache(report,{...cache,current:cache.current.slice(1)}),false);
 assert.equal(hasCompleteManagerSpotlightCache(report,{...cache,career:cache.career.slice(1)}),false);
 assert.equal(hasCompleteManagerSpotlightCache({teams:report.teams.slice(1)},cache),false);
});
