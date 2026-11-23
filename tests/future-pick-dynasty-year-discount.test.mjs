import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../trade-value-normalization-v139.js',import.meta.url),'utf8');
const years=[2027,2028,2029,2030,2031],rounds=[1,2,3];
function model(overrides={}){
 const picks=years.flatMap(season=>rounds.flatMap(round=>[1,2].map(original_owner=>({
  type:'pick',season,round,original_owner,owner:original_owner,
  id:`pick-${season}-${round}-${original_owner}`
 }))));
 const anchors={1:7000,2:1900,3:615};
 const state={allAssets:picks,teams:[]};
 const win={baseValue:()=>null,packageValue:()=>0,pickValue:()=>null,teamName:id=>`Roster ${id}`,
  draftPickProjection92:a=>({value:overrides[a.id]??(a.season===2027?anchors[a.round]:
    a.round===1?6865:anchors[a.round])})};
 vm.runInNewContext(source,{window:win,state,Math,Number,Map,Array,Set,String,Object,console});
 const value=(season,round=1,roster=1)=>win.tradeValueNormalizationV139.canonicalValue(
  picks.find(x=>x.season===season&&x.round===round&&x.original_owner===roster));
 return{value,picks,win};
}
test('2027, 2028, 2029, 2030 and 2031 same-slot picks decline annually across all rounds',()=>{
 const {value}=model();
 for(const round of rounds){
  const vals=years.map(y=>value(y,round));
  assert.equal(vals[0],round===1?7000:round===2?1900:615);
  assert.ok(vals.every((v,i)=>i===0||v<vals[i-1]),`round ${round}: ${vals}`);
  assert.ok(vals.every((v,i)=>i===0||v<=Math.round(vals[i-1]*.88/5)*5+5),
   `each draft must carry .88 annual cap: ${vals}`);
 }
 assert.equal(value(2028),6160);
 assert.equal(value(2029),5420);
 assert.ok(value(2030)<value(2029));
});
test('a source already below the discount cap is never penalized twice',()=>{
 const {value}=model({'pick-2028-1-1':5000});
 assert.equal(value(2028),5000);
 assert.equal(value(2029),4400,'2029 must not exceed discounted 2028 even when its source is flat');
 assert.equal(value(2027),7000);
});
test('canonical trade packages, pick context and player values all share corrected future-year prices',()=>{
 const {value,picks,win}=model();
 const norm=win.tradeValueNormalizationV139;
 const future=picks.find(p=>p.season===2029&&p.round===1&&p.original_owner===1);
 assert.equal(win.baseValue(future),value(2029));
 assert.equal(win.packageValue([future]),value(2029));
 assert.equal(norm.pickContext(future).value,value(2029));
 assert.equal(norm.canonicalValue(future),value(2029));
});
test('source identity/closest draft anchor stay unchanged; no MIDA order fallback or historical rewrite',()=>{
 const {win}=model();
 assert.equal(win.tradeValueNormalizationV139.nearestSeason(),2027);
 assert.match(source,/FUTURE_PICK_YEAR_MULTIPLIER=\.88/);
 assert.match(source,/function pickValue\(a\)/);
 assert.doesNotMatch(source,/mida/i);
});
