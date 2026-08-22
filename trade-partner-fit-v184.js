(()=>{
'use strict';
const clamp=(a,x,b)=>Math.max(a,Math.min(Number(x)||0,b));
const st=()=>window.state||{};
const norm=()=>window.tradeValueNormalizationV130||window.tradeValueNormalizationV139||{};
const val=x=>Math.max(0,Number(norm().canonicalValue?.(x))||0);
const pos=x=>x?.type==='player'?String(window.groupPos?.(x)||'IDP').toUpperCase():'PICK';
const age=x=>Number(st().players?.[x?.id]?.age);
const positions=['QB','RB','WR','TE','IDP'];
// League has no required TE starter. TE can help as a flex asset, but must never
// create the same roster-need pressure as required QB/RB/WR positions.
const slots={QB:1,RB:2,WR:3,TE:0,IDP:2};
let cache={assetsRef:null,teamsRef:null,playersRef:null,rooms:new Map(),league:new Map()};
function rebuildCache(){
 const s=st(),rooms=new Map(),league=new Map();
 const grouped=new Map();
 for(const x of s.allAssets||[]){if(x?.type!=='player')continue;const team=Number(x.owner),p=pos(x);if(!positions.includes(p))continue;const k=`${team}|${p}`;if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(x)}
 for(const t of s.teams||[]){const team=Number(t.id);for(const p of positions){const a=(grouped.get(`${team}|${p}`)||[]).slice().sort((x,y)=>val(y)-val(x)),n=slots[p]||0;let sum=0,w=0;if(p==='TE'){for(let i=0;i<Math.min(a.length,2);i++){const wt=i===0?.18:.08;sum+=val(a[i])*wt;w+=wt}}else{for(let i=0;i<Math.min(a.length,n+2);i++){const wt=i<n?1:(i===n?.42:.2);sum+=val(a[i])*wt;w+=wt}}rooms.set(`${team}|${p}`,w?sum/w:0)}}
 for(const p of positions)league.set(p,(s.teams||[]).map(t=>rooms.get(`${Number(t.id)}|${p}`)||0).sort((a,b)=>a-b));
 cache={assetsRef:s.allAssets,teamsRef:s.teams,playersRef:s.players,rooms,league};
}
function ensureCache(){const s=st();if(cache.assetsRef!==s.allAssets||cache.teamsRef!==s.teams||cache.playersRef!==s.players)rebuildCache()}
function weightedRoom(team,p){ensureCache();return cache.rooms.get(`${Number(team)}|${p}`)||0}
function leagueRooms(p){ensureCache();return cache.league.get(p)||[]}
function percentile(v,arr){if(!arr.length)return .5;let below=0;for(const x of arr)if(x<v)below++;return below/Math.max(1,arr.length-1)}
function needScore(team,p){if(p==='TE')return 15;const pct=percentile(weightedRoom(team,p),leagueRooms(p));let score=(1-pct)*100;if(p==='IDP')score=50+(score-50)*.35;return clamp(0,score,100)}
function surplusScore(team,p){const pct=percentile(weightedRoom(team,p),leagueRooms(p));let score=pct*100;if(p==='TE')score=50+(score-50)*.15;if(p==='IDP')score=50+(score-50)*.35;return clamp(0,score,100)}
function packagePositionScore(xs,fn,team){const ps=(xs||[]).filter(x=>x.type==='player');if(!ps.length)return 50;let num=0,den=0;for(const x of ps){const w=Math.max(250,val(x));num+=fn(team,pos(x))*w;den+=w}return den?num/den:50}
function phaseScore(other,give,recv){const z=window.teamContextOutlook90?.(other);if(!z)return 50;const g=(give||[]),r=(recv||[]);const gPicks=g.filter(x=>x.type==='pick').length,rPicks=r.filter(x=>x.type==='pick').length;const gYoung=g.filter(x=>x.type==='player'&&age(x)<=24).length,rYoung=r.filter(x=>x.type==='player'&&age(x)<=24).length;const gVets=g.filter(x=>x.type==='player'&&age(x)>=27).length,rVets=r.filter(x=>x.type==='player'&&age(x)>=27).length;let s=50;if(z.phase==='Contender'){s+=gVets*9-gPicks*3-gYoung*1+rPicks*4+rYoung*2-rVets*5}else if(z.phase==='Competitive'){s+=gVets*5+rPicks*2+rYoung-rVets*2}else if(z.phase==='Retooling'||z.phase==='Purgatory'){s+=gYoung*4+gPicks*5-rYoung*2-rPicks*3}else if(z.phase==='Rebuilding'){s+=gYoung*7+gPicks*9-gVets*5-rYoung*4-rPicks*6+rVets*5}return clamp(0,s,100)}
function improvementScore(other,give,recv){const touched=new Set((give||[]).filter(x=>x.type==='player').map(pos));if(!touched.size)return 50;let total=0,n=0;for(const p of touched){if(p==='TE')continue;const before=weightedRoom(other,p),incoming=(give||[]).filter(x=>x.type==='player'&&pos(x)===p).reduce((s,x)=>s+val(x),0),outgoing=(recv||[]).filter(x=>x.type==='player'&&pos(x)===p).reduce((s,x)=>s+val(x),0),delta=incoming-outgoing;const scale=Math.max(1200,before*.75);total+=clamp(0,50+50*delta/scale,100);n++}return n?total/n:50}
function twoQbSide(xs){return (xs||[]).filter(x=>x?.type==='player'&&pos(x)==='QB').length>1}
function comprehensive(me,other,give,recv){ensureCache();const invalidPackage=twoQbSide(give)||twoQbSide(recv);const need=packagePositionScore(give,needScore,other),surplus=packagePositionScore(recv,surplusScore,other),phase=phaseScore(other,give,recv),improve=improvementScore(other,give,recv);const score=invalidPackage?0:clamp(0,need*.40+surplus*.20+phase*.25+improve*.15,100);return{score,need,surplus,phase,improve,invalidPackage}}
function active(){return document.getElementById('findMode')?.value==='need'}
function recommendation(fairness,me,other,give,recv){const fit=comprehensive(me,other,give,recv);return{recommend:fit.invalidPackage?-1:clamp(0,(Number(fairness)||0)*.70+fit.score*.30,100),fit}}
function invalidate(){cache={assetsRef:null,teamsRef:null,playersRef:null,rooms:new Map(),league:new Map()}}
window.tradePartnerFitV184={active,comprehensive,recommendation,invalidate,version:'v186'};
})();
