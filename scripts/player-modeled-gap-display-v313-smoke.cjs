const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('player-modeled-gap-display-v313.js','utf8');
const vals=[2206,1817,1763,1717,1692,1625,1592,1560,1532,1510,1498,1480,1462,1445,1430,1418,1405,1394,1385,1377,1368,1361,1355,1348,1342,1337,1332,1328,1324,1320,1316,1312,1308,1304,1300,1296,1292,1288,1284,1280,1276,1272,1268,1264,1260,1256,1252,1248,1244,1240,1236,1232,1228,1224,1220,1216,1212,1208,1204,1200,1196,1192,1188,1184,1180,1176,1172,1168,1164,1160,1156,1152,1148,1144,1140,1136,1132,1128,1124,1120,1116,1112,1108,1104,1100,1096,1092,1088,1084,1080,1076,1072,1068,1064,1060,1056,1052,1048,1044,1040,1036,1032,1028,1024,1020,1016,1012,1008,1004,1000,996,992,988,984,980,976,972,968,964,960,956,952,948,944,940,936,932,928,924,920,916,912,908,904,900,896,892,888,884,880,876,872,868,864,860,856,852,848,844,840,836,832,828,824,820,816,812,808,804,800,796,792,788,784,780,776,772,768,764,760,756,752,748,744,740,736,732,728,724,720,716,712,708,704,700,696,692,688,684,680,676,672,668,664,660,656,652,648,644,640,636,632,628,624,620,616,612,608,604,600,596,592,588,584,580,576,572,568,564,560,556,552,548,544,540,536,532,528,524,520,516,512,508,504,500,496,492,488,484,480,476,472,468,464,460,456,452,448,444,440,436,432,428,424,420,416,412,408,404,400];
const master=vals.map((v,i)=>({x:{type:'player',id:String(i+1)},value:v}));
function legacyValue(rank,maxRank=907){
 const MIN=120,MAX=9999,PLAYER_BREAK=325,PLAYER_BREAK_VALUE=1825;
 const clamp=(a,x,b)=>Math.max(a,Math.min(x,b)),round5=n=>Math.round(Number(n||0)/5)*5;
 const r=clamp(1,Number(rank)||1,maxRank);
 if(r===1)return MAX;
 if(r<=PLAYER_BREAK){const t=(r-1)/(PLAYER_BREAK-1);return round5(PLAYER_BREAK_VALUE+(MAX-PLAYER_BREAK_VALUE)*Math.pow(Math.max(0,1-Math.pow(t,.56)),1.4));}
 const span=Math.max(1,maxRank-PLAYER_BREAK),t=(r-PLAYER_BREAK)/span;
 return round5(clamp(MIN,MIN+(PLAYER_BREAK_VALUE-MIN)*Math.pow(Math.max(0,1-Math.pow(t,.7)),1.5),PLAYER_BREAK_VALUE));
}
const doc={readyState:'loading',addEventListener(){},getElementById(){return null},querySelectorAll(){return[]},documentElement:{}};
const ctx={console,document:doc,MutationObserver:function(){this.disconnect=()=>{};this.observe=()=>{}},queueMicrotask:fn=>fn(),setTimeout:fn=>fn()};
ctx.window=ctx;ctx.ensureMaster=()=>master;ctx.tradeValueNormalizationV139={playerValueForRank:legacyValue,canonicalValue:a=>legacyValue(Number(a.id)||1,907)};ctx.tradeValueNormalizationV130=ctx.tradeValueNormalizationV139;ctx.state={allAssets:master.map(z=>z.x)};ctx.playerName=id=>id;
vm.createContext(ctx);vm.runInContext(src,ctx,{filename:'player-modeled-gap-display-v313.js'});
const api=ctx.playerModeledGapDisplayV313;if(!api)throw new Error('V313 API missing');
const values=master.map(z=>api.value(z.x));
if(values[0]!==9999)throw new Error('top player must remain 9999');
for(let i=1;i<values.length;i++)if(values[i]>values[i-1])throw new Error('display order inversion at '+(i+1));
for(const end of [12,24,48,80,120,180,260].filter(x=>x<=values.length)){const expected=legacyValue(end,907);if(Math.abs(values[end-1]-expected)>1)throw new Error('band endpoint drift at '+end+': '+values[end-1]+' vs '+expected)}
if(values[1]===9555)throw new Error('rank #2 remains fixed to legacy slot');
const topGap=values[0]-values[1],legacyTopGap=legacyValue(1)-legacyValue(2);
if(topGap>legacyTopGap*1.45)throw new Error('top gap expanded too far');
const midSpan=values[41]-values[48],legacyMid=legacyValue(42)-legacyValue(49);
if(midSpan<legacyMid*.6)throw new Error('middle market consolidated too much');
const cBefore=ctx.tradeValueNormalizationV130.canonicalValue({type:'player',id:'2'});
api.value({type:'player',id:'2'});
const cAfter=ctx.tradeValueNormalizationV130.canonicalValue({type:'player',id:'2'});
if(cBefore!==cAfter)throw new Error('canonical trade value changed during Phase 1');
console.log('V313 bounded modeled-gap presentation smoke passed');
