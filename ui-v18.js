(()=>{
function esc2(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function teamPower(t){
  const vals=(t?.roster?.players||[]).map(id=>baseValue({type:"player",id:String(id)})).sort((a,b)=>b-a);
  const top=vals.slice(0,12).reduce((a,b)=>a+b,0),depth=vals.slice(12,24).reduce((a,b)=>a+b,0);
  const picks=state.draftPicks.filter(x=>Number(x.owner)===Number(t.id)).reduce((s,x)=>s+pickValue(x),0);
  const w=Number(t?.roster?.settings?.wins)||0,l=Number(t?.roster?.settings?.losses)||0,pct=(w+l)?w/(w+l):.5;
  return top+depth*.30+picks*.06+pct*350;
}
teamStage=function(teamId){
  const teams=state.teams||[],target=teams.find(t=>Number(t.id)===Number(teamId));if(!target)return{label:"Unknown",score:0};
  const ranked=teams.map(t=>({id:Number(t.id),score:teamPower(t)})).sort((a,b)=>b.score-a.score);
  const idx=ranked.findIndex(x=>x.id===Number(teamId)),n=Math.max(1,ranked.length),pct=idx/(n-1||1),score=ranked[idx]?.score||0;
  if(pct<=.24)return{label:"Contender",score};
  if(pct>=.76)return{label:"Rebuilder",score};
  return{label:"Competitive / transitional",score};
};

function evaluatorAssets(side){
  const team=Number(document.getElementById("eval"+side)?.value);if(!team)return[];
  return state.allAssets.filter(x=>Number(x.owner)===team).sort((a,b)=>baseValue(b)-baseValue(a));
}
function evalKey(x){return `${x.type}:${x.id}`}
function renderEvalChooser(side){
  const host=document.getElementById("evalChooser"+side);if(!host)return;
  const query=(document.getElementById("evalSearch"+side)?.value||"").trim().toLowerCase();
  const selected=new Set((state["assets"+side]||[]).map(evalKey));
  const items=evaluatorAssets(side).filter(x=>!query||(x.type==="player"?playerName(x.id):x.name).toLowerCase().includes(query));
  host.innerHTML=items.length?`<div class="checklist">${items.map((x,i)=>`<label class="checkrow"><input type="checkbox" data-eval-side="${side}" data-eval-index="${i}" ${selected.has(evalKey(x))?"checked":""}><span>${assetLabel(x)} ${x.type==="player"?`<span class="muted">[rank ${playerRankValue(x).rank}]</span>`:""}</span></label>`).join("")}</div>`:"<div class='empty'>No matching assets.</div>";
  host.querySelectorAll("input[data-eval-side]").forEach((box,i)=>{box._asset=items[i];box.onchange=()=>{
    const arr=state["assets"+side],k=evalKey(box._asset),at=arr.findIndex(x=>evalKey(x)===k);
    if(box.checked&&at<0)arr.push({...box._asset});if(!box.checked&&at>=0)arr.splice(at,1);renderAssets(side);
  }});
}
function ensureEvaluatorChoosers(){
  for(const side of ["A","B"]){
    const assets=document.getElementById("assets"+side);if(!assets||document.getElementById("evalChooserWrap"+side))continue;
    const wrap=document.createElement("div");wrap.id="evalChooserWrap"+side;wrap.innerHTML=`<label style="margin-top:10px">Choose players / picks</label><input id="evalSearch${side}" type="search" placeholder="Search this team's roster…" style="margin-bottom:8px"><div id="evalChooser${side}"></div>`;
    assets.parentNode.insertBefore(wrap,assets.nextSibling);
    const old=document.getElementById("add"+side);if(old)old.style.display="none";
    document.getElementById("evalSearch"+side).addEventListener("input",()=>renderEvalChooser(side));
    const sel=document.getElementById("eval"+side);if(sel)sel.addEventListener("change",()=>{state["assets"+side]=[];renderAssets(side);renderEvalChooser(side)});
  }
  renderEvalChooser("A");renderEvalChooser("B");
}

function ensureRankingsTab(){
  if(document.getElementById("rankings"))return;
  const tabs=document.querySelector(".tabs"),main=document.querySelector("main");if(!tabs||!main)return;
  const btn=document.createElement("button");btn.dataset.tab="rankings";btn.textContent="Top Values";tabs.appendChild(btn);
  const section=document.createElement("section");section.id="rankings";section.className="tab";section.hidden=true;section.innerHTML=`<div class="card"><h2>Reference values</h2><p class="muted">Top 100 offensive players and top 50 IDPs by final Trade Value. CV is the refreshed consensus composite; TV is the 70/30 final value. PPG includes only qualifying 8+ game seasons from the rolling three-season production anchor.</p><div class="grid"><div><h3>Top 100 offense</h3><div id="topOffense"></div></div><div><h3>Top 50 defense</h3><div id="topIdp"></div></div></div></div>`;main.appendChild(section);
  btn.onclick=()=>{document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));btn.classList.add("active");document.querySelectorAll(".tab").forEach(x=>x.hidden=x.id!=="rankings");renderReferenceRankings()};
}
function rowFor(z,n){
  const x=z.x,m=playerRankValue(x),rs=rawScore(x.id),p=state.players?.[x.id]||{},team=p.team||"FA";
  const hist=rs.seasons?`${rs.ppg.toFixed(1)} PPG • ${rs.seasons} yr${rs.seasons===1?"":"s"}`:"no 8-game season";
  return `<div class="asset"><div><b>${n}. ${esc2(playerName(x.id))}</b><br><small>${esc2(groupPos(x))} • ${esc2(team)} • CV ${m.consensus??"fallback"} • TV ${m.value}</small><br><small class="muted">${hist}</small></div><span class="pill">#${m.rank}</span></div>`;
}
function renderReferenceRankings(){
  const off=document.getElementById("topOffense"),idp=document.getElementById("topIdp");if(!off||!idp)return;
  const ranked=ensureMaster();
  const offense=ranked.filter(z=>groupPos(z.x)!=="IDP").slice(0,100),defense=ranked.filter(z=>groupPos(z.x)==="IDP").slice(0,50);
  off.innerHTML=offense.map((z,i)=>rowFor(z,i+1)).join("")||"<div class='empty'>No values loaded.</div>";
  idp.innerHTML=defense.map((z,i)=>rowFor(z,i+1)).join("")||"<div class='empty'>No values loaded.</div>";
}

const priorRenderAll=renderAll;
renderAll=function(){priorRenderAll();ensureEvaluatorChoosers();ensureRankingsTab();renderReferenceRankings();};
ensureEvaluatorChoosers();ensureRankingsTab();renderReferenceRankings();
})();
