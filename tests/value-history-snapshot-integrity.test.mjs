import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectShortTermSnapback} from '../scripts/value-history-snapshot-integrity.mjs';

const rows=(count=100,step=0)=>Array.from({length:count},(_,i)=>({id:String(i+1),value:300+(i<step?90:0)}));
const snap=(t,values)=>({t,rows:values});
const a='2026-11-21T01:00:00.000Z';
const b='2026-11-21T03:00:00.000Z';
const c='2026-11-21T05:00:00.000Z';

test('archive writer imports the real restored integrity guard before writes',()=>{
 const archive=readFileSync('scripts/archive-value-history.mjs','utf8');
 assert.match(archive,/import \{ inspectShortTermSnapback \} from '\.\/value-history-snapshot-integrity\.mjs'/);
 assert.match(archive,/if\(!check\.ok\)\s*throw new Error\('VALUE_HISTORY_COHORT_SNAPBACK:/);
 assert.match(archive,/for\(const snap of incoming\)[\s\S]*?const check=inspectShortTermSnapback/);
});

test('correlated 20-player reversal of >=75 across 100 matched players fails closed',()=>{
 const first=rows(100),middle=rows(100,20),last=rows(100);
 const r=inspectShortTermSnapback(snap(a,first),snap(b,middle),snap(c,last));
 assert.equal(r.ok,false);
 assert.equal(r.affected,20);
 assert.equal(r.comparable,100);
 assert.equal(r.threshold,12);
 assert.ok(r.examples.length>0&&r.examples.length<=8);
});

test('individual market moves are not suppressed, and threshold is cohort sized',()=>{
 const r=inspectShortTermSnapback(snap(a,rows(100)),snap(b,rows(100,5)),snap(c,rows(100)));
 assert.equal(r.ok,true);
 assert.equal(r.affected,5);
 assert.equal(r.threshold,12);
});

test('directional price movement and changes below 75 do not count as snapbacks',()=>{
 const baseline=rows(100),up=baseline.map(r=>({...r,value:r.value+74})),down=baseline.map(r=>({...r,value:r.value+140}));
 assert.equal(inspectShortTermSnapback(snap(a,baseline),snap(b,up),snap(c,baseline)).affected,0);
 assert.equal(inspectShortTermSnapback(snap(a,baseline),snap(b,down),snap(c,up)).affected,0);
});

test('changes outside eighteen hours or without chronological times do not block recording',()=>{
 const first=rows(100),middle=rows(100,20),last=rows(100);
 for(const times of [
  [a,b,'2026-11-22T04:00:00.000Z'],
  [c,b,a],
  [a,b,'invalid']
 ]){
  const x=inspectShortTermSnapback(snap(times[0],first),snap(times[1],middle),snap(times[2],last));
  assert.equal(x.ok,true);
  assert.equal(x.affected,0);
 }
});

test('only players with three finite, matched values are compared',()=>{
 const one=snap(a,[{id:'1',value:300},{id:'2',value:null},{id:'3',value:100}]);
 const two=snap(b,[{id:'1',value:400},{id:'2',value:50}]);
 const three=snap(c,[{id:'1',value:300},{id:'2',value:200}]);
 const x=inspectShortTermSnapback(one,two,three);
 assert.deepEqual({comparable:x.comparable,affected:x.affected,ok:x.ok},{comparable:1,affected:1,ok:true});
});
