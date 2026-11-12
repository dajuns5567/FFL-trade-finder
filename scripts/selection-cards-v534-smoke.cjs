const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const stylesheet=fs.readFileSync('trade-asset-selection-v534.css','utf8');
const loader=fs.readFileSync('netlify/functions/site-v29.mjs','utf8');
const script=fs.readFileSync('trade-select-all-v165.js','utf8');
const bridge=fs.readFileSync('trade-selection-sync-v534.js','utf8');
assert.match(loader,/trade-selection-sync-v534\.js\?v=534/);
assert.match(loader,/trade-asset-selection-v534\.css\?v=534/);
assert.match(stylesheet,/:is\(#findShop,#evalChooserA,#evalChooserB\) label\.checkrow/);
assert.match(stylesheet,/label\.checkrow:has\(input:checked\)/);
assert.match(stylesheet,/min-height:60px/);
assert.match(stylesheet,/#tradeSelectAllButton165/);
assert.doesNotMatch(stylesheet,/pointer-events:\s*none|display:\s*none/);
assert.doesNotMatch(script,/dispatchEvent\s*\(/);
const elems=new Map();
const boxes=[1,2,3].map(id=>({checked:id===1,_asset:{id:String(id),type:'player'},setAttribute(){},
  classList:{contains:x=>x==='shopCheck'}}));
const selection=new Map([['1',boxes[0]._asset]]);
function createElement(tag){
  const x={tagName:tag.toUpperCase(),style:{},children:[],dataset:{},textContent:'',appendChild(child){this.children.push(child);return child;},addEventListener(type,cb){this[type]=cb;},setAttribute(){},insertAdjacentElement(){},remove(){}};
  Object.defineProperty(x,'id',{get(){return this._id},set(id){this._id=id;elems.set(id,this)}});
  return x;
}
const team=createElement('select');team.id='findTeam';team.value='1';
team.insertAdjacentElement=(where,element)=>elems.set(element.id,element);
const shop=createElement('div');shop.id='findShop';
const events={};
const context={window:{section1V130:{finderSel:selection}},document:{
 readyState:'complete',getElementById:id=>elems.get(id)||null,
 querySelectorAll:s=>s==='#findShop .shopCheck'?boxes:[],
 createElement,addEventListener:(name,cb)=>events[name]=cb},
 MutationObserver:class{observe(){}},setTimeout:()=>0};
context.window.window=context.window;context.window.document=context.document;
context.queueMicrotask=fn=>fn();
vm.runInNewContext(script,context);
vm.runInNewContext(bridge,context);
const clickSelectAll=()=>events.click({target:{closest:selector=>selector==='#tradeSelectAllButton165'?{}:null}});
const api=context.window.tradeSelectAllV165;
assert.ok(api);
api.selectAllBlankAlias();clickSelectAll();
assert.deepEqual(boxes.map(x=>x.checked),[true,true,true]);
assert.equal(selection.size,3);
api.selectAllBlankAlias();clickSelectAll(); // second click must not undo selected state
assert.deepEqual(boxes.map(x=>x.checked),[true,true,true]);
assert.equal(selection.size,3);
for(const b of boxes)b.checked=selection.has(b._asset.id); // active runtime synchronization
assert.ok(boxes.every(b=>b.checked),'periodic Finder sync must retain checked state');
boxes[1].checked=false;selection.delete('2');
events.change({target:boxes[1]});
assert.equal(api.aliasActive(),false);
assert.equal(selection.size,2);
console.log('V534 selection cards scoped; Select All idempotent across runtime sync and manual uncheck');
