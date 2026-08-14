(()=>{
const priorLoadCore22=typeof loadCore==='function'?loadCore:null;
const SNAPSHOT_URL='/sleeper-data/offense-history.json';
const IDP_HISTORY_URL='/.netlify/functions/idp-history';
const OFFENSE_POS22=new Set(['QB','RB','WR','TE']);

const num22=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
function games22(row){for(const k of ['gp','gms_active','games_played','games','gms']){const n=num22(row?.[k]);if(n!=null&&n>=0)return n}return 0}
function usableSeason22(data){
  let players=0,withGames=0,withPpr=0;
  for(const [id,row] of Object.entries(data||{})){
    const ps=state.players?.[id]?.fantasy_positions||[];
    if(!ps.some(p=>OFFENSE_POS22.has(String(p).toUpperCase())))continue;
    players++;
    if(games22(row)>0)withGames++;
    if(num22(row?.pts_ppr)!=null)withPpr++;
  }
  return players>75&&withGames>50&&withPpr>50;
}
function usableIdpSeason22(data){
  let players=0,withGames=0;
  for(const [id,row] of Object.entries(data||{})){
    if(groupPos({type:'player',id})!=='IDP')continue;
    players++;
    const src=row?.stats&&typeof row.stats==='object'?row.stats:row;
    if(games22(src)>0)withGames++;
  }
  return players>100&&withGames>75;
}
function clearValueCaches22(){
  try{masterRankCache=null}catch(e){}
  try{valueCache.clear()}catch(e){}
  try{fitCache.clear()}catch(e){}
  try{stageCache.clear()}catch(e){}
}
function mergeOffenseHistory22(stats){
  const merged={...(state.stats||{})};
  for(const [year,rows] of Object.entries(stats||{})){
    const yr={...(merged[year]||{})};
    for(const [id,row] of Object.entries(rows||{})){
      const ps=state.players?.[id]?.fantasy_positions||[];
      if(!ps.some(p=>OFFENSE_POS22.has(String(p).toUpperCase())))continue;
      const existing=yr[id]?.stats&&typeof yr[id].stats==='object'?yr[id].stats:(yr[id]||{});
      yr[id]={...existing,...row};
    }
    merged[year]=yr;
  }
  state.stats=merged;
}
function mergeIdpHistory22(stats){
  const merged={...(state.stats||{})};
  for(const [year,rows] of Object.entries(stats||{})){
    const yr={...(merged[year]||{})};
    for(const [id,row] of Object.entries(rows||{})){
      if(groupPos({type:'player',id})!=='IDP')continue;
      const src=row?.stats&&typeof row.stats==='object'?row.stats:row;
      const existing=yr[id]?.stats&&typeof yr[id].stats==='object'?yr[id].stats:(yr[id]||{});
      yr[id]={...existing,...src};
    }
    merged[year]=yr;
  }
  state.stats=merged;
}
async function fetchIdpHistory22(years){
  const idpIds=Object.keys(state.players||{}).filter(id=>groupPos({type:'player',id})==='IDP');
  const r=await fetch(IDP_HISTORY_URL,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({years,idpIds}),cache:'no-store'});
  if(!r.ok)throw Error(`Sleeper IDP history endpoint ${r.status}`);
  const j=await r.json();
  if(!j?.ok||!j?.stats)throw Error(j?.error||'Sleeper IDP history endpoint returned no verified stats');
  for(const year of years)if(!usableIdpSeason22(j.stats?.[year]))throw Error(`Sleeper IDP season ${year} failed validation`);
  return j.stats;
}
async function hydrateImportedOffense22(){
  const r=await fetch(`${SNAPSHOT_URL}?ts=${Date.now()}`,{cache:'no-store',headers:{accept:'application/json'}});
  if(!r.ok)throw Error(`Sleeper importer snapshot ${r.status}`);
  const j=await r.json();
  if(!j?.ok||j?.source!=='Sleeper importer snapshot'||!j?.complete||!j?.weightPlan?.yearWeights||!j?.stats)throw Error('Sleeper importer compact artifact failed validation');
  const years=Object.keys(j.weightPlan.yearWeights).map(Number).filter(Number.isFinite),available=(j.availableYears||[]).map(Number);
  if(years.length<3||available.length!==years.length||!years.every(y=>usableSeason22(j.stats?.[y])))throw Error('Sleeper importer compact artifact is incomplete for offensive history');
  const idpStats=await fetchIdpHistory22(years);
  mergeIdpHistory22(idpStats);
  mergeOffenseHistory22(j.stats);
  state.sleeperHistory={
    generatedAt:j.generatedAt,
    currentSeason:Number(j.currentSeason),
    completedWeek:Number(j.completedWeek)||0,
    weightPlan:j.weightPlan,
    chain:[],
    requiredYears:years,
    availableYears:available,
    pprDiagnostics:j.seasonDiagnostics||null,
    seasonFetchSource:Object.fromEntries(available.map(y=>[y,'verified-importer-compact-offense-plus-server-filtered-verified-idp-season-stats'])),
    seasonErrors:{},
    complete:true,
    partial:false,
    fallback:false,
    direct:false,
    imported:true,
    source:'Sleeper importer snapshot with verified server-filtered IDP season history',
    qualifyingHistoricalSeasonMinimumGames:Number(j.qualifyingHistoricalSeasonMinimumGames)||8,
    pprMethod:j.pprMethod||null
  };
  clearValueCaches22();
  return j;
}
window.refreshImportedOffenseHistory=hydrateImportedOffense22;

if(priorLoadCore22){
  loadCore=async function(){
    await priorLoadCore22();
    try{
      await hydrateImportedOffense22();
      if(typeof renderAll==='function')renderAll();
    }catch(e){
      console.error('Verified Sleeper scoring history could not be applied.',e);
      state.sleeperHistory={...(state.sleeperHistory||{}),complete:false,partial:false,imported:false,error:String(e?.message||e)};
    }
  };
}
})();
