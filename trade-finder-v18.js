(()=>{
const finderNorm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const assetText=x=>x.type==='player'?`${playerName(x.id)} ${groupPos(x)}`:`${x.name} pick`;
let desiredPlayerId=null;

function uniquePackages(list){
  const out=[],seen=new Set();
  for(const pkg of list){const clean=pkg.filter(Boolean),key=clean.map(x=>String(x.id)).sort().join('|');if(!key||seen.has(key))continue;seen.add(key);out.push(clean)}
  return out;
}
function topByValue(items,n){return [...items].sort((a,b)=>baseValue(b)-baseValue(a)).slice(0,n)}
function approxValue(pkg){return pkg.reduce((s,x)=>s+Math.max(1,baseValue(x)),0)}
function ownedPlayers(team){return state.allAssets.filter(x=>Number(x.owner)===Number(team)&&x.type==='player')}
function ownedPicks(team){return state.allAssets.filter(x=>Number(x.owner)===Number(team)&&x.type==='pick')}

function outgoingVariants(me,anchor){
  const owned=state.allAssets.filter(x=>Number(x.owner)===Number(me));
  const anchorIds=new Set(anchor.map(x=>String(x.id)));
  const extras=topByValue(owned.filter(x=>!anchorIds.has(String(x.id))&&x.type==='player'),8);
  const picks=topByValue(owned.filter(x=>!anchorIds.has(String(x.id))&&x.type==='pick'),5);
  const pkgs=[anchor];
  if(anchor.length===1){for(const p of picks)pkgs.push([anchor[0],p]);for(const x of extras)pkgs.push([anchor[0],x])}
  return uniquePackages(pkgs);
}
function suggestedOutgoingVariants(me,targetAsset){
  const targetValue=Math.max(1,baseValue(targetAsset));
  const players=topByValue(ownedPlayers(me),18),picks=topByValue(ownedPicks(me),7),pkgs=[];
  for(const p of players)pkgs.push([p]);
  for(const p of players.slice(0,14))for(const pick of picks.slice(0,5))pkgs.push([p,pick]);
  for(let i=0;i<Math.min(12,players.length);i++)for(let j=i+1;j<Math.min(12,players.length);j++)pkgs.push([players[i],players[j]]);
  for(const p of players.slice(0,8))for(let i=0;i<Math.min(4,picks.length);i++)for(let j=i+1;j<Math.min(4,picks.length);j++)pkgs.push([p,picks[i],picks[j]]);
  const filtered=uniquePackages(pkgs).filter(pkg=>{const v=approxValue(pkg),ratio=v/targetValue;return ratio>=.45&&ratio<=1.75});
  return filtered.sort((a,b)=>Math.abs(approxValue(a)-targetValue)-Math.abs(approxValue(b)-targetValue)).slice(0,70);
}
function incomingVariants(items,target){
  const allPlayers=topByValue(items.filter(x=>x.type==='player'),20);
  const eligible=target==='ANY'?allPlayers:allPlayers.filter(x=>groupPos(x)===target);
  const picks=topByValue(items.filter(x=>x.type==='pick'),6),pkgs=[];
  for(const x of eligible)pkgs.push([x]);
  if(target==='ANY')for(const p of picks)pkgs.push([p]);
  for(const x of eligible.slice(0,14))for(const p of picks.slice(0,4))pkgs.push([x,p]);
  for(let i=0;i<Math.min(10,eligible.length);i++)for(let j=i+1;j<Math.min(10,eligible.length);j++)pkgs.push([eligible[i],eligible[j]]);
  return uniquePackages(pkgs);
}
function desiredIncomingVariants(owner,targetAsset){
  const picks=topByValue(ownedPicks(owner),5),out=[[targetAsset]];
  for(const p of picks.slice(0,3))out.push([targetAsset,p]);
  return uniquePackages(out);
}
function candidateScore(give,recv,me,other,mode){
  const gv=approxValue(give),rv=approxValue(recv),ratio=rv/Math.max(1,gv);
  if(ratio<.42||ratio>2.35)return null;
  const r=tradeScore(give,recv,me,other,mode),fairGap=Math.abs(r.fair-50);
  if(r.fair<27||r.fair>73)return null;
  const packagePenalty=Math.max(0,give.length+recv.length-2)*1.7;
  let quality=r.finderScore-fairGap*.35-packagePenalty;
  if(mode==='need')quality+=Math.min(6,Math.max(0,r.fitB)/70);
  if(mode==='value')quality+=Math.min(5,Math.max(0,r.edge)/120);
  return{r,fairGap,score:Math.max(1,Math.min(99,quality))};
}

function ensureDesiredPlayerSearch(){
  const teamSel=document.getElementById('findTeam');if(!teamSel||document.getElementById('desiredPlayerSearch'))return;
  const card=teamSel.closest('.card')||document.getElementById('finder');if(!card)return;
  const anchor=document.getElementById('findPos')?.parentElement||teamSel.parentElement;
  const wrap=document.createElement('div');wrap.style.marginTop='12px';
  wrap.innerHTML=`<label>Specific player you want to acquire (optional)</label><input id="desiredPlayerSearch" type="search" placeholder="Search any rostered player…" autocomplete="off"><div id="desiredPlayerResults" class="tiny" style="margin:6px 0"></div><div id="desiredPlayerSelected" class="tiny muted"></div>`;
  anchor.appendChild(wrap);
  const input=wrap.querySelector('#desiredPlayerSearch'),results=wrap.querySelector('#desiredPlayerResults'),selected=wrap.querySelector('#desiredPlayerSelected');
  input.addEventListener('input',()=>{
    const q=finderNorm(input.value),me=Number(document.getElementById('findTeam').value);if(!q){results.innerHTML='';return}
    const rows=state.allAssets.filter(x=>x.type==='player'&&Number(x.owner)!==me&&finderNorm(playerName(x.id)).includes(q)).sort((a,b)=>baseValue(b)-baseValue(a)).slice(0,18);
    results.innerHTML=rows.map(x=>`<button type="button" class="secondary small" data-target-id="${x.id}" style="margin:2px">${esc(playerName(x.id))} • ${esc(teamName(x.owner))}</button>`).join('')||'<span class="muted">No matching rostered player.</span>';
  });
  results.addEventListener('click',e=>{
    const b=e.target.closest('button[data-target-id]');if(!b)return;desiredPlayerId=String(b.dataset.targetId);
    const x=state.allAssets.find(a=>a.type==='player'&&String(a.id)===desiredPlayerId);if(!x)return;
    input.value=playerName(x.id);results.innerHTML='';selected.innerHTML=`Target locked: <b>${esc(playerName(x.id))}</b> • ${esc(teamName(x.owner))} <button type="button" id="clearDesiredPlayer" class="secondary small" style="margin-left:6px">Clear</button>`;
    const posSel=document.getElementById('findPos');if(posSel)posSel.value=groupPos(x);
    selected.querySelector('#clearDesiredPlayer').onclick=()=>{desiredPlayerId=null;input.value='';selected.innerHTML=''};
  });
}

renderFinderShop=function(){
  const el=document.getElementById('findShop'),id=Number(document.getElementById('findTeam').value);
  if(!id){el.innerHTML="<div class='empty'>Choose your team first.</div>";return}
  const previouslyChecked=new Set([...document.querySelectorAll('.shopCheck:checked')].map(c=>String(c._asset?.id||'')));
  const assets=state.allAssets.filter(x=>Number(x.owner)===id).sort((a,b)=>baseValue(b)-baseValue(a));
  if(!assets.length){el.innerHTML="<div class='empty'>No roster assets are available yet.</div>";return}
  el.innerHTML=`<div class="tiny muted" style="margin-bottom:6px">Select outgoing assets, or leave blank when targeting a specific player and the Finder will suggest what to send.</div><input id="findAssetSearch" type="search" placeholder="Search player or pick…" autocomplete="off" style="margin-bottom:8px"><div class="checklist" id="findAssetList">${assets.map((x,i)=>`<label class="checkrow" data-search="${esc(finderNorm(assetText(x)))}"><input class="shopCheck" type="checkbox" data-asset-index="${i}" ${previouslyChecked.has(String(x.id))?'checked':''}><span>${assetLabel(x)} ${x.type==='player'?`<span class="muted">[rank ${playerRankValue(x).rank}]</span>`:`<span class="muted">(${x.season} R${x.round})</span>`}</span></label>`).join('')}</div>`;
  el.querySelectorAll('.shopCheck').forEach((c,i)=>c._asset=assets[i]);
  const search=el.querySelector('#findAssetSearch');search.addEventListener('input',()=>{const q=finderNorm(search.value);el.querySelectorAll('#findAssetList .checkrow').forEach(row=>row.style.display=!q||row.dataset.search.includes(q)?'flex':'none')});
};

runFinder=async function(){
  const btn=document.getElementById('runFinder');btn.disabled=true;
  try{
    const me=Number(document.getElementById('findTeam').value),mode=document.getElementById('findMode').value,target=document.getElementById('findPos').value;
    if(!me){document.getElementById('finderResults').innerHTML="<div class='notice error'>Choose a team before finding trades.</div>";return}
    const selected=[...document.querySelectorAll('.shopCheck:checked')].map(c=>c._asset).filter(Boolean);
    const desired=desiredPlayerId?state.allAssets.find(x=>x.type==='player'&&String(x.id)===String(desiredPlayerId)):null;
    if(desired&&Number(desired.owner)===me){document.getElementById('finderResults').innerHTML="<div class='notice error'>That target player is already on your roster.</div>";return}
    const candidates=[];
    if(desired){
      const other=state.teams.find(t=>Number(t.id)===Number(desired.owner));if(!other){document.getElementById('finderResults').innerHTML="<div class='notice error'>The selected target does not have a current league owner.</div>";return}
      const giveVariants=selected.length?outgoingVariants(me,selected):suggestedOutgoingVariants(me,desired),recvVariants=desiredIncomingVariants(other.id,desired);
      for(const give of giveVariants){for(const recv of recvVariants){const s=candidateScore(give,recv,me,other.id,mode);if(!s)continue;candidates.push({t:other,recv,give,r:s.r,score:s.score,stage:teamStage(other.id),fairGap:s.fairGap,targeted:true})}}
    }else{
      const anchor=selected.length?selected:state.allAssets.filter(x=>x.owner===me&&x.type==='player').sort((a,b)=>baseValue(b)-baseValue(a)).slice(0,1);
      if(!anchor.length){document.getElementById('finderResults').innerHTML="<div class='notice error'>No outgoing assets are available for this team.</div>";return}
      const giveVariants=outgoingVariants(me,anchor),giveRanges=giveVariants.map(g=>({g,v:approxValue(g)}));
      for(const t of state.teams.filter(x=>x.id!==me)){
        const recvVariants=incomingVariants(state.allAssets.filter(x=>x.owner===t.id),target),recvRanges=recvVariants.map(r=>({r,v:approxValue(r)}));let best=null;
        for(const {g:give,v:gv} of giveRanges){for(const {r:recv,v:rv} of recvRanges){const ratio=rv/Math.max(1,gv);if(ratio<.5||ratio>2.0)continue;const s=candidateScore(give,recv,me,t.id,mode);if(!s)continue;const c={t,recv,give,r:s.r,score:s.score,stage:teamStage(t.id),fairGap:s.fairGap};if(!best||c.score>best.score)best=c}}
        if(best)candidates.push(best);
        if(candidates.length%6===0)await new Promise(resolve=>setTimeout(resolve,0));
      }
    }
    candidates.sort((a,b)=>b.score-a.score||a.fairGap-b.fairGap);
    let out=candidates.filter(x=>x.r.fair>=35&&x.r.fair<=65);
    if(desired){if(out.length<6)out=candidates.slice(0,8)}else if(out.length<5){const have=new Set(out.map(x=>x.t.id));for(const c of candidates){if(have.has(c.t.id))continue;out.push(c);have.add(c.t.id);if(out.length>=5)break}}
    out.sort((a,b)=>b.score-a.score||a.fairGap-b.fairGap);
    document.getElementById('finderResults').innerHTML=out.length?out.slice(0,12).map((x,i)=>finderCardV18(x,i,me)).join(''):desired?"<div class='empty'>No credible package was found for that specific player from your current roster and picks.</div>":"<div class='empty'>No credible partner was found for this package.</div>";
  }catch(e){console.error(e);document.getElementById('finderResults').innerHTML=`<div class='notice error'>Trade Finder error: ${esc(e.message)}</div>`}
  finally{btn.disabled=false}
};

function finderCardV18(x,i,me){
  const f=x.r.fair,verdict=f>=61?'Favors you':f<=39?'Favors them':'Close to fair',edge=x.r.edge,shape=`${x.give.length}-for-${x.recv.length}`;
  const negotiation=(f<40||f>60)?'<span class="pill" style="margin-left:6px">Needs negotiation</span>':'';
  const targetTag=x.targeted?'<span class="pill" style="margin-left:6px">Target player deal</span>':'';
  return `<div class="result"><div class="top"><div><b>#${i+1} ${esc(x.t.name)}</b> ${targetTag}${negotiation}<div class="muted">${esc(x.stage.label)} • ${shape} • ${x.t.roster.players?.length||0} rostered players • FAAB $${Number.isFinite(state.faab[x.t.id])?state.faab[x.t.id]:'?'}</div><div style="margin-top:7px"><b>You receive:</b> ${x.recv.map(assetLabel).join(' ')}</div><div style="margin-top:5px"><b>You send:</b> ${x.give.map(assetLabel).join(' ')}</div></div><div><span class="score">${x.score.toFixed(0)}</span><div class="tiny muted">match</div></div></div><p><b>${verdict}</b> • fairness ${f.toFixed(0)}/100 • ${edge>=0?'You receive':'They receive'} the modeled value edge: <b>${Math.abs(edge).toFixed(0)} units</b></p><button class="secondary small rationaleBtn" data-rationale='${esc(JSON.stringify(explainTrade(x.r,me,x.t.id,x.recv,x.give)))}'>Trade rationale</button><div class="rationaleBody" hidden></div></div>`;
}

const finderBtn=document.getElementById('runFinder');if(finderBtn)finderBtn.onclick=runFinder;
const teamSelect=document.getElementById('findTeam');if(teamSelect)teamSelect.addEventListener('change',()=>setTimeout(()=>{renderFinderShop();ensureDesiredPlayerSearch()},0));
setTimeout(()=>{try{renderFinderShop();ensureDesiredPlayerSearch()}catch(_){}},0);
})();
