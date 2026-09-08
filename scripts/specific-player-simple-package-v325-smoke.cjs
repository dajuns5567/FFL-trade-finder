const fs=require('fs'),vm=require('vm');
function assert(x,m){if(!x)throw new Error(m)}
const elements={
 desiredPlayerSearch:{value:'Jonathan Taylor'},findMode:{value:'value'},tradeTier94:{value:'neutral'},
 findShop:{},tradeAssist97:{checked:false}
};
const document={
 addEventListener(){},
 getElementById:id=>elements[id]||null,
 querySelectorAll(sel){if(sel.includes('.shopCheck:checked'))return[];return[]},
 querySelector(){return null}
};
const ctx={console,document,window:null,setTimeout(){return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},MutationObserver:function(){},Event:function(){}};
ctx.window=ctx;ctx.state={allAssets:[],teams:[],players:{}};
ctx.tradeValueNormalizationV130={canonicalValue:x=>Number(x?.v)||0};
ctx.playerRankValue=x=>({rank:Number(x?.rank)||9999});
ctx.playerName=x=>String(x?.name||x?.id||'');
ctx.groupPos=x=>x?.pos||'WR';
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('trade-specific-player-v232.js','utf8'),ctx,{filename:'trade-specific-player-v232.js'});
vm.runInContext(fs.readFileSync('trade-specific-max-value-v279.js','utf8'),ctx,{filename:'trade-specific-max-value-v279.js'});

const generic=ctx.tradeSpecificPlayerV232,maxv=ctx.tradeSpecificMaxValueV279;
assert(generic?.spectrumPackages&&generic?.diversifyOutgoingAssets,'generic specific-player helpers unavailable');
assert(maxv?.structureCandidates&&maxv?.diversifyTieredResults,'Maximum Value helpers unavailable');

const P=(id,v,rank)=>({type:'player',id,name:id,v,rank,pos:'RB'});
const K=(id,v)=>({type:'pick',id,v,round:2,season:2028});
const jj=P('Justin Jefferson',9100,4),maxx=P('Maxx Crosby',8200,13),chuba=P('Chuba Hubbard',4200,95),dobbins=P('JK Dobbins',3400,140);
const mids=[P('Mid A',5000,70),P('Mid B',4700,80),P('Mid C',3900,110),P('Mid D',3600,125)];
const pair={xs:[chuba,dobbins],v:7600};
const bucket=[pair];
for(let i=0;i<45;i++)bucket.push({xs:[jj,K('j'+i,300+i*20)],v:9400+i*20});
for(let i=0;i<45;i++)bucket.push({xs:[maxx,K('m'+i,300+i*20)],v:8500+i*20});
for(let i=0;i<mids.length;i++)for(let j=i+1;j<mids.length;j++)bucket.push({xs:[mids[i],mids[j]],v:mids[i].v+mids[j].v});
bucket.sort((a,b)=>a.v-b.v);

const target=7600;
const genericCandidates=generic.spectrumPackages(bucket,target,90);
const maxCandidates=maxv.structureCandidates(bucket,target,2,120);
const isChubaDobbins=g=>{const ids=(g.xs||[]).map(x=>x.id).sort().join('|');return ids==='Chuba Hubbard|JK Dobbins'};
assert(genericCandidates.some(isChubaDobbins),'Balanced/Fair Acquire Specific candidate coverage missed Chuba + Dobbins');
assert(maxCandidates.some(isChubaDobbins),'Maximum Value Acquire Specific candidate coverage missed Chuba + Dobbins');

function rowsFor(which){
 const rows=[];
 for(let i=0;i<24;i++)rows.push({give:[jj,K('rj'+i,600+i)],recv:[P('JT'+i,7600,23)],f:{score:84,edgeEffective:200},recommend:100-i/100,maximumValueScore:100-i/100,gap:i});
 for(let i=0;i<24;i++)rows.push({give:[maxx,K('rm'+i,500+i)],recv:[P('JTm'+i,7600,23)],f:{score:84,edgeEffective:190},recommend:99-i/100,maximumValueScore:99-i/100,gap:i});
 rows.push({give:[chuba,dobbins],recv:[P('Jonathan Taylor',7600,23)],f:{score:85,edgeEffective:180},recommend:98.5,maximumValueScore:98.5,gap:0});
 for(let i=0;i<18;i++){const a=mids[i%mids.length],b=mids[(i+1)%mids.length];rows.push({give:[a,b],recv:[P('AltJT'+i,7600,23)],f:{score:84,edgeEffective:170},recommend:98-i/100,maximumValueScore:98-i/100,gap:i})}
 return rows;
}
const gOut=generic.diversifyOutgoingAssets(rowsFor('g'),20);
const mOut=maxv.diversifyTieredResults(rowsFor('m'),'neutral',20);
function check(out,label){
 const first=out.slice(0,10),count=id=>first.filter(r=>(r.give||[]).some(x=>x.id===id)).length;
 assert(count('Justin Jefferson')<=3,label+' still lets Justin Jefferson dominate first 10: '+count('Justin Jefferson'));
 assert(count('Maxx Crosby')<=3,label+' still lets Maxx Crosby dominate first 10: '+count('Maxx Crosby'));
 assert(first.some(r=>isChubaDobbins({xs:r.give})),label+' failed to surface Chuba + Dobbins in first 10');
}
check(gOut,'Balanced/Fair');
check(mOut,'Maximum Value');

const site=fs.readFileSync('netlify/functions/site-v29.mjs','utf8');
const router=site.indexOf('trade-specific-blank-router-v325.js');
const tier=site.indexOf('trade-specific-tier-up-v282.js');
const max=site.indexOf('trade-specific-max-value-v279.js');
const genericPos=site.indexOf('trade-specific-player-v232.js');
assert(router>=0&&router<tier&&router<max&&router<genericPos,'blank specific-player router is not loaded before intercepting handlers');
console.log('V325 specific-player simple-package coverage and outgoing asset-frequency diversity smoke passed');
