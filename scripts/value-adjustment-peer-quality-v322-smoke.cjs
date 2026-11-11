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
// Verified live-audit cases that formerly finished inside 100 adjusted points.
// Test narrow pathological outcomes while deliberately preserving legitimate
// top-asset-vs-depth situations; no player-specific production exceptions.
const auditFixtures=[
 {name:'Maye versus Trey McBride and first',a:[maye],b:[P('McBride',7890,18,'TE'),K('2028-first',4275)],maxScore:93},
 {name:'Maye versus Trevor Lawrence and first',a:[maye],b:[P('Lawrence',7698,21,'QB'),K('2027-first',4825,2027)],maxScore:93},
 {name:'Burrow versus Herbert and LaPorta',a:[P('Burrow',8576,9,'QB')],b:[P('Herbert',6314,50,'QB'),P('LaPorta',6166,54,'TE')],maxScore:93},
 {name:'Allen versus Caleb and two IDPs',a:[P('Allen',9999,1,'QB')],b:[caleb,P('Humphrey',2246,259,'IDP'),P('Carter',2194,264,'IDP')],maxScore:93},
 {name:'Allen versus McBride and depth',a:[P('Allen',9999,1,'QB')],b:[P('McBride2',7890,18,'TE'),P('Shakir',3659,153),P('White',3163,184,'RB')],minScore:94}
];
for(const c of auditFixtures){
 const f=fair(c.a,c.b),reverse=fair(c.b,c.a);
 assert.equal(f.score,reverse.score,c.name+' symmetry');
 assert.equal(f.aRaw,c.a.reduce((sum,x)=>sum+x.v,0));
 assert.equal(f.bRaw,c.b.reduce((sum,x)=>sum+x.v,0));
 if(c.maxScore!=null)assert.ok(f.score<=c.maxScore,c.name+' must not be an automatic Excellent Fit: '+f.score);
 if(c.minScore!=null)assert.ok(f.score>=c.minScore,c.name+' established elite-vs-depth example must remain competitive: '+f.score);
 console.log('Original audit fixture:',c.name,'score',f.score,'adjustment',Math.round(f.aAdj+f.bAdj));
}
// The wide matrix's only formerly Excellent large-move exception: a single
// high-value IDP against a high QB plus a strong IDP. Under the exact supplied
// canonical values, the extra asset is a substantial overpay, not a fair peer.
const formerExcellent={
  a:[P('Elite synthetic IDP',9288,7,'IDP')],
  b:[P('High synthetic QB',7800,27,'QB'),P('Strong synthetic IDP',6588,54,'IDP')]
};
const correction=fair(formerExcellent.a,formerExcellent.b);
assert.ok(correction.score<82,'Formerly Excellent IDP-plus-QB overpay must no longer score Fair/Excellent: '+correction.score);
assert.ok(correction.aAdj<2000,'Near-peer counteroffer must not receive massive consolidation premium: '+correction.aAdj);
const imbalancedBoth={
  a:[P('High synthetic QB',7800,27,'QB'),P('Elite synthetic RB',9447,4,'RB')],
  b:[P('Bench synthetic RB',1047,401,'RB'),P('Elite synthetic QB',9500,3,'QB')]
};
const bothScore=fair(imbalancedBoth.a,imbalancedBoth.b);
assert.ok(bothScore.score<55,'Clearly imbalanced two-premium swap must not be negotiated as fair: '+bothScore.score);
assert.equal(fair(imbalancedBoth.b,imbalancedBoth.a).score,bothScore.score,'Two-premium case remains symmetric');
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