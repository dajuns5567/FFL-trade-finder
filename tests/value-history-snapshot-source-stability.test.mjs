import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {inspectShortTermSnapback} from '../scripts/value-history-snapshot-integrity.mjs';

const mk=(day,values)=>({t:new Date('2026-11-13T00:00:00.000Z').getTime()+day*3600000,rows:values.map((value,i)=>({id:String(i+1),value}))});
const snap=(hour,values)=>({...mk(hour,values),t:new Date(mk(hour,values).t).toISOString()});
test('refuse a genuine 9-player short-term reversal cohort; do not rewrite any archived values',()=>{
 const prior=Array.from({length:887},(_,i)=>1500+i),during=prior.slice(),back=prior.slice();
 for(let i=0;i<9;i++)during[i]+=125;
 const preserved=JSON.stringify([prior,during,back]);
 const report=inspectShortTermSnapback(snap(0,prior),snap(7,during),snap(10,back));
 assert.equal(report.ok,false);
 assert.equal(report.affected,9);
 assert.equal(report.comparable,887);
 assert.equal(JSON.stringify([prior,during,back]),preserved);
});
test('do not block legitimate monotonic rank/consensus changes or one exceptional player',()=>{
 const base=Array.from({length:890},(_,i)=>1500+i);
 const rise=base.map((v,i)=>i<308?v+120:v);
 const grown=rise.map((v,i)=>i<308?v+35:v);
 assert.equal(inspectShortTermSnapback(snap(0,base),snap(7,rise),snap(10,grown)).ok,true);
 const single=rise.slice();single[7]=base[7];
 assert.equal(inspectShortTermSnapback(snap(0,base),snap(7,rise),snap(10,single)).ok,true);
});
test('do not compare snapshots beyond a short, reliable time window',()=>{
 const base=Array.from({length:890},(_,i)=>1500+i),rise=base.map(v=>v+100);
 assert.equal(inspectShortTermSnapback(snap(0,base),snap(23,rise),snap(25,base)).ok,true);
 assert.equal(inspectShortTermSnapback(snap(0,base),snap(8,rise),snap(40,base)).ok,true);
});
test('refuse partial publisher completion, even when refresh is marked complete',()=>{
 const src=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
 const begin=src.indexOf('function snapshotPreconditions(){'),end=src.indexOf('function sameSnapshotRows(',begin);
 assert.ok(begin>0&&end>begin);
 const state={players:Object.fromEntries(Array.from({length:110},(_,i)=>['p'+i,{id:'p'+i}])),sleeperHistory:{complete:true}};
 const window={state,modeledPlayerValuesV319:{ready:true},
  __fllValueRefresh:{inFlight:false,phase:'complete'},
  __fllConsensusRefresh:{complete:true,ok:true,successful:7}};
 const document={getElementById:()=>({textContent:'Updated'})};
 const scope={window,state,document,Object,Number,String};
 vm.runInNewContext(src.slice(begin,end),scope);
 assert.equal(scope.snapshotPreconditions(),true);
 window.__fllConsensusRefresh={complete:true,ok:false,successful:6};
 assert.equal(scope.snapshotPreconditions(),false);
 window.__fllConsensusRefresh={complete:true,ok:true,successful:7};
 window.__fllValueRefresh.phase='complete-with-lkg';
 assert.equal(scope.snapshotPreconditions(),false);
 window.__fllValueRefresh.phase='complete';
 window.modeledPlayerValuesV319.ready=false;
 assert.equal(scope.snapshotPreconditions(),false);
});
test('snapback guard runs before any archival index or immutable snapshot writing',()=>{
 const src=readFileSync(new URL('../scripts/archive-value-history.mjs',import.meta.url),'utf8');
 assert.ok(src.indexOf('inspectShortTermSnapback(confirmed.at(-2),confirmed.at(-1),snap)')>0);
 assert.ok(src.indexOf('VALUE_HISTORY_COHORT_SNAPBACK')<src.indexOf('await putFile(path,JSON.stringify(snap'));
 assert.match(src,/preserving immutable archive and retrying on next schedule/);
});
