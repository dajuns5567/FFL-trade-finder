const fs=require('fs');const vm=require('vm');
let boxes=[box('a'),box('b'),box('c')],changeHandler=null,observerCb=null;
const elements=new Map();
function box(id){return{checked:false,_asset:{type:'player',id},classList:{contains:x=>x==='shopCheck'}}}
function makeEl(tag){const el={tagName:String(tag).toUpperCase(),style:{},dataset:{},children:[],textContent:'',className:'',type:'',_id:'',appendChild(c){this.children.push(c);return c},addEventListener(type,fn){this['on'+type]=fn},setAttribute(k,v){this[k]=v},remove(){if(this._id)elements.delete(this._id)}};Object.defineProperty(el,'id',{get(){return this._id},set(v){this._id=v;if(v)elements.set(v,this)}});return el}
const team=makeEl('select');team.id='findTeam';team.value='1';team.insertAdjacentElement=(_where,el)=>{if(el?.id)elements.set(el.id,el);return el};
const shop=makeEl('div');shop.id='findShop';
elements.set('findTeam',team);elements.set('findShop',shop);
global.window=global;
global.document={readyState:'complete',getElementById:id=>elements.get(id)||null,querySelectorAll:sel=>sel==='#findShop .shopCheck'?boxes:[],createElement:makeEl,addEventListener(type,fn){if(type==='change')changeHandler=fn}};
global.MutationObserver=class{constructor(cb){observerCb=cb}observe(){}};
global.setTimeout=fn=>{fn();return 0};
vm.runInThisContext(fs.readFileSync('trade-select-all-v165.js','utf8'),{filename:'trade-select-all-v165.js'});
const api=window.tradeSelectAllV165;if(!api)throw new Error('Select All API did not install');
api.selectAllBlankAlias();
if(!boxes.every(b=>b.checked))throw new Error('Select All did not check the current roster');
if(!api.aliasActive())throw new Error('Select All alias did not become active');
boxes=[box('a'),box('b'),box('c')];observerCb?.([]);
if(!boxes.every(b=>b.checked))throw new Error('Select All did not persist after roster DOM rerender');
boxes[1].checked=false;changeHandler?.({target:boxes[1]});
if(api.aliasActive())throw new Error('Manual uncheck did not cancel Select All persistence');
boxes=[box('a'),box('b'),box('c')];observerCb?.([]);
if(boxes.some(b=>b.checked))throw new Error('Cancelled Select All incorrectly re-applied after rerender');
api.selectAllBlankAlias();team.value='2';changeHandler?.({target:team});
if(api.aliasActive())throw new Error('Team change did not clear Select All persistence');
console.log('V260 Select All rerender persistence passed');
