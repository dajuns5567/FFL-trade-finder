(()=>{
const ROOKIE_YEAR=2026;
function num27(v){const n=Number(v);return Number.isFinite(n)?n:null}
function rookieEvidence27(p){
 const candidates=[p?.rookie_year,p?.rookieYear,p?.draft_year,p?.draftYear,p?.metadata?.rookie_year,p?.metadata?.rookieYear,p?.metadata?.draft_year,p?.metadata?.draftYear];
 const yearMatch=candidates.some(v=>num27(v)===ROOKIE_YEAR);
 const exp=num27(p?.years_exp);
 return yearMatch&&exp===0;
}
function row27(z,i){const x=z.x,p=state.players?.[x.id]||{},m=playerRankValue(x),team=p.team||'FA',score=typeof window.displayValueScore==='function'?window.displayValueScore(m.value):m.value;return `<div class="asset"><div><b>${i}. ${playerName(x.id)}</b><br><small>${groupPos(x)} • ${team} • CV ${m.consensus??'fallback'} • TV ${m.value} • Score ${score} • overall #${m.rank}</small></div></div>`}
function renderRookies27(){
 const sec=document.getElementById('rankings');if(!sec)return;
 let card=document.getElementById('rookieTracker27');if(!card){card=document.createElement('div');card.id='rookieTracker27';card.className='card';card.innerHTML='<h2>2026 Rookie Tracker</h2><p class="muted">Only players positively identified as 2026 rookies by explicit Sleeper year metadata plus years_exp = 0 are included. Ambiguous players are omitted rather than guessed.</p><div class="grid"><div><h3>Rookie Offense</h3><div id="rookieOff27"></div></div><div><h3>Rookie Defense</h3><div id="rookieDef27"></div></div></div>';sec.appendChild(card)}
 const ranked=ensureMaster().filter(z=>rookieEvidence27(state.players?.[z.x.id]||{}));const off=ranked.filter(z=>groupPos(z.x)!=='IDP'),def=ranked.filter(z=>groupPos(z.x)==='IDP');
 document.getElementById('rookieOff27').innerHTML=off.length?off.map((z,i)=>row27(z,i+1)).join(''):"<div class='empty'>No offense players are positively identified as 2026 rookies by the current Sleeper metadata.</div>";
 document.getElementById('rookieDef27').innerHTML=def.length?def.map((z,i)=>row27(z,i+1)).join(''):"<div class='empty'>No IDPs are positively identified as 2026 rookies by the current Sleeper metadata.</div>";
}
const prevRenderAll27=renderAll;renderAll=function(){prevRenderAll27();setTimeout(renderRookies27,0)};
document.addEventListener('click',e=>{if(e.target.closest('.tabs button[data-tab="rankings"]'))setTimeout(renderRookies27,0)});
window.rookieTrackerAudit=function(){return Object.entries(state.players||{}).filter(([,p])=>rookieEvidence27(p)).map(([id,p])=>({id,name:playerName(id),position:groupPos({type:'player',id}),team:p.team||null,years_exp:p.years_exp,rookie_year:p.rookie_year??p.rookieYear??p.metadata?.rookie_year??p.metadata?.rookieYear??null,draft_year:p.draft_year??p.draftYear??p.metadata?.draft_year??p.metadata?.draftYear??null}));};
setTimeout(renderRookies27,0);
})();
