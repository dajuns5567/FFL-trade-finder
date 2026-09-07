const fs=require('fs'),vm=require('vm');
function assert(x,m){if(!x)throw new Error(m)}
const document={
  addEventListener(){},
  querySelectorAll(){return[]},
  querySelector(){return null},
  getElementById(){return null}
};
const ctx={console,document,window:null,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},Event:function(){}};
ctx.window=ctx;
ctx.state={allAssets:[],teams:[],players:{}};
ctx.tradeValueNormalizationV130={canonicalValue:x=>Number(x?.v)||0};
ctx.playerRankValue=x=>({rank:Number(x?.rank)||9999});
ctx.playerName=x=>String(x?.name||x?.id||'');
ctx.groupPos=x=>x?.pos||'WR';
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('trade-specific-player-v232.js','utf8'),ctx,{filename:'trade-specific-player-v232.js'});
const api=ctx.tradeSpecificPlayerV232;
assert(api&&typeof api.diversifyOutgoingAssets==='function','V321 diversity helper unavailable');
const P=(id,v,rank)=>({type:'player',id,name:id,v,rank,pos:'WR'});
const maxx=P('maxx',8200,12),alt1=P('alt1',7900,18),alt2=P('alt2',7600,24),alt3=P('alt3',7300,31),alt4=P('alt4',7000,39);
const filler=n=>P('f'+n,500-n,500+n);
const rows=[];
for(let i=0;i<20;i++)rows.push({give:[maxx,filler(i)],recv:[],f:{score:95},recommend:95-i/100,gap:i});
for(const [j,lead] of [alt1,alt2,alt3,alt4].entries())for(let i=0;i<8;i++)rows.push({give:[lead,filler(100+j*10+i)],recv:[],f:{score:94},recommend:94-j/10-i/100,gap:i});
const out=api.diversifyOutgoingAssets(rows,10);
assert(out.length===10,'expected ten recommendations');
const centers=out.map(r=>api.outgoingCenterKey(r));
const maxxCount=centers.filter(x=>x==='player:maxx').length;
assert(maxxCount<=3,'Maxx-style centerpiece still dominates first ten: '+maxxCount);
assert(new Set(centers).size>=4,'outgoing centerpiece diversity too low: '+JSON.stringify(centers));
assert(centers[0]==='player:maxx','best-ranked recommendation should remain eligible at the top');
console.log('V321 Acquire Specific Player outgoing centerpiece diversity smoke passed:',centers.join(', '));
