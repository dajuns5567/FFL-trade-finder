const fs=require('fs'),vm=require('vm');
function assert(x,m){if(!x)throw new Error(m)}
const els={
 desiredPlayerSearch:{value:'Target'},
 tradeTier94:{value:'up'},
 findMode:{value:'value'},
 tradeAssist97:{checked:false},
 findShop:{}
};
const document={
 addEventListener(){},
 getElementById:id=>els[id]||null,
 querySelectorAll(sel){if(sel.includes('.shopCheck:checked'))return[];return[]}
};
const ctx={console,document,window:null,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},MutationObserver:function(){},Event:function(){}};
ctx.window=ctx;ctx.state={allAssets:[],teams:[],players:{}};
ctx.tradeValueNormalizationV130={canonicalValue:x=>Number(x?.v)||0};
ctx.playerRankValue=x=>({rank:Number(x?.rank)||9999});ctx.playerName=x=>String(x?.name||x?.id||'');ctx.groupPos=x=>x?.pos||'WR';
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('trade-specific-tier-up-v282.js','utf8'),ctx,{filename:'trade-specific-tier-up-v282.js'});
assert(ctx.tradeSpecificTierUpV282?.active()===false,'blank Maximum Value Tier Up is still intercepted by generic Tier Up handler');

vm.runInContext(fs.readFileSync('trade-specific-max-value-v279.js','utf8'),ctx,{filename:'trade-specific-max-value-v279.js'});
const api=ctx.tradeSpecificMaxValueV279;
assert(api?.structureCandidates&&api?.diversifyTieredResults,'V324 max-value helpers unavailable');

const P=(id,v,rank)=>({type:'player',id,v,rank,pos:'WR'}),K=(id,v)=>({type:'pick',id,v,round:2,season:2028});
const leads=[P('L1',8200,10),P('L2',7600,20),P('L3',6900,35),P('L4',6100,55),P('L5',5200,80),P('L6',4300,120)];
const bucket2=[],bucket3=[];
let idx=0;
for(const lead of leads){
 for(let i=0;i<8;i++){
  const p=K('k'+(idx++),700+i*110);
  bucket2.push({xs:[lead,p],v:lead.v+p.v});
 }
 for(let i=0;i<6;i++){
  const p1=K('a'+(idx++),500+i*90),p2=K('b'+(idx++),450+i*70);
  bucket3.push({xs:[lead,p1,p2],v:lead.v+p1.v+p2.v});
 }
}
for(const a of[bucket2,bucket3])a.sort((x,y)=>x.v-y.v);
const c2=api.structureCandidates(bucket2,7600,2,40),c3=api.structureCandidates(bucket3,7600,3,36);
const centers2=new Set(c2.map(x=>api.outgoingCenterKey(x.xs))),centers3=new Set(c3.map(x=>api.outgoingCenterKey(x.xs)));
assert(centers2.size>=5,'2-asset candidates are still centered on too few outgoing assets: '+centers2.size);
assert(centers3.size>=5,'3-asset candidates are still centered on too few outgoing assets: '+centers3.size);

const rows=[];
function add(size,lead,n,score){
 for(let i=0;i<n;i++){
  const give=size===1?[lead]:size===2?[lead,K('x'+size+lead.id+i,800+i*10)]:[lead,K('y'+size+lead.id+i,500+i*10),K('z'+size+lead.id+i,450+i*8)];
  rows.push({give,recv:[],f:{score:83,edgeEffective:100},maximumValueScore:score-i/100});
 }
}
for(const lead of leads){add(1,lead,8,100);add(2,lead,8,99);add(3,lead,8,98)}
rows.sort((a,b)=>b.maximumValueScore-a.maximumValueScore);
for(const tier of ['up','down']){
 const out=api.diversifyTieredResults(rows,tier,60);
 const first=out.slice(0,30),sizes={1:0,2:0,3:0},centers=new Set();
 for(const r of first){sizes[r.give.length]++;centers.add(api.outgoingCenterKey(r.give))}
 assert(sizes[2]>0&&sizes[3]>0,tier+' lacks multi-asset outgoing structures: '+JSON.stringify(sizes));
 assert(centers.size>=5,tier+' reuses too few outgoing centerpieces: '+centers.size);
 if(tier==='up')assert(sizes[2]+sizes[3]>=sizes[1],'Tier Up should not collapse back to single-asset offers: '+JSON.stringify(sizes));
}
console.log('V324 routing + structure-first Maximum Value Tier Up/Down smoke passed');
