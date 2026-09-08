const fs=require('fs'),vm=require('vm');
function assert(x,m){if(!x)throw new Error(m)}
const document={addEventListener(){},querySelectorAll(){return[]},getElementById(){return null}};
const ctx={console,document,window:null,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},MutationObserver:function(){}};
ctx.window=ctx;ctx.state={allAssets:[],teams:[],players:{}};
ctx.tradeValueNormalizationV130={canonicalValue:x=>Number(x?.v)||0};
ctx.playerRankValue=x=>({rank:Number(x?.rank)||9999});ctx.playerName=x=>String(x?.id||'');ctx.groupPos=x=>x?.pos||'WR';
vm.createContext(ctx);vm.runInContext(fs.readFileSync('trade-specific-max-value-v279.js','utf8'),ctx,{filename:'trade-specific-max-value-v279.js'});
const api=ctx.tradeSpecificMaxValueV279;assert(api?.tierDownCandidatePackages&&api?.tierUpCandidatePackages&&api?.diversifyTierDownOutgoing&&api?.diversifyTierUpOutgoing,'V323 helpers unavailable');
const P=(id,v,rank)=>({type:'player',id,v,rank,pos:'WR'}),K=(id,v)=>({type:'pick',id,v,round:2,season:2028});
const one=[];for(let i=0;i<80;i++)one.push({xs:[P('p'+i,2000+i*60,50+i)],v:2000+i*60});
const two=[];for(let i=0;i<120;i++)two.push({xs:[P('a'+i,1800+i*25,80+i),K('k'+i,700+i*10)],v:2500+i*35});
const three=[];for(let i=0;i<100;i++)three.push({xs:[P('b'+i,1500+i*20,100+i),K('x'+i,600+i*8),K('y'+i,500+i*7)],v:2600+i*35});
for(const a of [one,two,three])a.sort((x,y)=>x.v-y.v);
const c1=api.tierDownCandidatePackages(one,5200,72),c2=api.tierDownCandidatePackages(two,5200,96),c3=api.tierDownCandidatePackages(three,5200,84);
const u1=api.tierUpCandidatePackages(one,5200,72),u2=api.tierUpCandidatePackages(two,5200,108),u3=api.tierUpCandidatePackages(three,5200,96);
assert(c1.length>17&&c2.length>17&&c3.length>17,'Tier Down candidate breadth regressed to nearest-value window');
assert(u1.length>17&&u2.length>17&&u3.length>17,'Tier Up candidate breadth regressed to nearest-value window');
const mkRows=(arr,size,base)=>arr.slice(0,50).map((g,i)=>({give:g.xs,recv:[],f:{score:83,edgeEffective:100},maximumValueScore:base-i/100}));
const rows=[...mkRows(one,1,100),...mkRows(two,2,99),...mkRows(three,3,98)];
const down=api.diversifyTierDownOutgoing(rows,60),up=api.diversifyTierUpOutgoing(rows,60);
function countSizes(list){const counts={1:0,2:0,3:0};for(const r of list.slice(0,30))counts[r.give.length]++;return counts}
const downCounts=countSizes(down),upCounts=countSizes(up);
assert(downCounts[2]>0&&downCounts[3]>0,'Tier Down multi-asset outgoing packages missing from first 30: '+JSON.stringify(downCounts));
assert(downCounts[1]<30,'Tier Down single-asset outgoing packages dominate all first 30');
assert(upCounts[2]>0&&upCounts[3]>0,'Tier Up multi-asset outgoing packages missing from first 30: '+JSON.stringify(upCounts));
assert(upCounts[1]<30,'Tier Up single-asset outgoing packages dominate all first 30');
assert(upCounts[2]+upCounts[3]>=upCounts[1],'Tier Up should preserve consolidation-oriented multi-asset representation: '+JSON.stringify(upCounts));
console.log('V323 specific-player Maximum Value Tier Up/Down package diversity smoke passed',JSON.stringify({down:downCounts,up:upCounts}));
