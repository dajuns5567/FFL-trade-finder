const fs=require('fs'),vm=require('vm');
let calls=0,clickHandler=null;
const values=new Map([['a',1234.5],['b',987.25]]);
global.window=global;
window.state={players:{}};
window.tradeValueNormalizationV130={canonicalValue(x){calls++;return values.get(String(x?.id))||0}};
window.section1V130={fair(){return{score:90,rejected:false}}};
window.groupPos=()=> 'WR';
const controls={finderResults:{textContent:'Searching realistic trades…'},findMode:{value:'balanced'},desiredPlayerSearch:{value:''}};
global.document={
  getElementById:id=>controls[id]||null,
  querySelectorAll:()=>[],
  addEventListener(){},
};
window.addEventListener=(type,fn)=>{if(type==='click')clickHandler=fn};
global.MutationObserver=class{constructor(cb){this.cb=cb}observe(){}disconnect(){}};
const realSetTimeout=global.setTimeout;global.setTimeout=(fn,ms)=>ms>=90000?0:realSetTimeout(fn,ms);
vm.runInThisContext(fs.readFileSync('trade-finder-candidate-guard-v223.js','utf8'),{filename:'trade-finder-candidate-guard-v223.js'});
const api=window.tradeFinderCandidateGuardV223;if(!api)throw new Error('candidate guard did not install');
const norm=window.tradeValueNormalizationV130,a={type:'player',id:'a'},b={type:'player',id:'b'};
const original=norm.canonicalValue;
api.activate();
for(let i=0;i<100;i++)if(norm.canonicalValue(a)!==1234.5)throw new Error('memo changed canonical value');
for(let i=0;i<50;i++)if(norm.canonicalValue(b)!==987.25)throw new Error('memo changed second canonical value');
if(calls!==2)throw new Error(`expected exactly 2 underlying value calls during one run, got ${calls}`);
api.deactivate();
if(norm.canonicalValue!==original)throw new Error('deactivate did not restore exact canonicalValue function');
if(norm.canonicalValue(a)!==1234.5||calls!==3)throw new Error('post-run value did not use live underlying function');
values.set('a',1300.75);
api.activate();
if(norm.canonicalValue(a)!==1300.75)throw new Error('new run reused stale prior-run value');
if(calls!==4)throw new Error(`new run did not rebuild value memo; calls=${calls}`);
api.deactivate();
if(norm.canonicalValue(a)!==1300.75||calls!==5)throw new Error('fresh live value not preserved after second run');
console.log('V263 per-run value memo passed: exact within-run reuse, full restoration, fresh next-run values');
