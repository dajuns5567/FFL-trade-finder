import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const scheduled=readFileSync(new URL('../netlify/functions/weekly-awards-refresh.mjs',import.meta.url),'utf8');
const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
const script=scheduled.replace(/^import \{weeklyAwards\} from '.\/league-hub\.mjs';\s*/m,'')
 .replace('export const config=','const config=')
 .replace('export default async function weeklyAwardRefresh','async function weeklyAwardRefresh');

function handler(context='production',branch='main',result={records:[
 {season:2026,week:10,players_of_week:{offense:{player_id:'123'},defense:{player_id:'456'}}}
 ]},throws=false){
 let writes=0;
 const scope={process:{env:{CONTEXT:context,BRANCH:branch}},Response,console,
 weeklyAwards:async args=>{
  assert.deepEqual(JSON.parse(JSON.stringify(args)),{persist:true,strictPersist:true});
  writes++;
  if(throws)throw Error('provider unavailable');
  return result;
 }};
 vm.createContext(scope);
 const invoke=vm.runInContext(script+';weeklyAwardRefresh',scope);
 return{invoke,writes:()=>writes};
}

test('scheduled award job runs every two hours without awaiting a site visitor or Inquirer publication',()=>{
 assert.match(scheduled,/schedule:'15 \*\/2 \* \* \*'/);
 assert.match(scheduled,/weeklyAwards\(\{persist:true,strictPersist:true\}\)/);
 assert.doesNotMatch(scheduled,/broadcastArchive\(|weeklyReport\(/);
});

test('only published production may persist badges; Deploy Previews never write',async()=>{
 for(const [context,branch]of [['deploy-preview','main'],['branch-deploy','main'],['production','review-feature']]){
  const t=handler(context,branch),res=await t.invoke();
  assert.equal(res.status,200);
  assert.equal(t.writes(),0,'no production writes in '+context+'/'+branch);
 }
 const t=handler();
 const res=await t.invoke();
 assert.equal(res.status,200);
 assert.equal(t.writes(),1);
 const body=await res.json();
 assert.deepEqual(JSON.parse(JSON.stringify(body.latest_verified)),{
  season:2026,week:10,offense:'123',defense:'456'});
});

test('temporary incomplete source failure is explicit rather than claiming badge publication',async()=>{
 const t=handler('production','main',null,true),res=await t.invoke();
 assert.equal(res.status,503);
 assert.equal((await res.json()).ok,false);
 assert.equal(t.writes(),1);
});

test('only actual changes to verified awards are persisted, including same-length record corrections',()=>{
 assert.match(hub,/const weeklyAwardsChanged=JSON\.stringify\(records\)!==JSON\.stringify\(next\)/);
 assert.match(hub,/if\(persist&&s&&weeklyAwardsChanged\)/);
 assert.match(hub,/if\(persist&&strictPersist&&!s\)/);
 assert.doesNotMatch(hub,/if\(persist&&s&&\(missing\.length\|\|records\.length!==next\.length\)\)/);
 assert.match(hub,/isTrustedWeeklyAwardCache\(rec,rec\.season,rec\.week\)/);
 assert.match(hub,/award_source:'sleeper-finalized-matchups'/);
 assert.match(hub,/verified_roster_count:broadcast\.teams\.length/);
});
