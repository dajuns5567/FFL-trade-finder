const fs=require('fs'),vm=require('vm');
const failures=[];function assert(x,m){if(!x)throw new Error(m)}
global.window=global;
let ensureCalls=0;
const model=[];
const allAssets=[],teams=[],players={},rankMap=new Map(),names=new Map();
function addPlayer(id,owner,value,rank,name=id){const x={type:'player',id,owner};allAssets.push(x);model.push({x,value});rankMap.set(id,rank);names.set(id,name);players[id]={team:'T'+owner};return x}
function addPick(id,owner,value,round=2,season=2027){const x={type:'pick',id,owner,value,round,season,name:season+' R'+round,original_owner:owner};allAssets.push(x);names.set(id,x.name);return x}
const mine=addPlayer('manual',1,2206,1,'Manual Player');
const mine2=addPlayer('mine2',1,1817,2,'Mine Two');
const mine3=addPlayer('mine3',1,1717,4,'Mine Three');
for(let i=4;i<=24;i++)addPlayer('m'+i,1,Math.max(420,1650-i*35),i,'Mine '+i);
const target=addPlayer('target',2,1763,3,'Target Player');
for(let i=25;i<=48;i++)addPlayer('p2_'+i,2,Math.max(380,1600-i*22),i,'P2 '+i);
for(let owner=3;owner<=8;owner++){teams.push({id:owner,name:'Team '+owner});for(let i=0;i<12;i++)addPlayer('p'+owner+'_'+i,owner,Math.max(260,1450-i*75-owner*8),49+(owner-3)*12+i,'P'+owner+'-'+i)}
teams.unshift({id:1,name:'Mine'},{id:2,name:'Team 2'});
addPick('minePick',1,900,1,2027);addPick('theirPick',2,550,2,2028);
window.state={allAssets,teams,players,assetsA:[],assetsB:[],league:{scoring_settings:{}}};
window.ensureMaster=()=>{ensureCalls++;return model};
window.playerRankValue=x=>({rank:rankMap.get(x?.id)||9999,value:model.find(z=>z.x.id===x?.id)?.value||1});
window.playerName=id=>names.get(id)||String(id||'');
window.groupPos=x=>x?.type==='pick'?'PICK':'WR';
window.teamName=id=>id===1?'Mine':'Team '+id;
window.teamContextTradeFit90=()=>0;
window.baseValue=x=>x?.type==='pick'?(Number(x.value)||0):(model.find(z=>z.x.id===x?.id)?.value||1);
window.packageValue=xs=>(xs||[]).reduce((s,x)=>s+window.baseValue(x),0);
window.pickValue=x=>Number(x?.value)||0;
window.draftPickProjection86=x=>({value:Number(x?.value)||0,projectedSlot:16,originalTeam:'X',currentOwnerTeam:'X'});
window.loadCore=async()=>true;window.renderAll=()=>{};
const controls={
 findTeam:{value:'1'},findMode:{value:'balanced'},tradeTier94:{value:'neutral'},tradeAssist97:{checked:true},
 desiredPlayerSearch:{value:''},finderResults:{innerHTML:'',textContent:'',appendChild(){}},
 evalA:{value:'1'},evalB:{value:'2'},evalResults:{innerHTML:'',querySelectorAll(){return[]}},evaluate:{onclick:null},
 evalChooserA:{querySelectorAll(){return[]}},evalChooserB:{querySelectorAll(){return[]}}
};
const boxes=allAssets.filter(x=>Number(x.owner)===1).map(a=>({_asset:a,checked:a.id==='manual'}));
const anyPos={value:'ANY',checked:true};
global.document={__v131sel:false,readyState:'complete',
 addEventListener(){},querySelectorAll(sel){if(sel.includes('#findShop .shopCheck:checked')||sel==='.shopCheck:checked')return boxes.filter(x=>x.checked);if(sel==='#findShop .shopCheck'||sel==='.shopCheck')return boxes;if(sel.includes('.trade97-pos:checked'))return[anyPos];if(sel==='input[type="checkbox"]')return[controls.tradeAssist97,anyPos,...boxes];if(sel==='.draftYear106:checked'||sel==='.draftRound106:checked')return[];return[]},
 querySelector(){return null},getElementById(id){return controls[id]||null},createElement(){return{style:{},appendChild(){},querySelectorAll(){return[]}}},documentElement:{}};
global.MutationObserver=function(){this.observe=()=>{};this.disconnect=()=>{}};global.setTimeout=fn=>{if(typeof fn==='function')fn();return 0};global.clearTimeout=()=>{};global.setInterval=()=>0;global.clearInterval=()=>{};global.queueMicrotask=fn=>fn();global.alert=()=>{};

function run(path){vm.runInThisContext(fs.readFileSync(path,'utf8'),{filename:path})}
run('player-modeled-gap-values-v315.js');
assert(window.playerModeledGapValuesV315?.refresh(true),'provider did not precompute');
const callsAfterRefresh=ensureCalls;
const pre=window.playerModeledGapValuesV315;
assert(pre.meta.ready&&pre.meta.count===model.length,'provider map incomplete');
assert(pre.value(mine)===9999,'approved top player value not preserved');
run('trade-value-normalization-v139.js');
run('trade-te-scoring-adjustment-v259.js');
const norm=window.tradeValueNormalizationV130;
assert(norm.canonicalValue(mine)===pre.value(mine),'canonical player currency diverged from precomputed map');
const p2=mine2;assert(norm.canonicalValue(p2)===pre.value(p2),'canonical modeled-gap value mismatch');
for(let i=0;i<5000;i++)norm.canonicalValue(i%2?mine:p2);
assert(ensureCalls===callsAfterRefresh,'canonical hot-path lookup rebuilt master/model map');
const pickBefore=norm.canonicalValue(allAssets.find(x=>x.id==='minePick'));

run('trade-runtime-v256-compiled.js');
window.section1V130?.install?.();
assert(typeof window.section1V130?.fair==='function','shared runtime fair() missing');
const f=window.section1V130.fair([mine],[target]);
assert(Number.isFinite(f.score)&&f.aRaw===norm.canonicalValue(mine)&&f.bRaw===norm.canonicalValue(target),'shared fairness did not consume precomputed canonical values');

run('trade-finder-v256-compiled.js');
assert(typeof window.tradeFinderV168?.generateAsync==='function','normal Trade Finder runtime missing');
(async()=>{
 const before=ensureCalls;
 const rows=await window.tradeFinderV168.generateAsync(0);
 assert(Array.isArray(rows),'Trade Finder search did not return an array');
 assert(ensureCalls===before,'Trade Finder search caused model-map rebuild in hot path');

 window.section1V130.evalSel.A.clear();window.section1V130.evalSel.B.clear();
 window.section1V130.evalSel.A.set(mine.id,mine);window.section1V130.evalSel.B.set(target.id,target);
 window.section1V130.install();
 assert(typeof controls.evaluate.onclick==='function','Trade Evaluator click handler did not install');
 const evalBefore=ensureCalls;
 controls.evaluate.onclick({preventDefault(){}});
 assert(/Normalized trade currency|RAW ASSET TOTAL|TRADE-ADJUSTED TOTAL/i.test(controls.evalResults.innerHTML),'Trade Evaluator did not render a result');
 assert(ensureCalls===evalBefore,'Trade Evaluator caused model-map rebuild in hot path');

 run('player-modeled-gap-display-v313.js');
 assert(window.playerModeledGapDisplayV313.value(p2)===norm.canonicalValue(p2),'display and trade player values diverged');
 assert(norm.canonicalValue(allAssets.find(x=>x.id==='minePick'))===pickBefore,'draft-pick trade currency changed in Phase 2');

 for(const p of ['trade-specific-player-v232.js','trade-specific-add-assets-v282.js','trade-specific-max-value-v279.js','trade-specific-tier-up-v282.js','trade-specific-max-tier-add-v300.js']){const s=fs.readFileSync(p,'utf8');assert(s.includes('section1V130?.fair?.'),'specific Finder handler '+p+' no longer delegates to shared fair()')}
 console.log('V315 precomputed Phase 2 Finder/Evaluator integration smoke passed');
})().catch(e=>{console.error(e);process.exit(1)});