const fs=require('fs'),vm=require('vm');
function assert(x,m){if(!x)throw new Error(m)}
const document={addEventListener(){},getElementById(){return null},querySelectorAll(){return[]},querySelector(){return null}};
const ctx={console,document,window:null,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},MutationObserver:function(){},Event:function(){}};
ctx.window=ctx;ctx.state={allAssets:[],teams:[],players:{}};
ctx.tradeValueNormalizationV130={canonicalValue:x=>Number(x?.v)||0};
ctx.playerRankValue=x=>({rank:Number(x?.rank)||9999});
ctx.playerName=x=>String(x?.name||x?.id||'');
ctx.groupPos=x=>x?.pos||'WR';
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('trade-specific-player-v232.js','utf8'),ctx,{filename:'trade-specific-player-v232.js'});
vm.runInContext(fs.readFileSync('trade-specific-max-value-v279.js','utf8'),ctx,{filename:'trade-specific-max-value-v279.js'});
const g=ctx.tradeSpecificPlayerV232,m=ctx.tradeSpecificMaxValueV279;
assert(g?.familyRoundRobin&&g?.outgoingFamilyKey,'generic family helpers unavailable');
assert(m?.familyRoundRobin&&m?.outgoingFamilyKey,'max-value family helpers unavailable');

const P=(id,v,rank)=>({type:'player',id,name:id,v,rank,pos:'RB'});
const K=(id,v)=>({type:'pick',id,v,season:2028,round:2});
const maxx=P('Maxx Crosby',6084,56),jj=P('Justin Jefferson',8167,14),chuba=P('Chuba Hubbard',4215,125),dobbins=P('J.K. Dobbins',3377,169);
const pair={xs:[chuba,dobbins],v:7592};
const target=7570;
const pool=[];
for(let i=0;i<80;i++)pool.push({xs:[maxx,K('mx'+i,1480+i)],v:maxx.v+1480+i});
for(let i=0;i<60;i++)pool.push({xs:[jj,K('jj'+i,200+i)],v:jj.v+200+i});
pool.push(pair);
pool.sort((a,b)=>Math.abs(a.v-target)-Math.abs(b.v-target));

const genericItems=pool.map((x,i)=>({give:x,recv:{xs:[]},rawGap:Math.abs(x.v-target),i}));
const diverse=g.familyRoundRobin(genericItems,12,x=>x.give.xs);
const families=diverse.map(x=>g.outgoingFamilyKey(x.give.xs));
assert(families.includes('P:Chuba Hubbard|J.K. Dobbins'),'Chuba+Dobbins family was cut before fairness');
assert(families.filter(x=>x==='P:Maxx Crosby').length<=2,'same-player/different-pick Maxx family still dominates pre-fairness sample: '+families.join(','));
assert(families.filter(x=>x==='P:Justin Jefferson').length<=2,'same-player/different-pick Jefferson family still dominates pre-fairness sample: '+families.join(','));

const maxCandidates=m.structureCandidates(pool,target,2,24);
assert(maxCandidates.some(x=>m.outgoingFamilyKey(x.xs)==='P:Chuba Hubbard|J.K. Dobbins'),'Maximum Value structureCandidates cut Chuba+Dobbins');
const rows=[];
for(let i=0;i<30;i++)rows.push({give:[maxx,K('a'+i,1450+i)],recv:[P('JT'+i,target,23)],f:{score:84,edgeEffective:150},maximumValueScore:100-i/100});
for(let i=0;i<30;i++)rows.push({give:[jj,K('b'+i,200+i)],recv:[P('JTJ'+i,target,23)],f:{score:84,edgeEffective:140},maximumValueScore:99-i/100});
rows.push({give:[chuba,dobbins],recv:[P('Jonathan Taylor',target,23)],f:{score:85,edgeEffective:130},maximumValueScore:98.5});
const out=m.diversifyTieredResults(rows,'neutral',20);
const first=out.slice(0,10),ff=first.map(r=>m.outgoingFamilyKey(r.give));
assert(ff.includes('P:Chuba Hubbard|J.K. Dobbins'),'Chuba+Dobbins family was cut after fairness');
assert(ff.filter(x=>x==='P:Maxx Crosby').length<=3,'Maxx family dominates first 10 after fairness: '+ff.join(','));
assert(ff.filter(x=>x==='P:Justin Jefferson').length<=3,'Jefferson family dominates first 10 after fairness: '+ff.join(','));
console.log('V327 outgoing player-core family diversity regression passed',ff.join(' | '));
