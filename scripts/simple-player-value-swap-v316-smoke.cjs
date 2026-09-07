const fs=require('fs'),vm=require('vm');
function assert(x,m){if(!x)throw new Error(m)}
global.window=global;
let ensureCalls=0;
const names=new Map(),rankMap=new Map(),model=[],allAssets=[],teams=[],players={};
function addP(id,owner,value,rank,name=id){const x={type:'player',id,owner};allAssets.push(x);model.push({x,value});names.set(id,name);rankMap.set(id,rank);players[id]={team:'T'+owner};return x}
function addK(id,owner,value,round=2,season=2027){const x={type:'pick',id,owner,value,round,season,name:season+' R'+round,original_owner:owner};allAssets.push(x);names.set(id,x.name);return x}
const manual=addP('manual',1,2206,1,'Manual Player'),mine2=addP('mine2',1,1817,2,'Mine Two'),target=addP('target',2,1763,3,'Target Player');
for(let i=4;i<=30;i++)addP('m'+i,1,Math.max(350,1700-i*35),i,'Mine '+i);
for(let i=31;i<=60;i++)addP('t'+i,2,Math.max(320,1650-i*22),i,'Them '+i);
for(let owner=3;owner<=6;owner++){teams.push({id:owner,name:'Team '+owner});for(let i=0;i<14;i++)addP('p'+owner+'_'+i,owner,Math.max(220,1400-i*70-owner*6),61+(owner-3)*14+i,'P'+owner+'-'+i)}
teams.unshift({id:1,name:'Mine'},{id:2,name:'Team 2'});
addK('k1',1,900,1,2027);addK('k2',2,550,2,2028);
window.state={allAssets,teams,players,assetsA:[],assetsB:[],league:{scoring_settings:{}}};
window.ensureMaster=()=>{ensureCalls++;return model};
window.playerRankValue=x=>({rank:rankMap.get(x?.id)||9999,value:model.find(z=>z.x.id===x?.id)?.value||1});
window.playerName=id=>names.get(id)||String(id||'');window.groupPos=x=>x?.type==='pick'?'PICK':'WR';window.teamName=id=>id===1?'Mine':'Team '+id;window.teamContextTradeFit90=()=>0;
window.baseValue=x=>x?.type==='pick'?Number(x.value)||0:(model.find(z=>z.x.id===x?.id)?.value||1);
window.packageValue=xs=>(xs||[]).reduce((s,x)=>s+window.baseValue(x),0);window.pickValue=x=>Number(x?.value)||0;
window.draftPickProjection86=x=>({value:Number(x?.value)||0,projectedSlot:16,originalTeam:'X',currentOwnerTeam:'X'});
const controls={
 findTeam:{value:'1'},findMode:{value:'balanced'},tradeTier94:{value:'neutral'},tradeAssist97:{checked:true},desiredPlayerSearch:{value:''},
 finderResults:{innerHTML:'',textContent:'',appendChild(){},querySelectorAll(){return[]}},
 evalA:{value:'1'},evalB:{value:'2'},evalResults:{innerHTML:'',querySelectorAll(){return[]}},evaluate:{onclick:null},
 findShop:{querySelectorAll(){return[]}},evalChooserA:{querySelectorAll(){return[]}},evalChooserB:{querySelectorAll(){return[]}}
};
const boxes=allAssets.filter(x=>Number(x.owner)===1).map(a=>({_asset:a,checked:a.id==='manual'}));const anyPos={value:'ANY',checked:true};
global.document={__v131sel:false,readyState:'complete',documentElement:{},addEventListener(){},querySelectorAll(sel){if(sel.includes('#findShop .shopCheck:checked')||sel==='.shopCheck:checked')return boxes.filter(x=>x.checked);if(sel==='#findShop .shopCheck'||sel==='.shopCheck')return boxes;if(sel.includes('.trade97-pos:checked'))return[anyPos];if(sel==='input[type="checkbox"]')return[controls.tradeAssist97,anyPos,...boxes];if(sel==='.draftYear106:checked'||sel==='.draftRound106:checked')return[];return[]},querySelector(){return null},getElementById(id){return controls[id]||null},createElement(){return{style:{},appendChild(){},querySelectorAll(){return[]}}}};
global.MutationObserver=function(){this.observe=()=>{};this.disconnect=()=>{}};global.setTimeout=()=>0;global.clearTimeout=()=>{};global.setInterval=()=>0;global.clearInterval=()=>{};global.queueMicrotask=fn=>fn();global.alert=()=>{};
function run(p){vm.runInThisContext(fs.readFileSync(p,'utf8'),{filename:p})}
run('trade-value-normalization-v139.js');run('trade-te-scoring-adjustment-v259.js');run('player-modeled-gap-display-v313.js');run('modeled-player-trade-value-swap-v316.js');
assert(window.modeledPlayerTradeValueSwapV316.install(),'swap did not install');
const norm=window.tradeValueNormalizationV130,afterInstall=ensureCalls;
assert(norm.canonicalValue(manual)===window.playerModeledGapDisplayV313.value(manual),'canonical player value does not match approved V313 display value');
const pickBefore=norm.canonicalValue(allAssets.find(x=>x.id==='k1'));
for(let i=0;i<10000;i++)norm.canonicalValue(i%2?manual:mine2);
assert(ensureCalls===afterInstall,'canonical hot-path player lookup re-entered ensureMaster');

let fairCalls=0;
window.section1V130={fair(give,recv){fairCalls++;const aRaw=give.reduce((s,x)=>s+norm.canonicalValue(x),0),bRaw=recv.reduce((s,x)=>s+norm.canonicalValue(x),0);return{score:88,rejected:false,edgeEffective:bRaw-aRaw,edgeRaw:bRaw-aRaw,aRaw,bRaw,aAdj:0,bAdj:0,aEffective:aRaw,bEffective:bRaw}},install(){}};
run('trade-finder-v256-compiled.js');
(async()=>{
 const before=ensureCalls;const rows=await window.tradeFinderV168.generateAsync(0);
 assert(Array.isArray(rows),'Finder did not return result array');assert(fairCalls>0,'Finder did not evaluate trades');assert(ensureCalls===before,'Finder search re-entered ensureMaster');
 run('trade-runtime-v256-compiled.js');window.section1V130.install();
 window.section1V130.evalSel.A.clear();window.section1V130.evalSel.B.clear();window.section1V130.evalSel.A.set(manual.id,manual);window.section1V130.evalSel.B.set(target.id,target);
 const evalBefore=ensureCalls;assert(typeof controls.evaluate.onclick==='function','Evaluator handler missing');controls.evaluate.onclick({preventDefault(){}});
 assert(controls.evalResults.innerHTML.includes('/100'),'Evaluator did not render result');assert(ensureCalls===evalBefore,'Evaluator re-entered ensureMaster');
 assert(norm.canonicalValue(allAssets.find(x=>x.id==='k1'))===pickBefore,'pick value changed');
 console.log('V316 simple player-value swap Finder/Evaluator smoke passed');
})().catch(e=>{console.error(e);process.exit(1)});