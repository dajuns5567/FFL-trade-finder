import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync('modeled-player-values-v319.js','utf8');
function fixture(){
 const assets=Array.from({length:30},(_,i)=>({type:'player',id:String(1000+i),owner:i%3+1}));
 const players=Object.fromEntries(assets.map((a,i)=>[a.id,{fantasy_positions:[i%3===0?'WR':'LB'],position:i%3===0?'WR':'LB'}]));
 const st={allAssets:assets,players};
 let rows=assets.map((a,i)=>({x:a,value:3000-i*25,marketPrecisionValueV386:3100-i*25}));
 const listeners=new Map(),timers=[];
 const normalized={
  playerValueForRank:(r)=>Math.max(120,9999-90*(r-1)),
  playerValue:()=>999,
  canonicalValue:a=>a.type==='pick'?777:999,
  canonicalPackageValue:()=>-1
 };
 const engine={assetValue:()=>-3};
 const win={state:st,ensureMaster:()=>rows,tradeValueNormalizationV139:normalized,
  tradeValueNormalizationV130:normalized,tradeEngine99:engine,
  addEventListener:(name,fn)=>(listeners.get(name)||listeners.set(name,[]).get(name)).push(fn),
  dispatchEvent:event=>(listeners.get(event.type)||[]).forEach(fn=>fn(event))};
 const doc={readyState:'loading',addEventListener:()=>{},getElementById:()=>null};
 const ctx={window:win,document:doc,Number,String,Array,Object,Set,Map,Math,
  setTimeout:fn=>{timers.push(fn);return timers.length;},
  CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},
  console};
 vm.runInNewContext(source,ctx,{filename:'modeled-player-values-v319.js'});
 const flush=()=>{while(timers.length)timers.shift()()};
 return{win,st,assets,engine,normalized,flush,listeners,
  setRows:next=>{rows=next},getRows:()=>rows};
}

test('Player Values is one canonical price map for trade engines, evaluator packages, and live consumers',()=>{
 const f=fixture();
 assert.equal(f.win.modeledPlayerValuesV319.install(),true);
 f.flush();
 const a=f.assets[5],p=f.normalized.playerValue(a);
 assert.equal(f.win.modeledPlayerValuesV319.snapshot().get(a.id),p);
 assert.equal(f.win.baseValue(a),p);
 assert.equal(f.engine.assetValue(a),p);
 assert.equal(f.win.packageValue([a,a]),2*p);
 assert.equal(f.normalized.canonicalValue(a),p);
 assert.equal(f.normalized.canonicalPackageValue([a,a]),2*p);
 assert.equal(f.win.baseValue({type:'pick',id:'pick-2027-1-1'}),777);
});
test('consensus scoring refresh commits new prices and notifies every current-data consumer',()=>{
 const f=fixture(),events=[];
 f.win.addEventListener('fll:canonical-values-ready',e=>events.push(e.detail));
 assert.equal(f.win.modeledPlayerValuesV319.install(),true);
 f.flush();
 const a=f.assets[0],before=f.win.baseValue(a),version=f.win.modeledPlayerValuesV319.meta.version;
 const changed=f.getRows().slice();
 [changed[0],changed[1]]=[changed[1],changed[0]];
 f.setRows(changed);
 assert.equal(f.win.modeledPlayerValuesV319.refresh(true),true);
 f.flush();
 const after=f.win.baseValue(a);
 assert.notEqual(after,before,'ranked current values must update after source reordering');
 assert.equal(f.engine.assetValue(a),after);
 assert.equal(f.normalized.playerValue(a),after);
 assert.equal(f.win.modeledPlayerValuesV319.snapshot().get(a.id),after);
 assert.equal(f.win.packageValue([a,a]),2*after);
 assert.ok(f.win.modeledPlayerValuesV319.meta.version>version);
 assert.ok(events.length>=2,'new canonical model generation event is published');
 assert.equal(events.at(-1).players,30);
});
test('a no-price-change refresh does not create a false new market currency event',()=>{
 const f=fixture(),events=[];
 f.win.addEventListener('fll:canonical-values-ready',e=>events.push(e.detail));
 assert.equal(f.win.modeledPlayerValuesV319.install(),true);
 f.flush();
 assert.equal(events.length,1);
 assert.equal(f.win.modeledPlayerValuesV319.refresh(true),true);
 f.flush();
 assert.equal(events.length,1,'identical modeled prices have no new generation');
});
test('Player Values/Value History consume committed model events, never archive overwrites',()=>{
 const history=readFileSync('value-history-v276.js','utf8');
 const ui=readFileSync('ui-player-values-v139.js','utf8');
 assert.match(history,/window\.addEventListener\('fll:canonical-values-ready'/);
 assert.match(history,/liveMarketVersionV102/);
 assert.match(history,/row\.liveCurrentV97===true\?row\.recordedValue:row\.value/);
 assert.match(ui,/window\.addEventListener\('fll:canonical-values-ready'/);
 assert.match(history,/The teal marker is live and is not saved as history/);
 assert.match(history,/historicalPlayerValue\(side,asset\.id\)/);
});

test('refresh cannot claim new consensus/Player Values currency without a complete shared model',()=>{
 const refresh=readFileSync('nonblocking-consensus-v277.js','utf8');
 assert.match(refresh,/rebuilt=window\.modeledPlayerValuesV319\?\.refresh\?\.\(true\)===true/);
 assert.match(refresh,/return rebuilt&&window\.modeledPlayerValuesV319\?\.ready===true/);
 assert.match(refresh,/if\(!refreshDerivedValuation277\('consensus refresh'\)\)/);
 assert.match(refresh,/Canonical Player Values not ready after consensus refresh/);
});
