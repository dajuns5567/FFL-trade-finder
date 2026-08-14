(()=>{
const clamp=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
function consensusDetail(id){return state.consensusComposite?.detailsById?.[String(id)]||null}
function consensusCompositeValue(id){const v=Number(state.consensusComposite?.byId?.[String(id)]);return Number.isFinite(v)&&v>0?v:null}
function statPayload(row){return row?.stats&&typeof row.stats==='object'?row.stats:(row||{})}
function gamesPlayed(row){const s=statPayload(row);for(const k of ['gp','gms_active','games_played','games','gms']){const n=Number(s?.[k]);if(Number.isFinite(n)&&n>=0)return n}return 0}
function scoredStat(s,key){
  if(Number.isFinite(Number(s?.[key])))return Number(s[key]);
  if(key.startsWith('idp_')){const bare=key.slice(4);if(Number.isFinite(Number(s?.[bare])))return Number(s[bare]);}
  const aliases={idp_sack:['sack'],idp_qb_hit:['qb_hit','qb_hits'],idp_tkl_loss:['tkl_loss','tfl'],idp_blk_kick:['blk_kick'],idp_int:['int'],idp_int_yd:['int_yd'],idp_fum_rec:['fum_rec'],idp_fum_rec_yd:['fum_rec_yd'],idp_ff:['ff'],idp_safety:['safety'],idp_tkl_ast:['tkl_ast','ast_tkl'],idp_tkl_solo:['tkl_solo','solo_tkl'],idp_pass_def:['pass_def','pd']};
  for(const a of aliases[key]||[]){if(Number.isFinite(Number(s?.[a])))return Number(s[a]);}
  return 0;
}

rawScore=function(id){
  const years=Object.keys(state.stats||{}).map(Number).filter(Number.isFinite).sort((a,b)=>b-a),samples=[];
  const activeScoring={...scoring,...(state.league?.scoring_settings||{})};
  for(const y of years){
    const row=state.stats?.[y]?.[id];if(!row)continue;
    const s=statPayload(row),games=gamesPlayed(row);if(!Number.isFinite(games)||games<8)continue;
    let points=0;for(const [k,w] of Object.entries(activeScoring))points+=scoredStat(s,k)*Number(w||0);
    samples.push({season:y,ppg:points/games,points,games,stats:s});if(samples.length===3)break;
  }
  if(!samples.length)return{ppg:0,seasons:0,stats:{},samples:[],confidence:0};
  const weights=[.50,.30,.20].slice(0,samples.length),den=weights.reduce((a,b)=>a+b,0),ppg=samples.reduce((sum,x,i)=>sum+x.ppg*weights[i],0)/den;
  const seasonConfidence=({1:.42,2:.72,3:1})[samples.length]||1,gameConfidence=clamp(.65,samples.reduce((s,x)=>s+Math.min(1,x.games/14),0)/samples.length,1);
  return{ppg,seasons:samples.length,stats:samples[0].stats,samples,confidence:seasonConfidence*gameConfidence};
};

consensusRank=function(id){const d=consensusDetail(id);if(!d)return null;const p=groupPos({type:'player',id});if(p==='IDP')return Number.isFinite(Number(d.idpRank))?Number(d.idpRank):null;return Number.isFinite(Number(d.offenseRank))?Number(d.offenseRank):null};
function idpProfile(id){const ps=new Set((state.players?.[id]?.fantasy_positions||[]).map(x=>String(x).toUpperCase()));if([...ps].some(x=>['DL','DE','DT'].includes(x)))return{type:'front',scarcity:1.15,benchmark:9,base:790};if(ps.has('LB'))return{type:'lb',scarcity:1.06,benchmark:9,base:710};if([...ps].some(x=>['DB','CB','S'].includes(x)))return{type:'db',scarcity:1.02,benchmark:8,base:640};return{type:'idp',scarcity:1,benchmark:9,base:680}}
function playerAge(id){const p=state.players?.[id]||{},age=Number(p.age);if(Number.isFinite(age)&&age>0)return age;if(p.birth_date){const d=new Date(p.birth_date);if(!Number.isNaN(d.getTime()))return (Date.now()-d.getTime())/(365.2425*86400000)}return null}
function idpAgeFactor(id){const age=playerAge(id);if(!Number.isFinite(age))return 1;if(age<=23)return 1.12;if(age<=25)return 1.09;if(age<=27)return 1.05;if(age<=29)return 1.02;if(age<=31)return .99;if(age<=33)return .95;return .90}
function offenseScarcity(p,detail){const rank=Number(detail?.offenseRank);if(p==='QB'){if(Number.isFinite(rank)&&rank<=24)return 1.22;if(Number.isFinite(rank)&&rank<=72)return 1.18;return 1.15}if(p==='RB'){if(Number.isFinite(rank)&&rank<=80)return 1.21;if(Number.isFinite(rank)&&rank<=180)return 1.18;return 1.16}return{WR:1.10,TE:1.02}[p]||1}
function offenseProductionFactor(rs,benchmark){if(!rs.seasons)return 1;const raw=clamp(.84,.90+.15*(rs.ppg/benchmark),1.20);return 1+rs.confidence*(raw-1)}
function idpProductionValue(id,rs){const profile=idpProfile(id);if(!rs.seasons)return null;const ratio=rs.ppg/Math.max(1,profile.benchmark),adjusted=1+rs.confidence*(ratio-1);return clamp(140,profile.base*Math.pow(clamp(.50,adjusted,2.70),1.78)*profile.scarcity*idpAgeFactor(id),2100)}
function idpLeagueContext(id,consensus,detail,rs){
  const profile=idpProfile(id),idpRank=Number(detail?.idpRank),eliteFront=profile.type==='front'&&Number.isFinite(idpRank)&&idpRank<=30;
  const scarcity=eliteFront?1.25:profile.scarcity,age=idpAgeFactor(id),prod=idpProductionValue(id,rs);
  if(Number.isFinite(prod))return prod;
  // Missing qualified history is neutral, not a penalty. Use a conservative dynasty/scarcity baseline until production qualifies.
  return consensus*scarcity*age;
}
function leagueContextValue(x,consensus){const p=groupPos(x),rs=rawScore(x.id),detail=consensusDetail(x.id);if(p==='IDP')return idpLeagueContext(x.id,consensus,detail,rs)*trendFactor(x.id);const scarcity=offenseScarcity(p,detail),benchmark={QB:18,RB:11,WR:11,TE:8}[p]||10,production=offenseProductionFactor(rs,benchmark);return consensus*scarcity*production*trendFactor(x.id)}

function modelPlayerValue(x){
  const consensus=consensusCompositeValue(x.id),p=groupPos(x),rs=rawScore(x.id);
  if(!consensus){
    if(p==='IDP'&&rs.seasons){const prod=idpProductionValue(x.id,rs);const value=Math.max(45,Math.min(520,Math.round((prod||140)*(.24+.24*rs.confidence))));return{value,consensus:null,context:Math.round(prod||0),fallback:true}}
    const cap=p==='IDP'?85:120;return{value:Math.max(1,Math.round(Math.min(cap,rs.ppg*6))),consensus:null,context:null,fallback:true};
  }
  const context=leagueContextValue(x,consensus),detail=consensusDetail(x.id),idpRank=Number(detail?.idpRank);let value;
  if(p==='IDP'){
    // IDP-only change: 50% refreshed consensus + 50% league-specific context.
    value=.50*consensus+.50*context;
    // Broad safety rails only: allow league production to correct generic IDP markets without creating offensive-level IDP prices.
    value=clamp(consensus*.72,value,Math.max(consensus*2.70,consensus+900));
    const elite=idpRank<=20;if(elite)value=Math.max(value,consensus*.92);
    const strong=rs.seasons>0&&rs.confidence>0&&rs.ppg>=idpProfile(x.id).benchmark*1.15;
    if(idpRank>150&&!strong)value=Math.min(value,consensus*1.35);
  }else{
    // Offensive valuation is intentionally unchanged: 70% consensus + 30% league context.
    value=.70*consensus+.30*context;
    value=clamp(consensus*.78,value,consensus*1.28);
    if(Number(detail?.offenseRank)<=24)value=Math.max(value,consensus*.94);
    if(Number(detail?.offenseRank)>220)value=Math.min(value,consensus*1.12);
  }
  return{value:Math.max(1,Math.round(value)),consensus:Math.round(consensus),context:Math.round(context),fallback:false};
}
function valuationUniverse(){const ids=new Set(state.allAssets.filter(x=>x.type==='player').map(x=>String(x.id)));for(const id of Object.keys(state.consensusComposite?.byId||{}))ids.add(String(id));return [...ids].filter(id=>state.players?.[id]?.fantasy_positions?.length).map(id=>({type:'player',id,owner:state.allAssets.find(x=>x.type==='player'&&String(x.id)===id)?.owner??null}))}
masterRankings=function(){return valuationUniverse().map(x=>({x,...modelPlayerValue(x)})).sort((a,b)=>b.value-a.value)};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);if(valueCache.has(x.id))return valueCache.get(x.id);const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
assetLabel=function(x){if(x.type==='pick')return x.name;const m=playerRankValue(x),cv=m.consensus==null?'fallback':m.consensus;return `${playerName(x.id)} <span class="muted">(${groupPos(x)} • CV ${cv} • TV ${m.value})</span>`};

refreshConsensus=async function(){const players=Object.entries(state.players||{}).filter(([,p])=>p?.fantasy_positions?.length).map(([id,p])=>({id,name:[p.first_name,p.last_name].filter(Boolean).join(' ')||p.full_name||id,position:(p.fantasy_positions||[])[0],positions:p.fantasy_positions||[],team:p.team||null}));const urls=['/.netlify/functions/update','/api/update'];let lastError=null;for(const url of urls){try{const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({leagueId:LEAGUE,players,season:FALLBACK_SEASON}),cache:'no-store'});if(!r.ok){lastError=Error(`Consensus endpoint ${r.status}`);continue}const payload=await r.json();if(!payload?.summary||!payload?.composite){lastError=Error(payload?.error||'Consensus endpoint returned no composite');continue}renderConsensusDiagnostics(payload.summary);state.rankings=payload.sources||{};state.consensusComposite=payload.composite;masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();return Number(payload.summary.successful||0)}catch(e){lastError=e}}throw lastError||Error('Consensus refresh failed')};
async function loadQualifiedProduction(season){try{const r=await fetch(`/.netlify/functions/sleeper-production?season=${season}`,{cache:'no-store'});if(!r.ok)throw Error(`production endpoint ${r.status}`);const j=await r.json();if(!j?.ok||!j?.stats)throw Error('production endpoint returned no stats');return j.stats}catch(e){console.warn('Weekly production aggregation unavailable; using Sleeper season aggregates as fallback.',e);const years=[season-1,season-2,season-3],rows=await Promise.all(years.map(y=>get('/stats/nfl/regular/'+y+'?season_type=regular').catch(()=>({}))));return Object.fromEntries(years.map((y,i)=>[y,rows[i]||{}]))}}
loadCore=async function(){status('Loading Sleeper league, users and rosters…');const league=await get('/league/'+LEAGUE);const [users,rosters,tradedPicks]=await Promise.all([get('/league/'+LEAGUE+'/users'),get('/league/'+LEAGUE+'/rosters'),get('/league/'+LEAGUE+'/traded_picks').catch(()=>[])]);state.league=league;state.users=users;state.rosters=rosters;state.tradedPicks=Array.isArray(tradedPicks)?tradedPicks:[];buildTeams();fillSelects();renderLeague();renderFinderShop();updateStageLabel();status(`Loaded <b>${state.teams.length} teams</b> from Sleeper. Loading player data and qualified 3-year scoring history…`,'success');const season=Number(league?.season)||FALLBACK_SEASON;const [players,trending,production]=await Promise.all([get('/players/nfl').catch(()=>null),get('/players/nfl/trending/add?lookback_hours=168&limit=100').catch(()=>[]),loadQualifiedProduction(season)]);if(players)state.players=players;state.stats=production||{};state.trending=Array.isArray(trending)?Object.fromEntries(trending.map(a=>[a.player_id,Number(a.count||a.adds||1)])):(trending||{});buildTeams();renderAll();cacheSet('fll_sleeper_snapshot',{league:state.league,users:state.users,rosters:state.rosters,players:state.players,stats:state.stats,trending:state.trending,rankings:state.rankings,consensusComposite:state.consensusComposite,tradedPicks:state.tradedPicks,draftPicks:state.draftPicks,lastUpdate:new Date().toISOString()});status(`Loaded <b>${state.teams.length} teams</b> and <b>${state.allAssets.filter(x=>x.type==='player').length} rostered players</b> from Sleeper. Refreshing consensus references in the background…`,'success')};
updateData=async function(){const btn=document.getElementById('updateBtn');btn.disabled=true;try{await loadCore();let consensusCount=0;try{consensusCount=await refreshConsensus()}catch(e){console.error(e)}buildTeams();renderAll();state.lastUpdate=new Date().toISOString();cacheSet('fll_sleeper_snapshot',{league:state.league,users:state.users,rosters:state.rosters,players:state.players,stats:state.stats,trending:state.trending,rankings:state.rankings,consensusComposite:state.consensusComposite,tradedPicks:state.tradedPicks,draftPicks:state.draftPicks,lastUpdate:state.lastUpdate});status(`Updated <b>${new Date().toLocaleString()}</b>. Sleeper core data loaded; consensus sources: <b>${consensusCount}/7</b> refreshed. Consensus composite values recalculated.`,'success')}catch(e){console.error(e);const cached=cacheGet('fll_sleeper_snapshot');if(cached){state={...state,...cached};buildTeams();renderAll();status(`Live update failed: <b>${esc(e.message)}</b>. Cached Sleeper snapshot restored.`,'error')}else status(`Update failed: <b>${esc(e.message)}</b>. Sleeper data could not be loaded in this browser.`,'error')}finally{btn.disabled=false}};
document.getElementById('updateBtn').onclick=updateData;
const model=document.querySelector('#settings .card');if(model){const n=document.createElement('div');n.className='notice success';n.innerHTML='V20 valuation test: <b>offense remains 70% Consensus Composite + 30% league context</b>. <b>IDP is now 50% Consensus Composite + 50% IDP league context</b>. IDP context uses this league\'s Sleeper scoring, qualified 8+ game PPG history with 50/30/20 recency weighting, sample confidence, IDP positional scarcity, dynasty age context, and conservative missing-history treatment.';model.appendChild(n)}
})();
