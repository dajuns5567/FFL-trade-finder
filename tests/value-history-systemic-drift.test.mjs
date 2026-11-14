import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeDrift,scheduledArchiveDecision} from '../scripts/value-history-systemic-drift.mjs';
const positions=['QB','RB','WR','TE','IDP'];
const population=()=>positions.flatMap((pos,p)=>Array.from({length:160},(_,i)=>({id:String(1000+p*200+i),pos,value:2000+10*i,overall:p*160+i+1})));
const shifted=(rows,fn)=>rows.map(r=>({...r,value:Math.round(r.value*fn(r))}));
const snap=(rows,t='2026-11-14T00:00:00.000Z')=>({t,rows,valuation_contract:'precision-idp-runtime-20260919'});

test('major individual 60 percent gain archives immediately',()=>{
 const a=population(),b=shifted(a,r=>r.id==='1000'?1.60:1);
 assert.equal(scheduledArchiveDecision(snap(a),snap(b)).action,'archive');
});
test('a synchronous 40 percent rise across all positions archives immediately',()=>{
 const a=population(),b=shifted(a,()=>1.40);
 const decision=scheduledArchiveDecision(snap(a),snap(b));
 assert.equal(decision.action,'archive');
 assert.equal(decision.marketMovementObserved,true);
 assert.equal(decision.integrityReason,null);
});
test('a 35 percent IDP-wide decrease archives immediately',()=>{
 const a=population(),b=shifted(a,r=>r.pos==='IDP'?.65:1);
 const decision=scheduledArchiveDecision(snap(a),snap(b));
 assert.equal(decision.action,'archive');
 assert.equal(decision.marketMovementObserved,true);
});
test('legitimate directional reversal also archives immediately with no confirmation requirement',()=>{
 const a=population(),high=shifted(a,()=>1.4);
 assert.equal(scheduledArchiveDecision(snap(a),snap(high)).action,'archive');
 assert.equal(scheduledArchiveDecision(snap(high),snap(a)).action,'archive');
});
test('ordinary value changes are not flagged or rejected',()=>{
 const a=population(),b=shifted(a,r=>r.id==='1000'?1.07:1.002);
 assert.equal(summarizeDrift(a,b).flagged,false);
 assert.equal(scheduledArchiveDecision(snap(a),snap(b)).action,'archive');
});
test('a 20 percent loss of tracked players is blocked independently of value changes',()=>{
 const a=population(),b=a.slice(0,640);
 const d=scheduledArchiveDecision(snap(a),snap(b));
 assert.equal(d.action,'quarantine');
 assert.equal(d.integrityReason,'population-coverage-collapse');
});
test('missing player population remains blocked even when prices move naturally',()=>{
 const a=population(),b=shifted(a.slice(0,640),()=>1.2);
 assert.equal(scheduledArchiveDecision(snap(a),snap(b)).action,'quarantine');
});
test('single missing players do not block a valid market shift',()=>{
 const a=population(),b=shifted(a.slice(0,795),()=>1.25);
 assert.equal(scheduledArchiveDecision(snap(a),snap(b)).action,'archive');
});
test('nonfinite and duplicate player values fail integrity checks',()=>{
 const a=population();
 assert.equal(scheduledArchiveDecision(snap(a),snap([...a.slice(0,-1),{...a.at(-1),value:Infinity}])).integrityReason,'invalid-or-duplicate-player-row');
 assert.equal(scheduledArchiveDecision(snap(a),snap([...a,a[0]])).action,'quarantine');
});
test('scoring/ranking magnitude cannot be used as an arbitrary cap',()=>{
 const a=population(),b=shifted(a,()=>3);
 assert.equal(scheduledArchiveDecision(snap(a),snap(b)).action,'archive');
});
