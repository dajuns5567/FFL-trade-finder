(()=>{
'use strict';
/*
 V231: fast, opt-in specific-player wrapper around frozen V209.
 V209 itself is not modified.

 Inactive invariant:
 - if the existing Acquire a specific player checkbox is not checked,
   specificTarget231() returns null and the transformed V209 runtime uses its
   original team list and original playerPackages/blankThreePackages paths.
 - valuation, fairness, recommendation scoring, tier checks, Future/Win-Now,
   Partner Fit, V223 guards, sorting and presentation are not changed.

 Active behavior:
 - resolve the exact desiredPlayerSearch player once per Finder run;
 - search only that player's current owner;
 - construct incoming candidates around that immutable player id before any
   fairness/scoring work, avoiding the all-31-team work done by a normal search;
 - every generated incoming package contains the target player.
*/
const xhr=new XMLHttpRequest();
xhr.open('GET','/trade-finder-style-loader-v209.js?v=209',false);
try{xhr.send(null)}catch(e){console.error('V231 loader fetch failed',e);return}
if(xhr.status<200||xhr.status>=300){console.error('V231 loader fetch failed',xhr.status);return}
let loader=xhr.responseText;

const evalMarker="try{(0,eval)(src+'\\n//# sourceURL=trade-finder-style-loader-v209-transformed.js')}catch(e){console.error('V209 loader eval failed',e)}";
if(loader.split(evalMarker).length-1!==1){console.error('V231 guard failed: V209 eval marker');return}

const patch=`
// V231 transforms only the final V209 Finder runtime held in src.
const v231Anchor="const yieldUI=()=>new Promise(r=>setTimeout(r,0));";
const v231Helpers=v231Anchor+\`
function specificCheckbox231(){
 const input=document.getElementById('desiredPlayerSearch');if(!input)return null;
 const direct=['acquireSpecificPlayer','tradeSpecificPlayer','specificPlayer','specificPlayerToggle','targetSpecificPlayer'].map(x=>document.getElementById(x)).find(x=>x?.type==='checkbox');
 if(direct)return direct;
 const scopes=[input.closest('label'),input.parentElement,input.parentElement?.parentElement,document.getElementById('finder')].filter(Boolean);
 for(const scope of scopes){for(const box of scope.querySelectorAll?.('input[type="checkbox"]')||[]){const txt=String((box.labels?.[0]?.textContent||box.closest('label')?.textContent||box.parentElement?.textContent||'')).toLowerCase();if(/specific\\s*player|acquire.*player/.test(txt))return box}}
 return null;
}
function specificEnabled231(){return specificCheckbox231()?.checked===true}
function specificTarget231(me){
 if(!specificEnabled231())return null;
 const q=String(document.getElementById('desiredPlayerSearch')?.value||'').normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 if(!q)return null;
 return (st().allAssets||[]).find(x=>x?.type==='player'&&Number(x.owner)!==Number(me)&&String(pname(x)).normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()===q)||null;
}
function specificIncoming231(owned,targetValue,w,tier,targetPlayer,light,allowThree){
 const tid=id(targetPlayer),players=(owned||[]).filter(x=>x?.type==='player'&&id(x)!==tid),picks=(owned||[]).filter(x=>x?.type==='pick'&&Number(x.round)<=3),out=[],seen=new Set();
 const add=xs=>{const a=(xs||[]).filter(Boolean);if(!a.some(x=>x?.type==='player'&&id(x)===tid))return;addPkg(out,seen,a)};
 add([targetPlayer]);
 const need=Math.max(0,targetValue-av(targetPlayer));
 const nearPlayers=players.slice().sort((a,b)=>Math.abs(av(a)-need)-Math.abs(av(b)-need)||rankOf(a)-rankOf(b)).slice(0,light?10:16);
 const nearPicks=picks.slice().sort((a,b)=>Math.abs(av(a)-need)-Math.abs(av(b)-need)||av(b)-av(a)).slice(0,light?5:8);
 for(const p of nearPlayers)add([targetPlayer,p]);
 for(const k of nearPicks)add([targetPlayer,k]);
 if(allowThree||tier==='down'||tier==='neutral'){
  for(let i=0;i<Math.min(7,nearPlayers.length);i++)for(let j=i+1;j<Math.min(8,nearPlayers.length);j++)add([targetPlayer,nearPlayers[i],nearPlayers[j]]);
  for(const p of nearPlayers.slice(0,8))for(const k of nearPicks.slice(0,5))add([targetPlayer,p,k]);
  if(tier==='down')for(let i=0;i<Math.min(5,nearPicks.length);i++)for(let j=i+1;j<Math.min(6,nearPicks.length);j++)add([targetPlayer,nearPicks[i],nearPicks[j]]);
 }
 return out;
}\`;
if(src.split(v231Anchor).length-1!==1){console.error('V231 Finder guard failed: helper anchor');return}
src=src.replace(v231Anchor,v231Helpers);

const v231Init="const w=targetPositions(),chosen=selectedGive(),blank=blankSelection(chosen),gives=blank?blankGivePackages(me):[chosen],tier=finderMode(),teams=(st().teams||[]).filter(x=>Number(x.id)!==me),byOwner=new Map();";
const v231InitNew="const w=targetPositions(),chosen=selectedGive(),blank=blankSelection(chosen),gives=blank?blankGivePackages(me):[chosen],tier=finderMode(),specific231=specificTarget231(me),teams=specific231?(st().teams||[]).filter(x=>Number(x.id)===Number(specific231.owner)):(st().teams||[]).filter(x=>Number(x.id)!==me),byOwner=new Map();";
if(src.split(v231Init).length-1!==1){console.error('V231 Finder guard failed: generate init');return}
src=src.replace(v231Init,v231InitNew);

const v231Blank="baseIncoming=tier==='draft'?pickPackages(owned.filter(x=>x.type==='pick'),target,true):playerPackages(owned,target,true,w,false,tier),extraIncoming=tier!=='draft'&&give.length>1?blankThreePackages(owned,target,w,tier):[],incoming=baseIncoming.concat(extraIncoming),best=new Map();";
const v231BlankNew="baseIncoming=specific231?specificIncoming231(owned,target,w,tier,specific231,true,give.length>1):(tier==='draft'?pickPackages(owned.filter(x=>x.type==='pick'),target,true):playerPackages(owned,target,true,w,false,tier)),extraIncoming=specific231?[]:(tier!=='draft'&&give.length>1?blankThreePackages(owned,target,w,tier):[]),incoming=baseIncoming.concat(extraIncoming),best=new Map();";
if(src.split(v231Blank).length-1!==1){console.error('V231 Finder guard failed: blank incoming');return}
src=src.replace(v231Blank,v231BlankNew);

const v231Selected="incoming=tier==='draft'?pickPackages(owned.filter(x=>x.type==='pick'),target,false):playerPackages(owned,target,false,w,allowThree,tier),best=new Map();";
const v231SelectedNew="incoming=specific231?specificIncoming231(owned,target,w,tier,specific231,false,allowThree):(tier==='draft'?pickPackages(owned.filter(x=>x.type==='pick'),target,false):playerPackages(owned,target,false,w,allowThree,tier)),best=new Map();";
if(src.split(v231Selected).length-1!==1){console.error('V231 Finder guard failed: selected incoming');return}
src=src.replace(v231Selected,v231SelectedNew);

// Hard final invariant for active searches. This is a cheap id test inside the one-owner pool.
const v231BlankLoop="for(const recv of incoming){if(!valuePlausible(target,recv))continue;";
const v231BlankLoopNew="for(const recv of incoming){if(specific231&&!recv.some(x=>x?.type==='player'&&id(x)===id(specific231)))continue;if(!valuePlausible(target,recv))continue;";
if(src.split(v231BlankLoop).length-1!==1){console.error('V231 Finder guard failed: blank target invariant');return}
src=src.replace(v231BlankLoop,v231BlankLoopNew);
const v231SelectedLoop="for(const recv of incoming){if(!tierOK(give,recv,tier,w))continue;";
const v231SelectedLoopNew="for(const recv of incoming){if(specific231&&!recv.some(x=>x?.type==='player'&&id(x)===id(specific231)))continue;if(!tierOK(give,recv,tier,w))continue;";
if(src.split(v231SelectedLoop).length-1!==1){console.error('V231 Finder guard failed: selected target invariant');return}
src=src.replace(v231SelectedLoop,v231SelectedLoopNew);
`;

loader=loader.replace(evalMarker,patch+"\ntry{(0,eval)(src+'\\n//# sourceURL=trade-finder-style-loader-v231-transformed.js')}catch(e){console.error('V231 loader eval failed',e)}");
try{(0,eval)(loader+'\n//# sourceURL=trade-finder-style-loader-v231-wrapper.js')}catch(e){console.error('V231 wrapper eval failed',e)}
})();
