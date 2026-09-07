const fs=require('fs'),vm=require('vm');
function assert(x,m){if(!x)throw new Error(m)}
global.window=global;
const names=new Map(),rankMap=new Map(),model=[],allAssets=[],teams=[],players={};
function addP(id,owner,value,rank,name=id,pos='WR'){const x={type:'player',id,owner,pos};allAssets.push(x);model.push({x,value});names.set(id,name);rankMap.set(id,rank);players[id]={team:'T'+owner};return x}
function addK(id,owner,value,round=2,season=2027){const x={type:'pick',id,owner,value,round,season,name:season+' R'+round,original_owner:owner};allAssets.push(x);names.set(id,x.name);return x}
const p1=addP('p1',1,2206,1,'Alpha'),p2=addP('p2',1,1817,2,'Beta'),p3=addP('p3',2,1763,3,'Gamma');
for(let i=4;i<=26;i++)addP('a'+i,1,Math.max(300,1700-i*35),i,'A'+i);
for(let i=27;i<=50;i++)addP('b'+i,2,Math.max(280,1620-i*23),i,'B'+i);
for(let owner=3;owner<=5;owner++){teams.push({id:owner,name:'Team '+owner});for(let i=0;i<10;i++)addP('t'+owner+'_'+i,owner,Math.max(220,1300-i*80-owner*5),51+(owner-3)*10+i,'T'+owner+'-'+i)}
teams.unshift({id:1,name:'Mine'},{id:2,name:'Them'});
addK('k1',1,900,1,2027);addK('k2',2,600,2,2028);
window.state={allAssets,teams,players,assetsA:[],assetsB:[],league:{scoring_settings:{}}};
window.ensureMaster=()=>model;
window.playerRankValue=x=>({rank:rankMap.get(x?.id)||9999,value:model.find(z=>z.x.id===x?.id)?.value||1});
window.playerName=id=>names.get(id)||String(id||'');window.groupPos=x=>x?.type==='pick'?'PICK':(x.pos||'WR');window.teamName=id=>id===1?'Mine':'Team '+id;window.teamContextTradeFit90=()=>0;
window.baseValue=x=>x?.type==='pick'?(Number(x.value)||0):(model.find(z=>z.x.id===x?.id)?.value||1);
window.packageValue=xs=>(xs||[]).reduce((s,x)=>s+window.baseValue(x),0);window.pickValue=x=>Number(x?.value)||0;
window.draftPickProjection86=x=>({value:Number(x?.value)||0,projectedSlot:16,originalTeam:'X',currentOwnerTeam:'X'});
const controls={
 findTeam:{value:'1'},findMode:{value:'balanced'},tradeTier94:{value:'neutral'},tradeAssist97:{checked:false},desiredPlayerSearch:{value:''},
 finderResults:{innerHTML:'',textContent:'',appendChild(){},querySelectorAll(){return[]}},
 evalA:{value:'1'},evalB:{value:'2'},evalResults:{innerHTML:'',querySelectorAll(){return[]}},evaluate:{onclick:null},
 findShop:{querySelectorAll(){return[]}},evalChooserA:{querySelectorAll(){return[]}},evalChooserB:{querySelectorAll(){return[]}}
};
const boxes=allAssets.filter(x=>Number(x.owner)===1).map(a=>({_asset:a,checked:a.id==='p1'})),anyPos={value:'ANY',checked:true};
global.document={__v131sel:false,readyState:'loading',documentElement:{},addEventListener(){},querySelectorAll(sel){if(sel.includes('#findShop .shopCheck:checked')||sel==='.shopCheck:checked')return boxes.filter(x=>x.checked);if(sel==='#findShop .shopCheck'||sel==='.shopCheck')return boxes;if(sel.includes('.trade97-pos:checked'))return[anyPos];if(sel==='input[type="checkbox"]')return[controls.tradeAssist97,anyPos,...boxes];if(sel==='.draftYear106:checked'||sel==='.draftRound106:checked')return[];return[]},querySelector(){return null},getElementById(id){return controls[id]||null},createElement(){return{style:{},appendChild(){},querySelectorAll(){return[]}}}};
global.MutationObserver=function(){this.observe=()=>{};this.disconnect=()=>{}};global.setTimeout=()=>0;global.clearTimeout=()=>{};global.setInterval=()=>0;global.clearInterval=()=>{};global.queueMicrotask=fn=>fn();global.alert=()=>{};
function run(p){vm.runInThisContext(fs.readFileSync(p,'utf8'),{filename:p})}
run('trade-value-normalization-v139.js');run('trade-te-scoring-adjustment-v259.js');run('player-modeled-gap-display-v313.js');
const display=window.playerModeledGapDisplayV313,oldCanonical=window.tradeValueNormalizationV130.canonicalValue(p2),newDisplay=display.baseValue(p2);
assert(oldCanonical!==newDisplay,'fixture must distinguish legacy rank value from V313 modeled-gap value');
run('trade-finder-v256-compiled.js');run('trade-runtime-v256-compiled.js');window.section1V130.install();
run('modeled-player-trade-value-v317.js');assert(window.modeledPlayerTradeValueV317.install(),'V317 adapter failed to install');
const norm=window.tradeValueNormalizationV130;
assert(norm.canonicalValue(p2)===oldCanonical,'search-path canonical player value must remain exact V313 legacy value');
assert(norm.playerValue(p2)===display.value(p2),'UI player value must equal approved V313 modeled-gap value');
const f=window.section1V130.fair([p1],[p3]);
assert(f.aRaw===display.value(p1)&&f.bRaw===display.value(p3),'shared fair() must score with modeled-gap player values');
assert(norm.canonicalValue(p2)===oldCanonical,'fair() leaked scoring mode into search path');
(async()=>{
 const rows=await window.tradeFinderV168.generateAsync(0);
 assert(Array.isArray(rows),'Finder search did not complete');
 assert(norm.canonicalValue(p2)===oldCanonical,'Finder search changed search-path canonical value');
 window.section1V130.evalSel.A.clear();window.section1V130.evalSel.B.clear();window.section1V130.evalSel.A.set(p1.id,p1);window.section1V130.evalSel.B.set(p3.id,p3);
 assert(typeof controls.evaluate.onclick==='function','Evaluator onclick missing');
 controls.evaluate.onclick({preventDefault(){}});
 assert(controls.evalResults.innerHTML.includes('/100'),'Evaluator did not render');
 assert(controls.evalResults.innerHTML.includes(String(display.value(p1)).replace(/\B(?=(\d{3})+(?!\d))/g,',')),'Evaluator did not render modeled-gap player currency');
 const src=fs.readFileSync('player-modeled-gap-display-v313.js','utf8');
 assert(src.includes('valueNode.textContent=next'),'safe leaf-value chooser patch missing');
 assert(!src.includes('patchValueText(node,value(a))'),'unsafe chooser text flattening returned');
 console.log('V317 dual-path Finder/Evaluator and presentation regression smoke passed');
})().catch(e=>{console.error(e);process.exit(1)});