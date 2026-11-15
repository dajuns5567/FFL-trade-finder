import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const helperSource=read('trade-add-assets-complement-v1.js');
const engines=[
 ['trade-specific-add-assets-v282.js','tradeSpecificAddAssetsV282','balanced','neutral'],
 ['trade-specific-max-tier-add-v300.js','tradeSpecificMaxTierAddV300','value','up'],
 ['trade-specific-tier-up-v282.js','tradeSpecificTierUpV282','balanced','up']
];
const key=xs=>xs.map(x=>x.type+':'+x.id).sort().join('|');
const positional=['QB','RB','WR','TE','IDP'];
function assets(){
 const chosen={type:'player',id:'selected',owner:1,position:'WR',rank:70,value:5200,name:'Selected starter'};
 const others=Array.from({length:30},(_,i)=>i%6===0
   ?{type:'pick',id:'pick-'+i,owner:1,season:2027+i%2,round:1+i%3,value:900+i*90,name:'Future pick '+i}
   :{type:'player',id:'extra-'+i,owner:1,position:positional[i%5],rank:75+i,value:450+i*150,name:'Complement '+i});
 const target={type:'player',id:'jonathan-taylor',owner:2,rank:8,value:7450,name:'Jonathan Taylor',position:'RB'};
 const recv=Array.from({length:16},(_,i)=>({type:'player',id:'recv-'+i,owner:2,rank:90+i,value:1100+i*160,name:'Recipient '+i,position:positional[i%5]}));
 return{chosen,others,target,recv};
}
function helper(){
 const sandbox={window:{},Map,Set,Array,Math,Number,String};
 vm.runInNewContext(helperSource,sandbox,{filename:'trade-add-assets-complement-v1.js'});
 return sandbox.window.tradeAddAssetsComplementV1;
}
const value=x=>Number(x.value)||0,position=x=>x.position||'PICK';

test('selected asset remains in every candidate; all shapes and complementary positions/picks are covered',()=>{
 const {chosen,others}=assets(),api=helper();
 const packages=api.build([chosen],[chosen,...others],value,position);
 const singles=packages.filter(xs=>xs.length===2),pairs=packages.filter(xs=>xs.length===3);
 assert.equal(packages[0].length,1);
 assert.ok(singles.length>=14&&singles.length<=18);
 assert.ok(pairs.length>=55&&pairs.length<=64);
 assert.ok(packages.every(xs=>xs.includes(chosen)&&xs.length<=3));
 assert.equal(new Set(packages.map(key)).size,packages.length,'do not fabricate duplicate outgoing packages');
 const allExtras=packages.flatMap(xs=>xs.filter(x=>x!==chosen));
 const families=new Set(allExtras.map(x=>x.type==='pick'?'PICK':x.position));
 assert.ok(families.has('PICK')&&families.has('RB')&&families.has('IDP')&&families.has('QB'),'mix players and draft picks instead of only high-value individuals');
 const pairSignatures=new Set(pairs.map(xs=>xs.slice(1).map(x=>x.type==='pick'?'PICK':x.position).sort().join('+')));
 assert.ok(pairSignatures.size>=7,'include complementary position and player/pick pair structures');
});
test('two selected pieces allow only one additional asset and three selected pieces never expand',()=>{
 const {chosen,others}=assets(),api=helper(),two=[chosen,others[1]],three=[chosen,others[1],others[2]];
 const result=api.build(two,[chosen,...others],value,position);
 assert.ok(result.length>7&&result.every(xs=>xs.length===2||xs.length===3));
 assert.ok(result.every(xs=>two.every(a=>xs.includes(a))));
 const full=api.build(three,[chosen,...others],value,position);
 assert.equal(full.length,1);
 assert.equal(key(full[0]),key(three));
});
test('result mixing gives multi-piece complements visible space without inventing eligibility or altering fairness',()=>{
 const {chosen,others}=assets(),api=helper(),packages=api.build([chosen],[chosen,...others],value,position);
 const ranked=[];
 for(const xs of packages.filter(xs=>xs.length===1||xs.length===2))for(let i=0;i<5;i++)
  ranked.push({give:xs,recv:[{id:'target',type:'player'}],f:{score:82,edgeEffective:200},tag:i});
 for(const xs of packages.filter(xs=>xs.length===3))ranked.push({give:xs,recv:[{id:'target',type:'player'}],f:{score:80,edgeEffective:100}});
 const before=new Map(ranked.map(r=>[r,r.f]));
 const diversified=api.diversify(ranked,[chosen],36);
 assert.equal(diversified[0].give.length,1,'retain an exact selected-assets recommendation when eligible');
 const first=diversified.slice(0,12),twoAdded=first.filter(r=>r.give.length===3);
 assert.ok(twoAdded.length>=3,'real qualifying two-piece complements must appear near the top');
 assert.ok(first.filter(r=>r.give.length===2).length>=3,'do not eliminate useful single complementary pieces');
 assert.ok(new Set(first.flatMap(r=>r.give.slice(1).map(a=>a.id))).size>=7,'do not repeatedly offer the same one extra asset');
 assert.ok(diversified.every(r=>before.get(r)===r.f),'do not recompute or alter the canonical fairness evidence');
 assert.ok(diversified.every(r=>r.give.includes(chosen)),'never substitute or remove the user-selected asset');
 const impossible={give:[others[1],others[2]],f:{score:99}};
 assert.ok(!api.diversify([impossible], [chosen]).length,'never invent packages that omit a required selection');
});
function loadedEngine([file,exportName,mode,tier],{selectAll=false}={}){
 const {chosen,others,target,recv}=assets(),all=[chosen,...others,target,...recv],seen=[];
 const controls={
  findTeam:{value:'1'},desiredPlayerSearch:{value:'Jonathan Taylor'},findMode:{value:mode},
  tradeTier94:{value:tier},tradeAssist97:{checked:true},finderResults:{innerHTML:'',appendChild(){}}
 };
 const document={getElementById:x=>controls[x]||null,
  querySelectorAll:q=>q.includes('.shopCheck:checked')?[{_asset:chosen,checked:true}]:[],
  addEventListener(){},createElement:()=>({style:{},appendChild(){}})};
 const win={state:{allAssets:all,players:{},teams:[{id:1,name:'Source'},{id:2,name:'Target'}]},
  tradeValueNormalizationV139:{canonicalValue:value},tradeValueNormalizationV130:{canonicalValue:value},
  tradeSelectAllV165:{aliasActive:()=>selectAll},
  groupPos:x=>x.position||'IDP',playerName:id=>all.find(x=>x.id===id)?.name||id,
  playerRankValue:x=>({rank:x.rank||9999}),teamName:id=>'Team '+id,
  section1V130:{fair:(give,receive)=>{
   seen.push(give);
   const sum=xs=>xs.reduce((a,x)=>a+value(x),0);
   return{score:82,rejected:false,edgeEffective:200,edgeRaw:100,aRaw:sum(give),bRaw:sum(receive),aAdj:0,bAdj:0,aEffective:sum(give),bEffective:sum(receive)+200};
  }}
 };
 const ctx={window:win,document,Map,Set,Array,Math,Number,String,Date,Promise,console,setTimeout};
 vm.runInNewContext(helperSource,ctx);
 vm.runInNewContext(read(file),ctx,{filename:file});
 return {engine:win[exportName],seen,controls,chosen,win};
}
for(const engine of engines){
 test('real '+engine[0]+' add-assets routing evaluates single and paired complementary outgoing pieces',async()=>{
  const f=loadedEngine(engine);
  assert.equal(f.engine.active(),true);
  await Promise.race([f.engine.run(),new Promise((_,fail)=>setTimeout(()=>fail(Error('targeted add-assets engine stalled: '+engine[0])),12000))]);
  assert.ok(f.seen.some(xs=>xs.length===2),engine[0]+' never evaluated a one-piece addition');
  assert.ok(f.seen.some(xs=>xs.length===3),engine[0]+' never evaluated complementary two-piece additions');
  assert.ok(new Set(f.seen.flatMap(xs=>xs.slice(1).map(x=>x.id))).size>=8);
  assert.ok(f.seen.every(xs=>xs.includes(f.chosen)&&xs.length<=3));
  assert.doesNotMatch(f.controls.finderResults.innerHTML,/Searching realistic trades|Searching maximum-value|Searching Tier Up/);
 });
 test('select-all aliases are not treated as an oversized manual selection by '+engine[0],()=>{
  const f=loadedEngine(engine,{selectAll:true});
  assert.equal(f.engine.active(),false);
 });
}
test('all Finder pathways use the shared complementary generator without touching player valuations',()=>{
 for(const path of [
  'trade-specific-max-value-v279.js',
  'trade-specific-player-v232.js',
  'trade-finder-v256-compiled.js',
  ...engines.map(x=>x[0])]){
  const src=read(path);
  assert.match(src,/tradeAddAssetsComplementV1/,'missing common source-backed complement path: '+path);
  assert.match(src,/section1V130\?\.fair|const fair=\(a,b\)=>window\.section1V130/,'existing fairness source absent: '+path);
 }
 const html=read('netlify/functions/site-v29.mjs');
 assert.match(html,/trade-add-assets-complement-v1\.js\?v=2/);
 assert.ok(html.indexOf('trade-add-assets-complement-v1.js')<html.indexOf('trade-specific-max-tier-add-v300.js'),'load complement module before capture routers');
});
