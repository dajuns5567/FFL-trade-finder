(()=>{
const clamp=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
function consensusDetail(id){return state.consensusComposite?.detailsById?.[String(id)]||null}
function consensusCompositeValue(id){const v=Number(state.consensusComposite?.byId?.[String(id)]);return Number.isFinite(v)&&v>0?v:null}

rawScore=function(id){
  const years=Object.keys(state.stats||{}).map(Number).filter(Number.isFinite).sort((a,b)=>b-a),samples=[];
  const activeScoring={...scoring,...(state.league?.scoring_settings||{})};
  for(const y of years){
    const s=state.stats?.[y]?.[id];if(!s)continue;
    let points=0;for(const [k,w] of Object.entries(activeScoring))points+=(Number(s[k])||0)*Number(w||0);
    const gamesRaw=Number(s.gp||s.gms_active||s.games_played||0);
    if(points===0&&gamesRaw<=0)continue;
    const games=gamesRaw>0?gamesRaw:17;
    samples.push({season:y,ppg:points/Math.max(1,games),points,stats:s});
    if(samples.length===3)break;
  }
  if(!samples.length)return{ppg:0,seasons:0,stats:{}};
  const weights=[.50,.30,.20].slice(0,samples.length),den=weights.reduce((a,b)=>a+b,0);
  return{ppg:samples.reduce((sum,x,i)=>sum+x.ppg*weights[i],0)/den,seasons:samples.length,stats:samples[0].stats,samples};
};

consensusRank=function(id){
  const d=consensusDetail(id);if(!d)return null;
  const p=groupPos({type:"player",id});
  if(p==="IDP")return Number.isFinite(Number(d.idpRank))?Number(d.idpRank):null;
  return Number.isFinite(Number(d.offenseRank))?Number(d.offenseRank):null;
};

function idpProfile(id){
  const ps=new Set((state.players?.[id]?.fantasy_positions||[]).map(x=>String(x).toUpperCase()));
  if([...ps].some(x=>["DL","DE","DT"].includes(x)))return{type:"front",scarcity:1.12,benchmark:9};
  if(ps.has("LB"))return{type:"lb",scarcity:1.03,benchmark:9};
  if([...ps].some(x=>["DB","CB","S"].includes(x)))return{type:"db",scarcity:1.01,benchmark:8};
  return{type:"idp",scarcity:1.00,benchmark:9};
}
function offenseScarcity(p,detail){
  const rank=Number(detail?.offenseRank);
  if(p==="QB"){
    if(Number.isFinite(rank)&&rank<=24)return 1.22;
    if(Number.isFinite(rank)&&rank<=72)return 1.18;
    return 1.15;
  }
  if(p==="RB"){
    if(Number.isFinite(rank)&&rank<=80)return 1.21;
    if(Number.isFinite(rank)&&rank<=180)return 1.18;
    return 1.16;
  }
  return{WR:1.10,TE:1.02}[p]||1;
}
function idpProductionFactor(rs,profile,eliteFront){
  if(!rs.seasons)return eliteFront?1.04:.94;
  // Three-year regular-season Sleeper scoring is the dominant signal inside the 30% league-context bucket.
  // Recent season remains most important (50/30/20), but sustained league-specific PPG can materially lift elite IDPs.
  const ratio=rs.ppg/Math.max(1,profile.benchmark);
  if(eliteFront)return clamp(.78,.72+.58*ratio,1.95);
  if(profile.type==="lb")return clamp(.80,.76+.42*ratio,1.58);
  if(profile.type==="db")return clamp(.80,.78+.38*ratio,1.50);
  return clamp(.80,.78+.40*ratio,1.52);
}
function leagueContextValue(x,consensus){
  const p=groupPos(x),rs=rawScore(x.id),detail=consensusDetail(x.id);
  if(p==="IDP"){
    const profile=idpProfile(x.id),idpRank=Number(detail?.idpRank);
    const eliteFront=profile.type==="front"&&Number.isFinite(idpRank)&&idpRank<=30;
    const scarcity=eliteFront?1.35:profile.scarcity;
    const production=idpProductionFactor(rs,profile,eliteFront);
    return consensus*scarcity*production*trendFactor(x.id);
  }
  const scarcity=offenseScarcity(p,detail);
  const benchmark={QB:18,RB:11,WR:11,TE:8}[p]||10;
  const production=rs.seasons?clamp(.84,.90+.15*(rs.ppg/benchmark),1.20):.96;
  return consensus*scarcity*production*trendFactor(x.id);
}

function modelPlayerValue(x){
  const consensus=consensusCompositeValue(x.id),p=groupPos(x);
  if(!consensus){
    const rs=rawScore(x.id),cap=p==="IDP"?90:150;
    return{value:Math.max(1,Math.round(Math.min(cap,rs.ppg*9))),consensus:null,context:null,fallback:true};
  }
  const context=leagueContextValue(x,consensus),detail=consensusDetail(x.id),idpRank=Number(detail?.idpRank),profile=p==="IDP"?idpProfile(x.id):null;
  const eliteFront=p==="IDP"&&profile?.type==="front"&&Number.isFinite(idpRank)&&idpRank<=30;
  let value=.70*consensus+.30*context;
  // Wider IDP context ceiling allows exceptional three-year league production to matter, while consensus remains 70%.
  value=clamp(consensus*.78,value,consensus*(eliteFront?1.62:p==="IDP"?1.32:1.28));
  const elite=(Number(detail?.offenseRank)<=24)||(p==="IDP"&&idpRank<=20);
  if(elite)value=Math.max(value,consensus*.94);
  const fringe=(Number(detail?.offenseRank)>220)||(p==="IDP"&&idpRank>120);
  if(fringe)value=Math.min(value,consensus*1.12);
  return{value:Math.max(1,Math.round(value)),consensus:Math.round(consensus),context:Math.round(context),fallback:false};
}

masterRankings=function(){return state.allAssets.filter(x=>x.type==="player").map(x=>({x,...modelPlayerValue(x)})).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){
  const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));
  if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};
  const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=7;
  return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context};
};
baseValue=function(x){if(x.type==="pick")return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
assetLabel=function(x){if(x.type==="pick")return x.name;const m=playerRankValue(x),cv=m.consensus==null?"fallback":m.consensus;return `${playerName(x.id)} <span class="muted">(${groupPos(x)} • CV ${cv} • TV ${m.value})</span>`};

refreshConsensus=async function(){
  const players=Object.entries(state.players||{}).filter(([,p])=>p?.fantasy_positions?.length).map(([id,p])=>({id,name:[p.first_name,p.last_name].filter(Boolean).join(" ")||p.full_name||id,position:(p.fantasy_positions||[])[0],positions:p.fantasy_positions||[],team:p.team||null}));
  const urls=["/.netlify/functions/update","/api/update"];let lastError=null;
  for(const url of urls){
    try{
      const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({leagueId:LEAGUE,players,season:FALLBACK_SEASON}),cache:"no-store"});
      if(!r.ok){lastError=Error(`Consensus endpoint ${r.status}`);continue}
      const payload=await r.json();if(!payload?.summary||!payload?.composite){lastError=Error(payload?.error||"Consensus endpoint returned no composite");continue}
      renderConsensusDiagnostics(payload.summary);state.rankings=payload.sources||{};state.consensusComposite=payload.composite;
      masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();return Number(payload.summary.successful||0);
    }catch(e){lastError=e}
  }
  throw lastError||Error("Consensus refresh failed");
};

loadCore=async function(){
  status("Loading Sleeper league, users and rosters…");
  const league=await get("/league/"+LEAGUE);
  const [users,rosters,tradedPicks]=await Promise.all([get("/league/"+LEAGUE+"/users"),get("/league/"+LEAGUE+"/rosters"),get("/league/"+LEAGUE+"/traded_picks").catch(()=>[])]);
  state.league=league;state.users=users;state.rosters=rosters;state.tradedPicks=Array.isArray(tradedPicks)?tradedPicks:[];
  buildTeams();fillSelects();renderLeague();renderFinderShop();updateStageLabel();
  status(`Loaded <b>${state.teams.length} teams</b> from Sleeper. Loading player data and scoring history…`,"success");
  const season=Number(league?.season)||FALLBACK_SEASON,years=[season,season-1,season-2,season-3];
  const [players,trending,...seasonStats]=await Promise.all([get("/players/nfl").catch(()=>null),get("/players/nfl/trending/add?lookback_hours=168&limit=100").catch(()=>[]),...years.map(y=>get("/stats/nfl/regular/"+y+"?season_type=regular").catch(()=>({}))) ]);
  if(players)state.players=players;state.stats=Object.fromEntries(years.map((y,i)=>[y,seasonStats[i]||{}]));
  state.trending=Array.isArray(trending)?Object.fromEntries(trending.map(a=>[a.player_id,Number(a.count||a.adds||1)])):(trending||{});
  buildTeams();renderAll();cacheSet("fll_sleeper_snapshot",{league:state.league,users:state.users,rosters:state.rosters,players:state.players,stats:state.stats,trending:state.trending,rankings:state.rankings,consensusComposite:state.consensusComposite,tradedPicks:state.tradedPicks,draftPicks:state.draftPicks,lastUpdate:new Date().toISOString()});
  status(`Loaded <b>${state.teams.length} teams</b> and <b>${state.allAssets.filter(x=>x.type==="player").length} rostered players</b> from Sleeper. Refreshing consensus references in the background…`,"success");
};

updateData=async function(){
  const btn=document.getElementById("updateBtn");btn.disabled=true;
  try{
    await loadCore();let consensusCount=0;try{consensusCount=await refreshConsensus()}catch(e){console.error(e)}
    buildTeams();renderAll();state.lastUpdate=new Date().toISOString();
    cacheSet("fll_sleeper_snapshot",{league:state.league,users:state.users,rosters:state.rosters,players:state.players,stats:state.stats,trending:state.trending,rankings:state.rankings,consensusComposite:state.consensusComposite,tradedPicks:state.tradedPicks,draftPicks:state.draftPicks,lastUpdate:state.lastUpdate});
    status(`Updated <b>${new Date().toLocaleString()}</b>. Sleeper core data loaded; consensus sources: <b>${consensusCount}/7</b> refreshed. Consensus composite values recalculated.`,"success");
  }catch(e){console.error(e);const cached=cacheGet("fll_sleeper_snapshot");if(cached){state={...state,...cached};buildTeams();renderAll();status(`Live update failed: <b>${esc(e.message)}</b>. Cached Sleeper snapshot restored.`,"error")}else status(`Update failed: <b>${esc(e.message)}</b>. Sleeper data could not be loaded in this browser.`,"error")}
  finally{btn.disabled=false}
};

document.getElementById("updateBtn").onclick=updateData;
const model=document.querySelector("#settings .card");if(model){const n=document.createElement("div");n.className="notice success";n.innerHTML="V17 valuation test: final player trade value = <b>70% refreshed Consensus Composite Value + 30% league context</b>. Offense and IDP use separate consensus/value curves. The league-context layer uses three-year regular-season Sleeper scoring as a major IDP signal (50/30/20 recency weighting), plus league scoring and positional scarcity. Superflex QB scarcity and a modest RB scarcity premium remain active without penalizing depth RBs.";model.appendChild(n)}
})();
