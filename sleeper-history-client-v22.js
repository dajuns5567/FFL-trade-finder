(()=>{
const priorLoadCore22=typeof loadCore==='function'?loadCore:null;
const SNAPSHOT_URL='/sleeper-data/offense-history.json';
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
function usableCurrentSeason22(data){
  const rows=Object.values(data||{});
  return rows.length>0&&rows.some(row=>games22(row)>0);
}
function clearValueCaches22(){
  try{masterRankCache=null}catch(e){}
  try{valueCache.clear()}catch(e){}
  try{fitCache.clear()}catch(e){}
  try{stageCache.clear()}catch(e){}
}
function mergeOffenseHistory22(stats,currentSeason,qualifiedCurrentStats){
  const merged={...(state.stats||{})},current=String(currentSeason||'');
  if(current)merged[current]={...(qualifiedCurrentStats||{})};
  for(const [year,rows] of Object.entries(stats||{})){
    if(String(year)===current)continue;
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
async function hydrateImportedOffense22(){
  const r=await fetch(`${SNAPSHOT_URL}?ts=${Date.now()}`,{cache:'no-store',headers:{accept:'application/json'}});
  if(!r.ok)throw Error(`Sleeper importer snapshot ${r.status}`);
  const j=await r.json();
  if(!j?.ok||j?.source!=='Sleeper importer snapshot'||!j?.complete||!j?.weightPlan?.yearWeights||!j?.stats)throw Error('Sleeper importer compact artifact failed validation');
  const years=Object.keys(j.weightPlan.yearWeights).map(Number).filter(Number.isFinite),available=(j.availableYears||[]).map(Number),currentSeason=Number(j.currentSeason),inSeason=j.weightPlan?.mode==='in-season';
  if(years.length<3||available.length!==years.length||!years.every(y=>y===currentSeason&&inSeason?usableCurrentSeason22(j.qualifiedCurrentStats):usableSeason22(j.stats?.[y])))throw Error('Sleeper importer compact artifact is incomplete for scoring history');
  if(inSeason&&(j.currentSeasonQualification?.finalGamesOnly!==true||j.currentSeasonQualification?.fullWeekValuationGate!==true))throw Error('Current-season scoring artifact is missing the final-game/full-week valuation gate');
  mergeOffenseHistory22(j.stats,currentSeason,j.qualifiedCurrentStats||{});
  state.sleeperHistory={
    generatedAt:j.generatedAt,
    currentSeason:Number(j.currentSeason),
    completedWeek:Number(j.completedWeek)||0,
    weightPlan:j.weightPlan,
    chain:[],
    requiredYears:years,
    availableYears:available,
    pprDiagnostics:j.seasonDiagnostics||null,
    seasonFetchSource:Object.fromEntries(available.map(y=>[y,'verified-importer-compact-snapshot'])),
    seasonErrors:{},
    complete:true,
    partial:false,
    fallback:false,
    direct:false,
    imported:true,
    source:'Sleeper importer compact snapshot',
    qualifyingHistoricalSeasonMinimumGames:Number(j.qualifyingHistoricalSeasonMinimumGames)||8,
    currentSeasonQualification:j.currentSeasonQualification||null,
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
      console.error('Verified Sleeper offensive importer snapshot could not be applied.',e);
      state.sleeperHistory={...(state.sleeperHistory||{}),complete:false,partial:false,imported:false,error:String(e?.message||e)};
    }
  };
}
})();
