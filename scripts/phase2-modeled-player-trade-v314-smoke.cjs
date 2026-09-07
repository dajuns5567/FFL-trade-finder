const fs=require('fs'),vm=require('vm');

function assert(x,m){if(!x)throw new Error(m)}

const modeled=[2206,1817,1763,1717,1692,1625,1592,1560,1532,1510,1498,1480,1462,1445,1430,1418,1405,1394,1385,1377,1368,1361,1355,1348,1342,1337,1332,1328,1324,1320,1316,1312,1308,1304,1300,1296,1292,1288,1284,1280,1276,1272,1268,1264,1260,1256,1252,1248,1244,1240,1236,1232,1228,1224,1220,1216,1212,1208,1204,1200,1196,1192,1188,1184,1180,1176,1172,1168,1164,1160,1156,1152,1148,1144,1140,1136,1132,1128,1124,1120];
const players=modeled.map((value,i)=>({x:{type:'player',id:'p'+(i+1),owner:i<20?1:2},value}));
const rankMap=new Map(players.map((z,i)=>[z.x.id,i+1]));
const allAssets=players.map(z=>z.x).concat([
 {type:'pick',id:'pick1',owner:1,season:2027,round:1,original_owner:1},
 {type:'pick',id:'pick2',owner:2,season:2027,round:2,original_owner:2}
]);
const doc={__v131sel:false,readyState:'complete',addEventListener(){},querySelectorAll(){return[]},querySelector(){return null},getElementById(){return null},documentElement:{},createElement(){return{style:{},appendChild(){},querySelectorAll(){return[]}}}};
const ctx={console,document:doc,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},MutationObserver:function(){this.disconnect=()=>{};this.observe=()=>{}},queueMicrotask:fn=>fn()};
ctx.window=ctx;
ctx.state={players:Object.fromEntries(players.map(z=>[z.x.id,{team:'T'}])),teams:[{id:1},{id:2}],allAssets,assetsA:[],assetsB:[]};
ctx.baseValue=x=>x.type==='pick'?1000:1;
ctx.packageValue=xs=>xs.reduce((s,x)=>s+ctx.baseValue(x),0);
ctx.pickValue=x=>x.id==='pick1'?4200:1200;
ctx.draftPickProjection86=x=>({value:x.id==='pick1'?4200:1200,projectedSlot:1,originalTeam:'A',currentOwnerTeam:'A'});
ctx.playerRankValue=x=>({rank:rankMap.get(x.id)||9999,value:players.find(z=>z.x.id===x.id)?.value||1});
ctx.ensureMaster=()=>players;
ctx.playerName=id=>id;
ctx.groupPos=x=>x.type==='pick'?'PICK':'WR';
ctx.teamName=id=>'Team '+id;
ctx.teamContextTradeFit90=()=>0;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('trade-value-normalization-v139.js','utf8'),ctx,{filename:'trade-value-normalization-v139.js'});
const norm=ctx.tradeValueNormalizationV130;
assert(norm&&typeof norm.canonicalValue==='function','normalization API missing');
const p1=players[0].x,p2=players[1].x,p42=players[41].x;
assert(norm.canonicalValue(p1)===9999,'top canonical player must be 9999');
assert(norm.canonicalValue(p2)!==norm.playerValueForRank(2,907),'#2 canonical player must not be fixed legacy rank slot');
assert(norm.canonicalValue(p42)>0,'mid-market modeled canonical value missing');
assert(norm.canonicalValue({type:'pick',id:'pick1',season:2027,round:1,original_owner:1})===7000,'nearest elite first pick anchor must remain 7000');
const pick2Before=norm.canonicalValue({type:'pick',id:'pick2',season:2027,round:2,original_owner:2});

vm.runInContext(fs.readFileSync('trade-runtime-v256-compiled.js','utf8'),ctx,{filename:'trade-runtime-v256-compiled.js'});
const fair=ctx.section1V130?.fair;
assert(typeof fair==='function','shared Finder/Evaluator fair() unavailable after V314 normalization');
const f=fair([p2],[p42]);
assert(f.aRaw===norm.canonicalValue(p2),'shared fairness did not use V314 canonical player value on side A');
assert(f.bRaw===norm.canonicalValue(p42),'shared fairness did not use V314 canonical player value on side B');
assert(Number.isFinite(f.score)&&f.score>=1&&f.score<=100,'shared fairness score invalid');

vm.runInContext(fs.readFileSync('player-modeled-gap-display-v313.js','utf8'),ctx,{filename:'player-modeled-gap-display-v313.js'});
const display=ctx.playerModeledGapDisplayV313;
assert(display&&display.value(p2)===norm.canonicalValue(p2),'display and trade player currency diverged');
assert(norm.canonicalValue({type:'pick',id:'pick2',season:2027,round:2,original_owner:2})===pick2Before,'pick currency changed during player Phase 2');

const finderSrc=fs.readFileSync('trade-finder-v256-compiled.js','utf8');
assert(/canonicalValue\?\.\(x\)/.test(finderSrc)||/canonicalValue/.test(finderSrc),'Finder no longer consumes canonicalValue');
const runtimeSrc=fs.readFileSync('trade-runtime-v256-compiled.js','utf8');
assert(/function evaluate\(\).*f=fair\(give,recv\)/s.test(runtimeSrc),'Evaluator no longer delegates to shared fair()');
for(const p of ['trade-specific-player-v232.js','trade-specific-add-assets-v282.js','trade-specific-max-value-v279.js','trade-specific-tier-up-v282.js','trade-specific-max-tier-add-v300.js']){
 const s=fs.readFileSync(p,'utf8');assert(s.includes('section1V130?.fair?.'),'specific Finder pipeline '+p+' no longer delegates to shared fair()');
}
console.log('V314 Phase 2 canonical player currency Finder/Evaluator integration smoke passed');
