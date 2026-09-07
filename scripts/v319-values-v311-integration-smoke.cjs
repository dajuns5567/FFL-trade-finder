const fs=require('fs'),vm=require('vm');
function assert(x,m){if(!x)throw new Error(m)}
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const players=[];
for(let i=1;i<=32;i++)players.push({type:'player',id:String(i),owner:i<=16?1:2,rank:i,pos:i%4===0?'QB':i%4===1?'RB':i%4===2?'WR':'TE'});
const picks=[
 {type:'pick',id:'pick-2027-1-1',owner:1,original_owner:1,season:2027,round:1},
 {type:'pick',id:'pick-2027-1-2',owner:2,original_owner:2,season:2027,round:1}
];
const modeled=[2206,1817,1763,1717,1692,1625,1592,1560,1532,1510,1498,1480,1462,1445,1430,1418,1405,1394,1385,1377,1368,1361,1355,1348,1342,1337,1332,1328,1324,1320,1316,1312];
let master=players.map((x,i)=>({x,value:modeled[i]}));
let ensureCalls=0;
const boxA={checked:true,_asset:players[0]},boxB={checked:false,_asset:players[1]};
const elements={
 findTeam:{value:'1'},findMode:{value:'balanced'},tradeTier94:{value:'neutral'},findPos:{value:'ANY'},
 finderResults:{innerHTML:'',textContent:'',querySelectorAll(){return[]},appendChild(){}},
 findShop:{querySelectorAll(){return[]}},
 evalA:{value:'1'},evalB:{value:'2'},evalResults:{innerHTML:'',querySelectorAll(){return[]}},
 evalChooserA:{querySelectorAll(){return[]}},evalChooserB:{querySelectorAll(){return[]}},
 updateStatus:{textContent:'ready'},runFinder:{onclick:null},evaluate:{onclick:null}
};
const document={
 readyState:'complete',documentElement:{},body:{},
 getElementById:id=>elements[id]||null,
 querySelector(sel){return sel.includes('findPos')?elements.findPos:null},
 querySelectorAll(sel){
   if(sel.includes('#findShop .shopCheck')||sel==='.shopCheck')return[boxA,boxB];
   if(sel.includes('trade97-pos')||sel.includes('draftYear106')||sel.includes('draftRound106'))return[];
   if(sel.includes('#rankings'))return[];
   return[];
 },
 addEventListener(){},
 createElement(){return{style:{},appendChild(){},querySelectorAll(){return[]}}},
};
const ctx={
 console,document,queueMicrotask:fn=>fn(),alert(){},
 MutationObserver:function(){this.observe=()=>{};this.disconnect=()=>{}},
 setTimeout(fn){fn();return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},
};
ctx.window=ctx;
ctx.state={
 league:{scoring_settings:{bonus_rec_te:1}},
 players:Object.fromEntries(players.map(p=>[p.id,{team:'NFL',fantasy_positions:[p.pos]}])),
 teams:[{id:1},{id:2}],allAssets:[...players,...picks],assetsA:[],assetsB:[]
};
ctx.playerRankValue=a=>({rank:Number(a?.rank||a?.id)||9999});
ctx.playerName=id=>'P'+id;
ctx.groupPos=a=>a?.pos||'WR';
ctx.teamName=id=>'Team '+id;
ctx.ensureMaster=()=>{ensureCalls++;return master};
ctx.baseValue=a=>a?.type==='player'?5000:0;
ctx.packageValue=xs=>(xs||[]).reduce((s,a)=>s+ctx.baseValue(a),0);
ctx.pickValue=a=>a?.type==='pick'?(a.owner===1?7000:6500):0;
ctx.draftPickProjection92=a=>a?.type==='pick'?{value:a.owner===1?7000:6500,projectedSlot:16}:null;
vm.createContext(ctx);
for(const path of ['trade-value-normalization-v139.js','trade-te-scoring-adjustment-v259.js']){
 vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
}
const pickBefore=ctx.tradeValueNormalizationV130.canonicalValue(picks[0]);
vm.runInContext(fs.readFileSync('modeled-player-values-v319.js','utf8'),ctx,{filename:'modeled-player-values-v319.js'});
const api=ctx.modeledPlayerValuesV319,norm=ctx.tradeValueNormalizationV130;
assert(api?.ready,'V319 modeled player adapter did not become ready');
assert(api.meta.count===players.length,'V319 modeled map count mismatch');
assert(norm.canonicalValue(picks[0])===pickBefore,'V319 changed draft-pick value');

function legacy(rank,maxRank=907){
 const MIN=120,MAX=9999,PLAYER_BREAK=325,PLAYER_BREAK_VALUE=1825,round5=n=>Math.round(Number(n||0)/5)*5;
 const r=clamp(1,Number(rank)||1,maxRank);
 if(r===1)return MAX;
 if(r<=PLAYER_BREAK){const t=(r-1)/(PLAYER_BREAK-1);return round5(PLAYER_BREAK_VALUE+(MAX-PLAYER_BREAK_VALUE)*Math.pow(Math.max(0,1-Math.pow(t,.56)),1.4))}
 const span=Math.max(1,maxRank-PLAYER_BREAK),t=(r-PLAYER_BREAK)/span;
 return round5(clamp(MIN,MIN+(PLAYER_BREAK_VALUE-MIN)*Math.pow(Math.max(0,1-Math.pow(t,.7)),1.5),PLAYER_BREAK_VALUE));
}
function median(xs){const a=xs.filter(x=>Number.isFinite(x)&&x>0).slice().sort((a,b)=>a-b);if(!a.length)return 1;const m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2}
function expected(){
 const MIN=120,MAX=9999,B=[12,24,48,80,120,180,260],BL=.28,LO=.45,HI=2.25;
 const arr=master,n=arr.length,maxRank=Math.max(907,n),vals=arr.map(z=>Number(z.value)||0),ends=[...B.filter(x=>x<n),n],out=new Map();
 let start=1;
 for(const end of ends){
  const s=start,e=end,sv=legacy(s,maxRank),ev=legacy(e,maxRank);
  if(s===e){out.set(String(arr[s-1].x.id),Math.round(clamp(MIN,sv,MAX)));start=e+1;continue}
  const mg=[],bg=[];
  for(let r=s;r<e;r++){mg.push(Math.max(0,vals[r-1]-vals[r]));bg.push(Math.max(.0001,legacy(r,maxRank)-legacy(r+1,maxRank)))}
  const med=median(mg),w=bg.map((g,i)=>g*((1-BL)+BL*clamp(LO,mg[i]/Math.max(med,.0001),HI))),tot=w.reduce((a,b)=>a+b,0)||1,span=Math.max(0,sv-ev);
  let cur=sv;out.set(String(arr[s-1].x.id),Math.round(clamp(MIN,cur,MAX)));
  for(let i=0;i<w.length;i++){cur-=span*(w[i]/tot);const rank=s+i+1;let v=Math.round(clamp(MIN,cur,MAX));if(rank===e)v=Math.round(clamp(MIN,ev,MAX));out.set(String(arr[rank-1].x.id),v)}
  start=e+1;
 }
 out.set(String(arr[0].x.id),MAX);return out;
}
const exp=expected();
let prev=Infinity;
for(const p of players){
 const got=norm.canonicalValue(p),want=exp.get(p.id);
 assert(got===want,'modeled value drift at rank '+p.rank+': '+got+' != '+want);
 assert(got<=prev,'player Values presented out of ranking order at rank '+p.rank);
 prev=got;
}
assert(norm.canonicalValue(players[0])===9999,'rank #1 must remain 9999');
const te=players.find(p=>p.pos==='TE');
assert(norm.canonicalValue(te)===exp.get(te.id),'TE adjustment was applied again after modeled value substitution');

vm.runInContext(fs.readFileSync('trade-runtime-v256-compiled.js','utf8'),ctx,{filename:'trade-runtime-v256-compiled.js'});
vm.runInContext(fs.readFileSync('trade-finder-v256-compiled.js','utf8'),ctx,{filename:'trade-finder-v256-compiled.js'});
(async()=>{
 const before=ensureCalls;
 const rows=await ctx.tradeFinderV168.generateAsync(0);
 assert(ensureCalls===before,'V319 caused ensureMaster/model rebuild inside Finder hot path');
 assert(Array.isArray(rows)&&rows.length>0,'V311 Finder returned no trades under V319 values');
 for(const r of rows.slice(0,20)){
   const a=(r.give||[]).reduce((s,x)=>s+norm.canonicalValue(x),0);
   const b=(r.recv||[]).reduce((s,x)=>s+norm.canonicalValue(x),0);
   assert(Math.abs(a-r.f.aRaw)<1e-9,'Finder outgoing raw total is not V319 canonical sum');
   assert(Math.abs(b-r.f.bRaw)<1e-9,'Finder incoming raw total is not V319 canonical sum');
 }
 const f=ctx.section1V130.fair([players[0]],[players[16]]);
 assert(f.aRaw===norm.canonicalValue(players[0]),'V311 Evaluator/fair outgoing total did not use V319 number');
 assert(f.bRaw===norm.canonicalValue(players[16]),'V311 Evaluator/fair incoming total did not use V319 number');
 console.log('V319 exact modeled values + frozen V311 Finder/Evaluator integration smoke passed');
})().catch(e=>{console.error(e);process.exit(1)});
