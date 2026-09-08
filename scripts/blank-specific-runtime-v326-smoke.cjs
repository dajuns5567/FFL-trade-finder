const fs=require('fs'),vm=require('vm');
function assert(x,m){if(!x)throw new Error(m)}
const elements={
 desiredPlayerSearch:{value:'Jonathan Taylor'},
 findTeam:{value:'1'},
 tradeTier94:{value:'neutral'},
 findMode:{value:'balanced'},
 tradeAssist97:{checked:false},
 finderResults:{innerHTML:'',appendChild(){}},
 findShop:{}
};
const document={
 readyState:'complete',
 addEventListener(){},
 getElementById:id=>elements[id]||null,
 querySelectorAll(sel){if(sel.includes('.shopCheck:checked'))return[];return[]},
 querySelector(sel){if(sel==='#finder select#findPos')return{value:'ANY'};return null},
 createElement(){return{className:'',style:{},textContent:'',onclick:null}}
};
const ctx={console,document,window:null,setTimeout(fn){fn();return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},MutationObserver:function(){},Event:function(){}};
ctx.window=ctx;
const P=(id,name,v,rank,owner,pos='RB')=>({type:'player',id,name,v,rank,owner,pos});
const target=P('jt','Jonathan Taylor',7570,23,2);
const my=[
 P('jj','Justin Jefferson',8167,14,1,'WR'),
 P('maxx','Maxx Crosby',6084,56,1,'IDP'),
 P('chuba','Chuba Hubbard',4215,125,1,'RB'),
 P('dobbins','J.K. Dobbins',3377,169,1,'RB')
];
ctx.state={allAssets:[...my,target],teams:[{id:1,name:'Mine'},{id:2,name:'Miami'}],players:Object.fromEntries([...my,target].map(x=>[x.id,{team:'NFL'}]))};
ctx.tradeValueNormalizationV130={canonicalValue:x=>Number(x?.v)||0};
ctx.playerRankValue=x=>({rank:Number(x?.rank)||9999});
ctx.playerName=id=>ctx.state.allAssets.find(x=>x.id===id)?.name||id;
ctx.groupPos=x=>x?.pos||'WR';
ctx.teamName=id=>id===1?'Mine':'Miami';
ctx.section1V130={fair(a,b){const ar=a.reduce((s,x)=>s+x.v,0),br=b.reduce((s,x)=>s+x.v,0);return{score:88,rejected:false,aRaw:ar,bRaw:br,aAdj:0,bAdj:0,aEffective:ar,bEffective:br,edgeRaw:br-ar,edgeEffective:br-ar}}};
ctx.teamContextTradeFit90=()=>0;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('trade-specific-player-v232.js','utf8'),ctx,{filename:'trade-specific-player-v232.js'});
(async()=>{
 const ok=await ctx.tradeSpecificPlayerV232.run();
 assert(ok===true,'blank specific-player run did not complete');
 assert(!/stopped unexpectedly/i.test(elements.finderResults.innerHTML),'blank specific-player run surfaced runtime failure');
 assert(/trade95-card|No realistic trade/.test(elements.finderResults.innerHTML),'blank specific-player run did not reach final render state');
 console.log('V326 full blank specific-player runtime smoke passed');
})().catch(e=>{console.error(e);process.exit(1)});
