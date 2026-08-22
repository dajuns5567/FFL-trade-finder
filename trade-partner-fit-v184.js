(()=>{
'use strict';
const clamp=(a,x,b)=>Math.max(a,Math.min(Number(x)||0,b));
const st=()=>window.state||{};
const norm=()=>window.tradeValueNormalizationV130||window.tradeValueNormalizationV139||{};
const val=x=>Math.max(0,Number(norm().canonicalValue?.(x))||0);
const pos=x=>x?.type==='player'?String(window.groupPos?.(x)||'IDP').toUpperCase():'PICK';
const age=x=>Number(st().players?.[x?.id]?.age);
const positions=['QB','RB','WR','TE','IDP'];
const slots={QB:1,RB:2,WR:3,TE:1,IDP:2};
function assets(team){return(st().allAssets||[]).filter(x=>Number(x.owner)===Number(team))}
function players(team,p){return assets(team).filter(x=>x.type==='player'&&pos(x)===p).sort((a,b)=>val(b)-val(a))}
function weightedRoom(team,p){const a=players(team,p),n=slots[p]||1;let s=0,w=0;for(let i=0;i<Math.min(a.length,n+2);i++){const wt=i<n?1:(i===n?.42:.2);s+=val(a[i])*wt;w+=wt}return w?s/w:0}
function leagueRooms(p){return(st().teams||[]).map(t=>weightedRoom(Number(t.id),p)).sort((a,b)=>a-b)}
function percentile(v,arr){if(!arr.length)return .5;let below=0;for(const x of arr)if(x<v)below++;return below/Math.max(1,arr.length-1)}
function needScore(team,p){const pct=percentile(weightedRoom(team,p),leagueRooms(p));let score=(1-pct)*100;if(p==='IDP')score=50+(score-50)*.35;return clamp(0,score,100)}
function surplusScore(team,p){const pct=percentile(weightedRoom(team,p),leagueRooms(p));let score=pct*100;if(p==='IDP')score=50+(score-50)*.35;return clamp(0,score,100)}
function packagePositionScore(xs,fn,team){const ps=(xs||[]).filter(x=>x.type==='player');if(!ps.length)return 50;let num=0,den=0;for(const x of ps){const w=Math.max(250,val(x));num+=fn(team,pos(x))*w;den+=w}return den?num/den:50}
function phaseScore(other,give,recv){const z=window.teamContextOutlook90?.(other);if(!z)return 50;const g=(give||[]),r=(recv||[]);const gPicks=g.filter(x=>x.type==='pick').length,rPicks=r.filter(x=>x.type==='pick').length;const gYoung=g.filter(x=>x.type==='player'&&age(x)<=24).length,rYoung=r.filter(x=>x.type==='player'&&age(x)<=24).length;const gVets=g.filter(x=>x.type==='player'&&age(x)>=27).length,rVets=r.filter(x=>x.type==='player'&&age(x)>=27).length;let s=50;if(z.phase==='Contender'){s+=gVets*9-gPicks*3-gYoung*1+rPicks*4+rYoung*2-rVets*5}else if(z.phase==='Competitive'){s+=gVets*5+rPicks*2+rYoung-rVets*2}else if(z.phase==='Retooling'||z.phase==='Purgatory'){s+=gYoung*4+gPicks*5-rYoung*2-rPicks*3}else if(z.phase==='Rebuilding'){s+=gYoung*7+gPicks*9-gVets*5-rYoung*4-rPicks*6+rVets*5}return clamp(0,s,100)}
function improvementScore(other,give,recv){const touched=new Set((give||[]).filter(x=>x.type==='player').map(pos));if(!touched.size)return 50;let total=0,n=0;for(const p of touched){const before=weightedRoom(other,p),incoming=(give||[]).filter(x=>x.type==='player'&&pos(x)===p).reduce((s,x)=>s+val(x),0),outgoing=(recv||[]).filter(x=>x.type==='player'&&pos(x)===p).reduce((s,x)=>s+val(x),0),delta=incoming-outgoing;const scale=Math.max(1200,before*.75);total+=clamp(0,50+50*delta/scale,100);n++}return n?total/n:50}
function comprehensive(me,other,give,recv){const need=packagePositionScore(give,needScore,other),surplus=packagePositionScore(recv,surplusScore,other),phase=phaseScore(other,give,recv),improve=improvementScore(other,give,recv);const score=clamp(0,need*.40+surplus*.20+phase*.25+improve*.15,100);return{score,need,surplus,phase,improve}}
function active(){return document.getElementById('findMode')?.value==='need'}
function recommendation(fairness,me,other,give,recv){const fit=comprehensive(me,other,give,recv);return{recommend:clamp(0,(Number(fairness)||0)*.70+fit.score*.30,100),fit}}
window.tradePartnerFitV184={active,comprehensive,recommendation,version:'v184'};
})();
