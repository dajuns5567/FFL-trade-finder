const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('trade-runtime-v256-compiled.js','utf8');
const document={__v131sel:false,addEventListener(){},querySelectorAll(){return[]},getElementById(){return null}};
const ctx={console,document,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},MutationObserver:function(){}};
ctx.window=ctx;ctx.state={players:{},teams:[],allAssets:[],assetsA:[],assetsB:[]};
ctx.tradeValueNormalizationV130={canonicalValue:x=>Number(x?.v)||0,install(){}};
ctx.playerRankValue=x=>({rank:Number(x?.rank)||9999});
ctx.playerName=x=>String(x?.name||x?.id||'');
ctx.groupPos=x=>x?.pos||'WR';
vm.createContext(ctx);vm.runInContext(src,ctx,{filename:'trade-runtime-v256-compiled.js'});
const fair=ctx.section1V130?.fair;assert.equal(typeof fair,'function');
const P=(name,v,rank,pos='WR')=>({type:'player',id:name,name,v,rank,pos});
const K=(id,v,year=2028)=>({type:'pick',id,v,round:1,season:year});
const maye=P('Maye',9143,4,'QB'),tuten=P('Tuten',4643,106,'RB'),btj=P('BTJ',4580,108),
  gibbs=P('Gibbs',9274,3,'RB'),caleb=P('Caleb',8753,7,'QB'),
  lamar=P('Lamar',8250,13,'QB'),jsn=P('JSN',9440,2,'WR'),
  dart=P('Dart',7258,28,'QB'),achane=P('Achane',7156,30,'RB');
const first29=K('2029-R1',2605,2029);
const cases=[
 {name:'Maye for Tuten + BTJ',a:[maye],b:[tuten,btj],expect:'uneven'},
 {name:'Gibbs for Caleb + 2029 first',a:[gibbs],b:[caleb,first29],expect:'peer-suppressed'},
 {name:'Maye for Lamar + 2029 first',a:[maye],b:[lamar,K('2029-Lamar-R1',3310,2029)],expect:'peer-suppressed'},
 {name:'JSN for Dart + Achane',a:[jsn],b:[dart,achane],expect:'multi-starter-suppressed'}
];
for(const c of cases){
 const result=fair(c.a,c.b),reverse=fair(c.b,c.a);
 assert.equal(result.score,reverse.score,c.name+' must be symmetric');
 assert.equal(Math.round(result.aAdj),Math.round(reverse.bAdj),c.name+' adjustment symmetry');
 assert.equal(Math.round(result.bAdj),Math.round(reverse.aAdj),c.name+' adjustment symmetry');
 assert.equal(result.aRaw,c.a.reduce((s,a)=>s+a.v,0),c.name+' raw A untouched');
 assert.equal(result.bRaw,c.b.reduce((s,a)=>s+a.v,0),c.name+' raw B untouched');
 assert.equal(ctx.tradeValueNormalizationV130.canonicalValue(c.a[0]),c.a[0].v,'canonical values untouched');
 if(c.expect==='uneven'){
   assert.ok(result.score<55,'Maye for two sub-110 assets must remain lopsided');
 }else if(c.expect==='peer-suppressed'){
   assert.ok(result.score<94,c.name+' cannot be an Excellent Fit solely on near-peer adjustment');
 }else{
   assert.ok(result.score<94,'two top-30 starters cannot receive automatic Excellent Fit');
 }
 console.log(c.name, JSON.stringify({rawA:result.aRaw,rawB:result.bRaw,adj:result.aAdj,score:result.score,status:result.status}));
}
// Preserve the established zero-adjustment one-for-one invariant.
assert.equal(fair([maye],[lamar]).aAdj,0);
assert.equal(fair([maye],[lamar]).bAdj,0);
// Adding useful depth to the counter-package must never make the adjusted
// imbalance worse for that counter-package in a one-vs-depth situation.
for(const premium of [maye,jsn]){
 let prior=fair([premium],[tuten]);
 for(let v=100;v<=2000;v+=100){
   const current=fair([premium],[tuten,K('extra'+v,v)]);
   assert.ok(current.aEffective-current.bEffective<=prior.aEffective-prior.bEffective+1e-6,
     'adding depth value must improve counter-package effective gap at '+v);
   prior=current;
 }
}
console.log('V322 peer counterpiece and multi-starter fairness regression passed');