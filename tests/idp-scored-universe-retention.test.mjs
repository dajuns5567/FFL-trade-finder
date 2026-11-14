import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const src=readFileSync(new URL('../valuation-idp-v21.js',import.meta.url),'utf8');
const start=src.indexOf('function universe24()'),end=src.indexOf('function model24(',start);
assert.ok(start>0&&end>start,'test the actual IDP master universe implementation');
function simulate({complete=true,players={},current={},assets=[],consensus={}}={}){
 const state={allAssets:assets,consensusComposite:{byId:consensus},sleeperHistory:{complete,currentSeason:2026},stats:{2026:current},players};
 const sandbox={state,groupPos:x=>['LB','DL','DT','DE','CB','DB','S','EDGE'].includes(state.players?.[x.id]?.position)?'IDP':'WR',
  statObj24:x=>x?.stats||x,games24:x=>Number((x?.stats||x)?.gp)||0,
  statNumber24:(x,key)=>Number(x?.[key])||0,Number,Object,Array,String,Set};
 return Array.from(runInNewContext(src.slice(start,end)+'\nuniverse24()',sandbox),x=>({id:String(x.id),owner:x.owner}));
}
const player=(position,active=true)=>({position,active,fantasy_positions:[position]});
test('qualified active IDP with verified scoring remains valued when every consensus source omits them',()=>{
 const result=simulate({players:{'11668':player('DL'),'10935':player('LB'),'8752':player('CB')},
  current:{'11668':{gp:9,pts_idp:63},'10935':{gp:9,pts_idp:118},'8752':{gp:9,pts_idp:109}}});
 assert.deepEqual(result.map(x=>x.id).sort(),['10935','11668','8752']);
 assert.ok(result.every(x=>x.owner===null),'unrostered candidates receive no invented owner');
});
test('incomplete history, inactive IDP, missing points and offense never manufacture an IDP candidate',()=>{
 const result=simulate({players:{
  good:player('LB'),few:player('LB'),zero:player('DL'),retired:player('LB',false),offense:player('WR')},
  current:{good:{gp:8,pts_idp:60},few:{gp:7,pts_idp:78},
   zero:{gp:9,pts_idp:0},retired:{gp:9,pts_idp:110},offense:{gp:10,pts_idp:150}}});
 assert.deepEqual(result.map(x=>x.id),['good']);
});
test('preserve roster and verified consensus candidate entries even without current scoring',()=>{
 const result=simulate({players:{rostered:player('LB',false),sourced:player('DB'),qualified:player('LB')},
  assets:[{type:'player',id:'rostered',owner:14}],consensus:{sourced:420},
  current:{qualified:{gp:8,pts_idp:44},sourced:{gp:10,pts_idp:90}}});
 assert.deepEqual(result.map(x=>x.id).sort(),['qualified','rostered','sourced']);
 assert.equal(result.find(x=>x.id==='rostered').owner,14);
});
test('never add scorer-only candidates when the canonical Sleeper data is incomplete',()=>{
 const input={players:{scorer:player('LB')},current:{scorer:{gp:9,pts_idp:93}}};
 assert.equal(simulate({...input,complete:false}).length,0);
 assert.deepEqual(simulate({...input,complete:true}).map(x=>x.id),['scorer']);
});
test('IDP fallback is explicit, conservative, and never invents missing source consensus',()=>{
 assert.match(src,/if\(!c\)\{const value=\.35\*prod\.value\+\.15\*other/);
 const perf=readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
 assert.match(perf,/const raw=\.40\*scoreValue\+\.20\*contextValue/);
 assert.match(perf,/return\{value:Math\.max\(25,Math\.min\(700,Math\.round\(raw\)\)\),raw,fallback:true\}/);
});
