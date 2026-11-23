import test from 'node:test';
import assert from 'node:assert/strict';
import {marketFromSnapshots,marketInsightsFromSnapshots} from '../netlify/functions/value-history.mjs';
const V101='idp-v101-verified-role-growth-v100-source-free-lineage';
function snap(t,model,mafe,other,shift=false){
 const rows=Array.from({length:120},(_,i)=>({id:String(90000+i),pos:i%2?'IDP':'WR',
  overall:i+2,posRank:i+1,value:2200+i+(shift?1:0)}));
 rows.push({id:'8343',pos:'IDP',overall:277,posRank:49,value:mafe});
 rows.push({id:'12605',pos:'IDP',overall:274,posRank:47,value:other});
 return{t,rows,...(model?{valuation_model:model}:{})};
}
const history=[
 snap('2026-11-15T23:00:00.000Z',null,330,490),
 snap('2026-11-21T00:58:36.636Z',null,324,495),
 snap('2026-11-21T03:52:31.983Z',null,2090,2117,true),
 snap('2026-11-21T04:35:59.148Z',V101,2090,2116,true),
 snap('2026-11-22T23:52:19.966Z',V101,2065,2085,true)
];
const mover=(rows,id)=>[...(rows?.valueRisers||[]),...(rows?.valueFallers||[])].find(x=>x.id===id);
test('Boye Mafe real 7D movement excludes the untagged V101 adoption jump',()=>{
 const market=marketFromSnapshots(history);
 const m=mover(market.periods['7D'],'8343');
 assert.equal(m.delta,-31,'V96 330→324 (-6), V101 2090→2065 (-25); never count 324→2090');
 assert.notEqual(m.delta,1735);
 assert.equal(market.comparable_since,'2026-11-21T03:52:31.983Z');
 assert.equal(market.prior_valuation_model,null);
 assert.equal(market.valuation_model,V101);
 assert.equal(m.comparable_segments,2);
});
test('Market Intelligence 7D player changes use precisely the same era-safe 7D delta',()=>{
 const market=marketFromSnapshots(history),intel=marketInsightsFromSnapshots(history);
 const a=mover(market.periods['7D'],'8343');
 const b=intel.ranges['7D'].player_changes.find(x=>x.id==='8343');
 assert.equal(b?.delta,a?.delta);
 assert.equal(b?.delta,-31);
 assert.equal(intel.comparable_since,'2026-11-21T03:52:31.983Z');
});
test('historical evidence is immutable and detection requires a large matching population',()=>{
 const before=JSON.stringify(history);
 marketFromSnapshots(history);
 assert.equal(JSON.stringify(history),before);
 const isolated=history.map(s=>({...s,rows:s.rows.filter(r=>r.id==='8343')}));
 const m=mover(marketFromSnapshots(isolated).periods['7D'],'8343');
 assert.equal(m.delta,1735,'cannot invent a model handoff from one player alone');
});
test('post-transition movements, not repricing, remain available to 1D and all windows',()=>{
 const m=marketFromSnapshots(history);
 assert.equal(m.periods['1D'].valueFallers.find(r=>r.id==='8343')?.delta,-25);
 for(const label of ['7D','30D','90D','1Y','ALL'])
  assert.equal(mover(m.periods[label],'8343')?.delta,-31,label);
});
