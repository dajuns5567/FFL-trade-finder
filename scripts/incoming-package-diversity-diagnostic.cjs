// Diagnostic only: exercises the UNMODIFIED compiled Finder's ranked result path.
// Synthetic 32-team league: output is a controlled regression baseline, NOT live league data.
const fs=require('fs'),vm=require('vm');
const assets=[],teams=[],players={};
const nameMap=new Map();
const posList=['QB','RB','WR','TE','IDP'];
function player(owner,n,value,position){
  const id='P'+owner+'_'+n,asset={type:'player',id,owner,v:value,rank:Math.max(1,Math.round(10000/value*24+n)),pos:position};
  assets.push(asset);nameMap.set(id,id);players[id]={full_name:id,team:'T'+owner};return asset;
}
function pick(owner,round,year){
  const id='pick-'+year+'-'+round+'-'+owner,asset={type:'pick',id,owner,season:year,round,original_owner:owner,v:round===1?5000:round===2?1700:550,name:year+' R'+round};
  assets.push(asset);nameMap.set(id,asset.name+'-'+owner);return asset;
}
for(let t=1;t<=32;t++){
  teams.push({id:t,name:'Fixture team '+t});
  for(let n=0;n<16;n++){
    const v=Math.max(160,8100-n*330-(t%7)*75+(n%3)*55);
    player(t,n,v,posList[(n+t)%posList.length]);
  }
  pick(t,1,2027);pick(t,2,2028);pick(t,3,2029);
}
const controls={findTeam:{value:'1'},findMode:{value:'balanced'},tradeTier94:{value:'neutral'},
 tradeAssist97:{checked:false},desiredPlayerSearch:{value:''},
 finderResults:{innerHTML:'',appendChild(){}},findShop:{querySelectorAll(){return[]}}};
const mine=assets.filter(a=>a.owner===1),boxes=mine.map(a=>({_asset:a,checked:false}));
const selectedPos={value:'ANY',checked:true};
const document={
 readyState:'complete',addEventListener(){},
 getElementById:id=>controls[id]||null,
 querySelectorAll(sel){
  if(sel.includes('#findShop .shopCheck:checked')||sel==='.shopCheck:checked')return boxes.filter(b=>b.checked);
  if(sel==='#findShop .shopCheck'||sel==='.shopCheck')return boxes;
  if(sel.includes('.trade97-pos:checked'))return selectedPos.checked?[selectedPos]:[];
  if(sel==='.draftYear106:checked'||sel==='.draftRound106:checked')return[];
  if(sel==='input[type="checkbox"]')return[controls.tradeAssist97,selectedPos,...boxes];
  return[];
 },
 querySelector(){return null},
 createElement(){return{style:{},appendChild(){},setAttribute(){}}}
};
let fairCalls=0;
const win={state:{allAssets:assets,teams,players},
 tradeValueNormalizationV130:{canonicalValue:a=>a?.v||0},
 playerRankValue:a=>({rank:a?.rank||9999}),
 playerName:id=>nameMap.get(id)||String(id),
 groupPos:a=>a?.type==='pick'?'PICK':a?.pos||'WR',
 teamName:id=>'Fixture team '+id,
 teamContextTradeFit90:()=>0,
 section1V130:{fair(give,recv){
  fairCalls++;
  const A=give.reduce((s,x)=>s+(x.v||0),0),B=recv.reduce((s,x)=>s+(x.v||0),0);
  const score=Math.max(1,Math.min(100,Math.round(100-140*Math.abs(A-B)/Math.max(A,B,1))));
  return{score,rejected:false,edgeEffective:B-A,edgeRaw:B-A,
   aRaw:A,bRaw:B,aAdj:0,bAdj:0,aEffective:A,bEffective:B};
 }}
};
const context={console,window:win,document,state:win.state,Math,Map,Set,Number,String,
 Array,JSON,Promise,Date,Event:class Event{},MutationObserver:class MutationObserver{
 observe(){}disconnect(){}},setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('trade-finder-v256-compiled.js','utf8'),context,{filename:'trade-finder-v256-compiled.js'});
const finder=win.tradeFinderV168;
if(typeof finder?.generateAsync!=='function'||typeof finder?.premiumAsset!=='function')throw Error('Real compiled Finder runtime not available');
const assetKey=xs=>(xs||[]).map(x=>x.type+':'+x.id).sort().join('|');
function metrics(rows,n){
 const s=rows.slice(0,n),incoming=s.map(r=>r.recv||[]),centers=incoming.map(xs=>{const x=finder.premiumAsset(xs);return x?x.type+':'+x.id:'NONE';});
 const groups=incoming.map(xs=>{const p=xs.filter(a=>a.type==='player').map(a=>a.id).sort();return p.length?'P:'+p.join('|'):'K:'+assetKey(xs);});
 const frequency=values=>{const c=new Map();for(const x of values)c.set(x,(c.get(x)||0)+1);return [...c].sort((a,b)=>b[1]-a[1]);};
 const fCenter=frequency(centers),fCore=frequency(groups);
 const count=xs=>new Set(xs).size;
 return{count:s.length,uniqueIncoming:count(incoming.map(assetKey)),
  uniqueIncomingCores:count(groups),uniqueCenters:count(centers),
  uniquePartners:count(s.map(r=>r.other)),mostFrequentCenter:fCenter[0]||null,
  largestCoreFrequency:fCore[0]?.[1]||0,
  adjacentSameIncoming:incoming.filter((xs,i)=>i>0&&assetKey(xs)===assetKey(incoming[i-1])).length,
  adjacentSameCenter:centers.filter((x,i)=>i>0&&x===centers[i-1]).length,
  duplicatedIncoming:frequency(incoming.map(assetKey)).filter(x=>x[1]>1).slice(0,10),
  repeatedCenterpieces:fCenter.filter(x=>x[1]>1).slice(0,10),
  repeatedIncomingCores:fCore.filter(x=>x[1]>1).slice(0,10)};
}
async function scenario(label,{manual=false}={}){
 controls.findMode.value='balanced';controls.tradeTier94.value='neutral';controls.desiredPlayerSearch.value='';
 for(const b of boxes)b.checked=false;
 if(manual)boxes.find(b=>b._asset.type==='player').checked=true;
 const before=fairCalls,started=Date.now();
 const rows=await finder.generateAsync(0);
 if(!Array.isArray(rows)||!rows.length)throw Error(label+': actual ranked Finder returned no results');
 const out={label,source:'actual compiled generateAsync() against synthetic 32-team roster fixture',
  runtimeMs:Date.now()-started,fairnessCalls:fairCalls-before,totalResults:rows.length,
  windows:Object.fromEntries([5,10,20,50,100,250].map(n=>[n,metrics(rows,n)])),
  first50:rows.slice(0,50).map((r,i)=>({rank:i+1,other:r.other,
   receive:(r.recv||[]).map(a=>({id:a.id,type:a.type,value:a.v})),
   give:(r.give||[]).map(a=>({id:a.id,type:a.type,value:a.v})),
   score:r.f?.score,recommend:r.recommend}))};
 console.log('[INCOMING AUDIT]',label,JSON.stringify({total:out.totalResults,elapsedMs:out.runtimeMs,fairCalls:out.fairnessCalls,
   top10:out.windows[10],top50:out.windows[50]}));
 return out;
}
(async()=>{
 const report={version:'incoming-recommendation-diversity-ci-v1',
  caveat:'Synthetic fixture; results are NOT measured from the live 32-team league',
  baseline:'Unmodified trade-finder-v256-compiled.js on preview #444',
  scenarios:[],generated:new Date().toISOString()};
 report.scenarios.push(await scenario('blank-balanced'));
 report.scenarios.push(await scenario('manual-elite-balanced',{manual:true}));
 fs.writeFileSync('incoming-audit-report.json',JSON.stringify(report,null,2));
 console.log('[INCOMING AUDIT] complete. JSON report saved.');
})().catch(e=>{console.error('[INCOMING AUDIT] failed',e);process.exitCode=1});