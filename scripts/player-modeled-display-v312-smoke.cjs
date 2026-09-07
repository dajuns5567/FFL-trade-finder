const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('player-modeled-display-v312.js','utf8');
const master=[
 {x:{type:'player',id:'a'},value:2206},
 {x:{type:'player',id:'b'},value:1817},
 {x:{type:'player',id:'c'},value:1717},
 {x:{type:'player',id:'d'},value:10}
];
const doc={readyState:'loading',addEventListener(){},getElementById(){return null},querySelectorAll(){return[]},documentElement:{}};
const ctx={console,document:doc,MutationObserver:function(){this.disconnect=()=>{};this.observe=()=>{}},queueMicrotask:fn=>fn(),setTimeout:fn=>fn()};
ctx.window=ctx;ctx.ensureMaster=()=>master;ctx.playerRankValue=x=>({rank:x.id==='a'?1:x.id==='b'?2:3,value:master.find(z=>z.x.id===x.id)?.value||1});
ctx.state={allAssets:master.map(z=>z.x)};ctx.playerName=id=>id;
ctx.tradeValueNormalizationV130={canonicalValue:x=>({a:9999,b:9555,c:9345,d:120}[x.id]||0)};
vm.createContext(ctx);vm.runInContext(src,ctx,{filename:'player-modeled-display-v312.js'});
const api=ctx.playerModeledDisplayV312;if(!api)throw new Error('presentation API missing');
const A={type:'player',id:'a'},B={type:'player',id:'b'},C={type:'player',id:'c'},D={type:'player',id:'d'};
const va=api.value(A),vb=api.value(B),vc=api.value(C),vd=api.value(D);
if(va!==9999)throw new Error('top modeled player must anchor at 9999');
if(vd!==120)throw new Error('display floor must remain 120');
if(!(va>vb&&vb>vc&&vc>vd))throw new Error('modeled ordering must be preserved');
const expectedB=Math.round(1817/2206*9999),expectedC=Math.round(1717/2206*9999);
if(vb!==expectedB||vc!==expectedC)throw new Error('display values must preserve modeled proportionality');
if(vb===9555)throw new Error('rank #2 must not be forced to legacy fixed rank value');
if(ctx.tradeValueNormalizationV130.canonicalValue(B)!==9555)throw new Error('Phase 1 must not alter canonical trade value');
if(ctx.playerRankValue(B).rank!==2)throw new Error('Phase 1 must not alter player rank');
if(api.modeledValue(B)!==1817)throw new Error('display source must be final modeled player value');
console.log('V312 modeled player Value presentation isolation smoke passed');
