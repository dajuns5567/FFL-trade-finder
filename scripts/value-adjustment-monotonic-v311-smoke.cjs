const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('trade-runtime-v256-compiled.js','utf8');
const document={__v131sel:false,addEventListener(){},querySelectorAll(){return[]},getElementById(){return null}};
const ctx={console,document,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},MutationObserver:function(){}};
ctx.window=ctx;
ctx.state={players:{},teams:[],allAssets:[],assetsA:[],assetsB:[]};
ctx.tradeValueNormalizationV130={canonicalValue:x=>Number(x?.v)||0,install(){}};
ctx.playerRankValue=x=>({rank:Number(x?.rank)||9999});
ctx.playerName=x=>String(x?.name||x?.id||'');
ctx.groupPos=x=>x?.pos||'WR';
vm.createContext(ctx);vm.runInContext(src,ctx,{filename:'trade-runtime-v256-compiled.js'});
const fair=ctx.section1V130?.fair;if(typeof fair!=='function')throw new Error('shared fair() unavailable');
const P=(id,v,rank=100)=>({type:'player',id,v,rank,pos:'WR'}),K=(id,v)=>({type:'pick',id,v,round:3,season:2029});
function assert(x,m){if(!x)throw new Error(m)}
function deficit(f){return f.aEffective-f.bEffective}
const wilson=P('wilson',6210,53),mclaurin=P('mclaurin',5510,74),r3=K('r3',385);
const one=fair([wilson],[mclaurin]),plus=fair([wilson],[mclaurin,r3]);
assert(one.aAdj===0&&one.bAdj===0,'1-for-1 must retain zero consolidation adjustment');
assert(plus.aAdj>0&&plus.aAdj<=385*.55+1e-9,'added R3 adjustment must be bounded by added depth value');
assert(deficit(plus)<deficit(one),'adding positive value to weaker package must reduce effective deficit');
assert(plus.score>one.score,'Wilson for McLaurin + R3 must score more favorably than Wilson for McLaurin');
let prev=one;
for(let v=25;v<=700;v+=25){const f=fair([wilson],[mclaurin,K('x'+v,v)]);assert(deficit(f)<=deficit(prev)+1e-9,'effective deficit worsened at added value '+v);prev=f}
const elite=P('elite',9000,5),counter=P('counter',4000,160);
const stack=[counter,K('a',1000),K('b',1000),K('c',1000),K('d',1000)];
const sf=fair([elite],stack);
assert(sf.aAdj>0,'premium-for-depth must retain a meaningful consolidation adjustment');
assert(sf.aAdj<=4000*.55+1e-9,'premium-for-depth adjustment must remain depth-bounded');
const ab=fair([elite],stack),ba=fair(stack,[elite]);
assert(ab.score===ba.score,'fairness score must remain symmetric');
assert(Math.abs(ab.aAdj-ba.bAdj)<1e-9&&Math.abs(ab.bAdj-ba.aAdj)<1e-9,'adjustment must swap symmetrically');
for(const p of ['trade-specific-player-v232.js','trade-specific-add-assets-v282.js','trade-specific-max-value-v279.js','trade-specific-tier-up-v282.js','trade-specific-max-tier-add-v300.js']){const s=fs.readFileSync(p,'utf8');assert(s.includes('section1V130?.fair?.'),'pipeline '+p+' no longer delegates to shared fair()')}
console.log('V311 Value Adjustment monotonicity and shared-pipeline smoke passed');