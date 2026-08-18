(()=>{
'use strict';
const MIN=120,MAX=9999,PLAYER_BREAK=325,PLAYER_BREAK_VALUE=1825,ELITE_FIRST=6500,YEAR_DISCOUNT=.88;
const clamp=(a,x,b)=>Math.max(a,Math.min(x,b));
const round5=n=>Math.round(Number(n||0)/5)*5;
const rankOf=a=>{try{return Math.max(1,Number(window.playerRankValue?.(a)?.rank)||0)}catch(_){return 0}};
function currentMaxRank(){const rs=(window.state?.allAssets||[]).filter(x=>x?.type==='player').map(rankOf).filter(Boolean);return Math.max(907,...rs)}
function playerValueForRank(rank,maxRank=currentMaxRank()){
 const r=clamp(1,Number(rank)||1,maxRank);
 if(r===1)return MAX;
 if(r<=PLAYER_BREAK){const t=(r-1)/(PLAYER_BREAK-1);return round5(PLAYER_BREAK_VALUE+(MAX-PLAYER_BREAK_VALUE)*Math.pow(Math.max(0,1-Math.pow(t,.56)),1.4));}
 const span=Math.max(1,maxRank-PLAYER_BREAK),t=(r-PLAYER_BREAK)/span;
 return round5(clamp(MIN,MIN+(PLAYER_BREAK_VALUE-MIN)*Math.pow(Math.max(0,1-Math.pow(t,.7)),1.5),PLAYER_BREAK_VALUE));
}
function playerValue(a){const r=rankOf(a);return r?playerValueForRank(r):null}
function originalRoster(a){const n=Number(a?.original_owner);if(n)return n;const m=String(a?.id||'').match(/^pick-\d+-\d+-(\d+)$/);return m?Number(m[1]):0}
function teamName(id){return window.teamName?.(id)||`Roster ${id}`}
function projectionRows(){
 const ctx=window.teamContext90,entries=ctx?.teams instanceof Map?[...ctx.teams.entries()]:[];
 if(entries.length!==32)return new Map();
 const maxTitle=Math.max(...entries.map(([,z])=>Number(z?.title)||0),.0001);
 const rows=entries.map(([rid,z])=>{const rank=Number(z?.rank),playoff=Number(z?.playoff),title=Number(z?.title);if(!(rank>=1&&rank<=32)||!Number.isFinite(playoff)||!Number.isFinite(title))return null;const score=.50*((33-rank)/32)+.35*clamp(0,playoff,1)+.15*clamp(0,title/maxTitle,1);return{rid:Number(rid),score,rank,playoff,title}}).filter(Boolean);
 if(rows.length!==32)return new Map();
 rows.sort((a,b)=>b.score-a.score||a.rank-b.rank||a.rid-b.rid);
 const out=new Map();rows.forEach((r,i)=>out.set(r.rid,{...r,documentRank:i+1,documentSlot:32-i}));return out;
}
function nearestSeason(){const ys=(window.state?.allAssets||[]).filter(x=>x?.type==='pick').map(x=>Number(x.season)).filter(Number.isFinite);return ys.length?Math.min(...ys):null}
function projectedSlot(a){const rid=originalRoster(a),doc=projectionRows().get(rid);if(doc)return doc.documentSlot;try{const s=Number(window.draftPickContext86?.slots?.get?.(rid));if(Number.isFinite(s))return clamp(1,s,32)}catch(_){}return 16}
function rawCurve(round,slot){const curves={1:[[1,4200],[4,3600],[8,3000],[16,2300],[24,1700],[32,1300]],2:[[1,1200],[8,1000],[16,800],[24,640],[32,500]],3:[[1,450],[8,380],[16,300],[24,235],[32,175]]},a=curves[Number(round)];if(!a)return 60;const s=clamp(1,Number(slot)||16,32);for(let i=1;i<a.length;i++)if(s<=a[i][0]){const[x1,y1]=a[i-1],[x2,y2]=a[i],t=(s-x1)/(x2-x1);return y1+(y2-y1)*t}return a[a.length-1][1]}
function rawPickValue(a){const y=Number(a?.season)||nearestSeason()||2027,r=Number(a?.round)||1,baseYear=nearestSeason()||y,slot=projectedSlot(a);let v=rawCurve(r,slot)*Math.pow(YEAR_DISCOUNT,Math.max(0,y-baseYear));if(y===baseYear&&r===1)v*=1.03;return Math.max(10,round5(v))}
function anchorRaw(){const y=nearestSeason();if(!y)return 1;const vals=(window.state?.allAssets||[]).filter(x=>x?.type==='pick'&&Number(x.season)===y&&Number(x.round)===1).map(rawPickValue);return Math.max(1,...vals)}
function pickValue(a){return round5(clamp(MIN,rawPickValue(a)*(ELITE_FIRST/anchorRaw()),ELITE_FIRST))}
function canonicalValue(a){if(a?.type==='player')return playerValue(a)||0;if(a?.type==='pick')return pickValue(a);return 0}
function pickContext(a){const rid=originalRoster(a),doc=projectionRows().get(rid),slot=projectedSlot(a);return{originalRoster:rid,originalTeam:teamName(rid),currentOwner:Number(a?.owner)||0,currentOwnerTeam:teamName(Number(a?.owner)),projectedSlot:slot,value:pickValue(a),rawValue:rawPickValue(a),projectionContextUsed:Boolean(doc),projectionDocumentRank:doc?.documentRank||null,projectionTeamRank:doc?.rank||null,projectionPlayoff:doc?.playoff??null,projectionTitle:doc?.title??null}}
function install(){
 window.pickValue=a=>a?.type==='pick'?pickValue(a):0;
 window.baseValue=a=>canonicalValue(a);
 window.packageValue=items=>(items||[]).reduce((s,a)=>s+canonicalValue(a),0);
 for(const e of [window.tradeEngine96,window.tradeEngine98,window.tradeEngine99].filter(Boolean)){
   try{Object.defineProperty(e,'assetValue',{configurable:true,enumerable:true,writable:true,value:canonicalValue})}catch(_){e.assetValue=canonicalValue}
 }
 window.__tradeValueNormalization='v131-canonical';return true;
}
setTimeout(install,0);setTimeout(install,150);setTimeout(install,700);setInterval(install,1500);
window.tradeValueNormalizationV130={MIN,MAX,ELITE_FIRST,YEAR_DISCOUNT,rankOf,currentMaxRank,playerValueForRank,playerValue,nearestSeason,projectedSlot,rawPickValue,pickValue,pickContext,canonicalValue,install};
})();