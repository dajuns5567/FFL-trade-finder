import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeDrift, corroboratesPending } from '../scripts/value-history-systemic-drift.mjs';

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
