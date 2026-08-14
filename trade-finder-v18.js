(()=>{
const finderNorm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const assetText=x=>x.type==='player'?`${playerName(x.id)} ${groupPos(x)}`:`${x.name} pick`;

function uniquePackages(list){
  const out=[],seen=new Set();
  for(const pkg of list){
    const clean=pkg.filter(Boolean),key=clean.map(x=>String(x.id)).sort().join('|');
    if(!key||seen.has(key))continue;seen.add(key);out.push(clean);
  }
  return out;
}
function topByValue(items,n){return [...items].sort((a,b)=>baseValue(b)-baseValue(a)).slice(0,n)}

function outgoingVariants(me,anchor){
  const owned=state.allAssets.filter(x=>Number(x.owner)===Number(me));
  const anchorIds=new Set(anchor.map(x=>String(x.id)));
  const extras=topByValue(owned.filter(x=>!anchorIds.has(String(x.id))&&x.type==='player'),10);
  const picks=topByValue(owned.filter(x=>!anchorIds.has(String(x.id))&&x.type==='pick'),7);
  const pkgs=[anchor];
  if(anchor.length===1){
    for(const p of picks.slice(0,5))pkgs.push([anchor[0],p]);
    for(const x of extras.slice(0,8))pkgs.push([anchor[0],x]);
  }
  return uniquePackages(pkgs);
}
function incomingVariants(items,target){
  const allPlayers=topByValue(items.filter(x=>x.type==='player'),30);
  const eligible=target==='ANY'?allPlayers:allPlayers.filter(x=>groupPos(x)===target);
  const picks=topByValue(items.filter(x=>x.type==='pick'),8);
  const pkgs=[];
  for(const x of eligible)pkgs.push([x]);
  if(target==='ANY')for(const p of picks)pkgs.push([p]);
  for(const x of eligible.slice(0,20))for(const p of picks.slice(0,5))pkgs.push([x,p]);
  for(let i=0;i<Math.min(14,eligible.length);i++)for(let j=i+1;j<Math.min(14,eligible.length);j++)pkgs.push([eligible[i],eligible[j]]);
  if(target==='ANY')for(let i=0;i<Math.min(6,picks.length);i++)for(let j=i+1;j<Math.min(6,picks.length);j++)pkgs.push([picks[i],picks[j]]);
  return uniquePackages(pkgs);
}

renderFinderShop=function(){
  const el=document.getElementById('findShop'),id=Number(document.getElementById('findTeam').value);
  if(!id){el.innerHTML="<div class='empty'>Choose your team first.</div>";return}
  const previouslyChecked=new Set([...document.querySelectorAll('.shopCheck:checked')].map(c=>String(c._asset?.id||'')));
  const assets=state.allAssets.filter(x=>Number(x.owner)===id).sort((a,b)=>baseValue(b)-baseValue(a));
  if(!assets.length){el.innerHTML="<div class='empty'>No roster assets are available yet.</div>";return}
  el.innerHTML=`<div class="tiny muted" style="margin-bottom:6px">Select one or more outgoing assets.</div>
    <input id="findAssetSearch" type="search" placeholder="Search player or pick…" autocomplete="off" style="margin-bottom:8px">
    <div class="checklist" id="findAssetList">${assets.map((x,i)=>`<label class="checkrow" data-search="${esc(finderNorm(assetText(x)))}"><input class="shopCheck" type="checkbox" data-asset-index="${i}" ${previouslyChecked.has(String(x.id))?'checked':''}><span>${assetLabel(x)} ${x.type==='player'?`<span class="muted">[rank ${playerRankValue(x).rank}]</span>`:`<span class="muted">(${x.season} R${x.round})</span>`}</span></label>`).join('')}</div>`;
  el.querySelectorAll('.shopCheck').forEach((c,i)=>c._asset=assets[i]);
  const search=el.querySelector('#findAssetSearch');
  search.addEventListener('input',()=>{
    const q=finderNorm(search.value);
    el.querySelectorAll('#findAssetList .checkrow').forEach(row=>row.style.display=!q||row.dataset.search.includes(q)?'flex':'none');
  });
};

runFinder=async function(){
  const btn=document.getElementById('runFinder');btn.disabled=true;
  try{
    const me=Number(document.getElementById('findTeam').value),mode=document.getElementById('findMode').value,target=document.getElementById('findPos').value;
    if(!me){document.getElementById('finderResults').innerHTML="<div class='notice error'>Choose a team before finding trades.</div>";return}
    const selected=[...document.querySelectorAll('.shopCheck:checked')].map(c=>c._asset).filter(Boolean);
    const anchor=selected.length?selected:state.allAssets.filter(x=>x.owner===me&&x.type==='player').sort((a,b)=>baseValue(b)-baseValue(a)).slice(0,1);
    if(!anchor.length){document.getElementById('finderResults').innerHTML="<div class='notice error'>No outgoing assets are available for this team.</div>";return}
    const giveVariants=outgoingVariants(me,anchor),massive=anchor.length>2,candidates=[];
    for(const t of state.teams.filter(x=>x.id!==me)){
      const recvVariants=incomingVariants(state.allAssets.filter(x=>x.owner===t.id),target);let best=null;
      for(const give of giveVariants){
        for(const recv of recvVariants){
          const r=tradeScore(give,recv,me,t.id,mode),fairGap=Math.abs(r.fair-50);
          if(r.fair<30||r.fair>70)continue;
          const packagePenalty=Math.max(0,give.length+recv.length-2)*1.7;
          let quality=r.finderScore-fairGap*.35-packagePenalty;
          if(mode==='need')quality+=Math.min(6,Math.max(0,r.fitB)/70);
          if(mode==='value')quality+=Math.min(5,Math.max(0,r.edge)/120);
          const c={t,recv,give,r,score:Math.max(1,Math.min(99,quality)),stage:teamStage(t.id),fairGap};
          if(!best||c.score>best.score)best=c;
        }
      }
      if(best)candidates.push(best);
    }
    candidates.sort((a,b)=>b.score-a.score||a.fairGap-b.fairGap);
    let out=candidates.filter(x=>x.r.fair>=35&&x.r.fair<=65);
    if(!massive&&out.length<5){
      const have=new Set(out.map(x=>x.t.id));
      for(const c of candidates){if(have.has(c.t.id))continue;out.push(c);have.add(c.t.id);if(out.length>=5)break}
    }
    out.sort((a,b)=>b.score-a.score);
    document.getElementById('finderResults').innerHTML=out.length?out.slice(0,12).map((x,i)=>finderCardV18(x,i,me)).join(''):"<div class='empty'>No credible partner was found for this package. This usually means the selected outgoing package is unusually large or no roster has a reasonably comparable return.</div>";
  }catch(e){console.error(e);document.getElementById('finderResults').innerHTML=`<div class='notice error'>Trade Finder error: ${esc(e.message)}</div>`}
  finally{btn.disabled=false}
};

function finderCardV18(x,i,me){
  const f=x.r.fair,verdict=f>=61?'Favors you':f<=39?'Favors them':'Close to fair',edge=x.r.edge;
  const shape=`${x.give.length}-for-${x.recv.length}`;
  const negotiation=(f<40||f>60)?'<span class="pill" style="margin-left:6px">Needs negotiation</span>':'';
  return `<div class="result"><div class="top"><div><b>#${i+1} ${esc(x.t.name)}</b> ${negotiation}<div class="muted">${esc(x.stage.label)} • ${shape} • ${x.t.roster.players?.length||0} rostered players • FAAB $${Number.isFinite(state.faab[x.t.id])?state.faab[x.t.id]:'?'}</div>
  <div style="margin-top:7px"><b>You receive:</b> ${x.recv.map(assetLabel).join(' ')}</div>
  <div style="margin-top:5px"><b>You send:</b> ${x.give.map(assetLabel).join(' ')}</div></div><div><span class="score">${x.score.toFixed(0)}</span><div class="tiny muted">match</div></div></div>
  <p><b>${verdict}</b> • fairness ${f.toFixed(0)}/100 • ${edge>=0?'You receive':'They receive'} the modeled value edge: <b>${Math.abs(edge).toFixed(0)} units</b></p>
  <button class="secondary small rationaleBtn" data-rationale='${esc(JSON.stringify(explainTrade(x.r,me,x.t.id,x.recv,x.give)))}'>Trade rationale</button><div class="rationaleBody" hidden></div></div>`;
}

const finderBtn=document.getElementById('runFinder');if(finderBtn)finderBtn.onclick=runFinder;
const teamSelect=document.getElementById('findTeam');if(teamSelect)teamSelect.addEventListener('change',()=>setTimeout(renderFinderShop,0));
setTimeout(()=>{try{renderFinderShop()}catch(_){}},0);
})();
