const fs=require('fs'),vm=require('vm');
function assert(x,m){if(!x)throw new Error(m)}
const document={addEventListener(){},querySelectorAll(){return[]},querySelector(){return null},getElementById(){return null}};
const ctx={console,document,window:null,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},Event:function(){}};
ctx.window=ctx;ctx.state={allAssets:[],teams:[],players:{}};
ctx.tradeValueNormalizationV130={canonicalValue:x=>Number(x?.v)||0};
ctx.playerRankValue=x=>({rank:Number(x?.rank)||9999});ctx.playerName=x=>String(x?.name||x?.id||'');ctx.groupPos=x=>x?.pos||'WR';
vm.createContext(ctx);vm.runInContext(fs.readFileSync('trade-specific-player-v232.js','utf8'),ctx,{filename:'trade-specific-player-v232.js'});
const api=ctx.tradeSpecificPlayerV232;assert(api?.spectrumPackages&&api?.diversifyOutgoingAssets,'V322 helpers unavailable');
const P=(id,v,rank)=>({type:'player',id,v,rank,pos:'WR'}),K=(id,v)=>({type:'pick',id,v,round:2,season:2028});
const mk=(lead,extra,i)=>({xs:[lead,extra],v:lead.v+extra.v,tag:i});
const elite=P('elite',8200,8),premium=P('premium',6200,24),mid=P('mid',3900,70),low=P('low',1200,300);
const pool=[];
for(let i=0;i<35;i++)pool.push(mk(low,K('lk'+i,1000+i*10),i));
for(let i=0;i<20;i++)pool.push(mk(mid,K('mk'+i,1400+i*20),100+i));
for(let i=0;i<16;i++)pool.push(mk(premium,K('pk'+i,1300+i*25),200+i));
for(let i=0;i<12;i++)pool.push(mk(elite,K('ek'+i,1200+i*30),300+i));
pool.sort((a,b)=>a.v-b.v);
const sample=api.spectrumPackages(pool,7600,28);
const counts={elite:0,premium:0,mid:0,low:0};
for(const g of sample)counts[api.centerpieceBand(g)]++;
assert(sample.length===28,'spectrum sample size changed');
assert(counts.low<counts.mid+counts.premium+counts.elite,'low-value packages dominate spectrum sample: '+JSON.stringify(counts));
assert(counts.elite>0&&counts.premium>0&&counts.mid>0,'upper/mid bands were not represented: '+JSON.stringify(counts));

const rows=[];
function addRows(lead,n,baseScore){
 for(let i=0;i<n;i++)rows.push({give:[lead,K(lead.id+'-'+i,700+i)],recv:[],f:{score:baseScore},recommend:baseScore-i/100,gap:i});
}
addRows(low,90,96);addRows(mid,40,95);addRows(premium,30,94);addRows(elite,20,93);
rows.sort((a,b)=>b.recommend-a.recommend);
const out=api.diversifyOutgoingAssets(rows,120);
assert(out.length===120,'expanded Acquire Specific result ceiling did not reach 120');
const front=out.slice(0,40),frontCounts={elite:0,premium:0,mid:0,low:0};
for(const r of front)frontCounts[api.centerpieceBand(r.give)]++;
assert(frontCounts.low<frontCounts.mid+frontCounts.premium+frontCounts.elite,'low-value centerpieces dominate first 40: '+JSON.stringify(frontCounts));
assert(frontCounts.elite>0&&frontCounts.premium>0&&frontCounts.mid>0,'first 40 lacks higher-value spectrum: '+JSON.stringify(frontCounts));
console.log('V322 Acquire Specific spectrum/value-band diversity smoke passed',JSON.stringify({sample:counts,front:frontCounts}));
