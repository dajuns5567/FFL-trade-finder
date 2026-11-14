import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeDrift, corroboratesPending, scheduledArchiveDecision } from '../scripts/value-history-systemic-drift.mjs';

const groups=['QB','RB','WR','TE','IDP'];
function population(){
 return groups.flatMap((pos,p)=>Array.from({length:160},(_,i)=>({id:String(1000+p*200+i),pos,value:2000+10*i})));
}
const shift=(rows,fn)=>rows.map(row=>({...row,value:Math.round(row.value*fn(row))}));

test('routine player-level moves pass without suppressing legitimate price discovery',()=>{
 const initial=population();
 const after=shift(initial,r=>r.id==='1000'?1.6:1.002);
 assert.equal(summarizeDrift(initial,after).flagged,false);
});
test('synchronized 4 percent moves across offense and IDP are quarantined',()=>{
 const initial=population();
 const after=shift(initial,()=>1.04);
 const result=summarizeDrift(initial,after);
 assert.equal(result.flagged,true);
 assert.equal(result.reason,'multi-position-coherent-shift');
});
test('IDP-wide 12 percent shift is quarantined independently of offense',()=>{
 const initial=population();
 const after=shift(initial,r=>r.pos==='IDP'?.87:1);
 const result=summarizeDrift(initial,after);
 assert.equal(result.flagged,true);
 assert.equal(result.reason,'idp-population-shock');
});
test('a second independent and consistent capture automatically corroborates the new baseline',()=>{
 const initial=population();
 const after=shift(initial,()=>1.04);
 const repeat=shift(after,()=>1.003);
 assert.equal(corroboratesPending(after,repeat),true);
 assert.equal(corroboratesPending(after,initial),false);
});
test('large missing-player populations cannot be treated as corroboration',()=>{
 const initial=population(),sample=initial.slice(0,100);
 assert.equal(corroboratesPending(initial,sample),false);
 assert.equal(summarizeDrift(initial,sample).flagged,false);
});

test('a 20 percent missing-player population is quarantined even if the remaining values match',()=>{
 const old=population(),reduced=old.slice(0,640);
 const outcome=summarizeDrift(old,reduced);
 assert.equal(outcome.flagged,true);
 assert.equal(outcome.reason,'population-coverage-collapse');
 assert.equal(corroboratesPending(old,reduced),false);
});
test('archive decision requires an independent later capture from the same baseline and contract',()=>{
 const a={t:'2026-11-13T01:00:00Z',rows:population()};
 const rows=shift(a.rows,()=>1.04),b={t:'2026-11-13T05:00:00Z',rows,valuation_contract:'precision-idp-runtime-20260919'};
 const pending={schema_version:1,previous:a.t,capturedAt:'2026-11-13T03:00:00Z',valuation_contract:b.valuation_contract,rows};
 assert.equal(scheduledArchiveDecision(a,b,null).action,'quarantine');
 assert.equal(scheduledArchiveDecision(a,b,pending).action,'archive-confirmed');
 assert.equal(scheduledArchiveDecision(a,b,{...pending,previous:'2026-11-12T01:00:00Z'}).action,'quarantine');
 assert.equal(scheduledArchiveDecision(a,b,{...pending,valuation_contract:'different'}).action,'quarantine');
 assert.equal(scheduledArchiveDecision(a,b,{...pending,capturedAt:b.t}).action,'quarantine');
 assert.equal(scheduledArchiveDecision(a,{...b,rows:a.rows},pending).action,'archive');
});
test('restored coverage needs fresh, complete corroboration; trimmed snapshots cannot confirm',()=>{
 const a={t:'2026-11-13T01:00:00Z',rows:population()};
 const reduced=shift(a.rows.slice(0,640),()=>.8);
 const b={t:'2026-11-13T05:00:00Z',rows:reduced,valuation_contract:'x'};
 const pending={schema_version:1,previous:a.t,capturedAt:'2026-11-13T03:00:00Z',valuation_contract:'x',rows:reduced};
 assert.equal(scheduledArchiveDecision(a,b,pending).action,'quarantine');
});
