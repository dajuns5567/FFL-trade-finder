(()=>{
const priorLoadQualifiedProduction=typeof loadQualifiedProduction==='function'?loadQualifiedProduction:null;
const SNAPSHOT_ROOT='https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/sleeper-data/data/sleeper';
const PPR_WEIGHTS_CLIENT={pass_yd:.04,pass_td:4,pass_int:-2,pass_2pt:2,rush_yd:.1,rush_td:6,rush_2pt:2,rec:1,rec_yd:.1,rec_td:6,rec_2pt:2,fum_lost:-2,kr_td:6,pr_td:6,fum_rec_td:6};
const num22=(o,k)=>{const n=Number(o?.[k]);return Number.isFinite(n)?n:0};
function standardPpr22(s){let seen=false,pts=0;for(const [k,w] of Object.entries(PPR_WEIGHTS_CLIENT)){if(Number.isFinite(Number(s?.[k])))seen=true;pts+=num22(s,k)*w}return seen?Number(pts.toFixed(4)):null}
function normalizeRow22(row){const base=row?.stats&&typeof row.stats==='object'?{...row.stats}:{...(row||{})};for(const k of ['pts_ppr','pts_half_ppr','pts_std']){const n=Number(row?.[k]);if(Number.isFinite(n)&&!Number.isFinite(Number(base[k])))base[k]=n}if(!Number.isFinite(Number(base.pts_ppr))){const p=standardPpr22(base);if(p!=null)base.pts_ppr=p}return base}
function normalizeSeason22(payload){const out={};if(Array.isArray(payload)){for(const r of payload||[]){const id=String(r?.player_id||r?.id||'');if(id)out[id]=normalizeRow22(r)}}else if(payload&&typeof payload==='object'){for(const [id,v] of Object.entries(payload)){const pid=String(v?.player_id||id);if(pid)out[pid]=normalizeRow22(v)}}return out}
function games22(row){for(const k of ['gp','gms_active','games_played','games','gms']){const n=Number(row?.[k]);if(Number.isFinite(n)&&n>=0)return n}return 0}
function usable22(data){let players=0,withGames=0,withPpr=0;for(const r of Object.values(data||{})){players++;if(games22(r)>0)withGames++;if(Number.isFinite(Number(r?.pts_ppr)))withPpr++}return players>100&&withGames>75&&withPpr>75}
function weightPlan22(season){const status=String(state.league?.status||'').toLowerCase(),leg=Math.max(0,Number(state.league?.settings?.leg)||0);if(['complete','post_season','offseason'].includes(status))return{mode:'postseason-offseason',completedWeek:18,weights:{currentYear:0,previousYear:.60,twoYearsAgo:.30,threeYearsAgo:.10},yearWeights:{[season]:.60,[season-1]:.30,[season-2]:.10}};const inSeason=['in_season','regular_season','post_season'].includes(status);if(!inSeason)return{mode:'preseason-offseason',completedWeek:0,weights:{currentYear:0,previousYear:.60,twoYearsAgo:.30,threeYearsAgo:.10},yearWeights:{[season-1]:.60,[season-2]:.30,[season-3]:.10}};const completed=Math.max(0,Math.min(18,leg>1?leg-1:0));if(completed===0)return{mode:'preseason-offseason',completedWeek:0,weights:{currentYear:0,previousYear:.60,twoYearsAgo:.30,threeYearsAgo:.10},yearWeights:{[season-1]:.60,[season-2]:.30,[season-3]:.10}};const current=.10+.50*((completed-1)/17),remaining=1-current,previous=remaining*(.55/.90),two=remaining*(.25/.90),three=remaining*(.10/.90);return{mode:'in-season',completedWeek:completed,weights:{currentYear:current,previousYear:previous,twoYearsAgo:two,threeYearsAgo:three},yearWeights:{[season]:current,[season-1]:previous,[season-2]:two,[season-3]:three}}}
async function importedHistory22(){
  const manifestResp=await fetch(`${SNAPSHOT_ROOT}/manifest.json?ts=${Date.now()}`,{cache:'no-store'});if(!manifestResp.ok)throw Error(`Sleeper importer manifest ${manifestResp.status}`);
  const m=await manifestResp.json();if(!m?.ok||m?.source!=='Sleeper public API'||!m?.productionWeightPlan?.yearWeights||!Array.isArray(m?.productionSeasons)||m.productionSeasons.length<3)throw Error('Sleeper importer manifest failed validation');
  const stats={},errors={};
  await Promise.all(m.productionSeasons.map(async y=>{try{const r=await fetch(`${SNAPSHOT_ROOT}/${y}/season-stats.json?ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw Error(`season ${y} ${r.status}`);const data=await r.json();if(!usable22(data))throw Error(`season ${y} failed client validation`);stats[y]=data}catch(e){errors[y]=String(e?.message||e)}}));
  const available=m.productionSeasons.filter(y=>usable22(stats[y]));if(available.length<3)throw Error(`Sleeper importer snapshot incomplete: ${JSON.stringify(errors)}`);
  state.sleeperHistory={generatedAt:m.generatedAt,currentSeason:Number(m.currentSeason),completedWeek:Number(m.currentSeasonCompletedWeek)||0,weightPlan:m.productionWeightPlan,chain:m.linkedLeagueSeasons||[],requiredYears:Object.keys(m.productionWeightPlan.yearWeights||{}).map(Number),availableYears:available,pprDiagnostics:m.seasonDiagnostics||null,pprScoringWeights:PPR_WEIGHTS_CLIENT,seasonFetchSource:Object.fromEntries(available.map(y=>[y,'github-importer-sleeper-snapshot'])),seasonErrors:errors,complete:true,partial:false,fallback:false,direct:false,imported:true,source:'Sleeper importer snapshot',qualifyingHistoricalSeasonMinimumGames:Number(m.qualifyingHistoricalSeasonMinimumGames)||8};
  return stats;
}
async function directSeason22(year){let last=null;for(const path of [`/stats/nfl/regular/${year}?season_type=regular`,`/stats/nfl/regular/${year}`]){try{const payload=await get(path),data=normalizeSeason22(payload);if(usable22(data))return data;last=Error(`Sleeper season ${year} returned unusable aggregate`)}catch(e){last=e}}throw last||Error(`Sleeper season ${year} unavailable`)}
function applyDirectMeta22(season,plan,availableYears,errors){state.sleeperHistory={generatedAt:new Date().toISOString(),currentSeason:Number(season),completedWeek:Number(plan.completedWeek)||0,weightPlan:plan,chain:[],requiredYears:Object.keys(plan.yearWeights||{}).map(Number),availableYears,pprScoringWeights:PPR_WEIGHTS_CLIENT,seasonFetchSource:Object.fromEntries(availableYears.map(y=>[y,'direct-sleeper-season-aggregate'])),seasonErrors:errors||{},complete:availableYears.length===Object.keys(plan.yearWeights||{}).length,partial:availableYears.length>0&&availableYears.length<Object.keys(plan.yearWeights||{}).length,fallback:false,direct:true,qualifyingHistoricalSeasonMinimumGames:8}}
async function directHistory22(season){const plan=weightPlan22(Number(season)),years=Object.keys(plan.yearWeights||{}).map(Number),stats={},errors={};await Promise.all(years.map(async y=>{try{stats[y]=await directSeason22(y)}catch(e){errors[y]=String(e?.message||e)}}));const available=years.filter(y=>usable22(stats[y]));if(!available.length)throw Error(`Direct Sleeper season history unavailable for ${years.join(', ')}`);applyDirectMeta22(season,plan,available,errors);return stats}
function applyHistoryMeta(j,fallback=false){state.sleeperHistory={generatedAt:j.generatedAt||new Date().toISOString(),currentSeason:Number(j.currentSeason||j.season)||null,completedWeek:Number(j.completedWeek)||0,weightPlan:j.weightPlan||null,chain:j.chain||[],requiredYears:j.requiredYears||j.years||Object.keys(j.weightPlan?.yearWeights||{}).map(Number),availableYears:j.availableYears||Object.keys(j.aggregatedBySeason||j.stats||{}).map(Number),qualifyingHistoricalSeasonMinimumGames:j.qualifyingHistoricalSeasonMinimumGames||8,pprDiagnostics:j.pprDiagnostics||null,pprScoringWeights:j.pprScoringWeights||null,seasonFetchSource:j.seasonFetchSource||null,seasonErrors:j.seasonErrors||null,complete:j.complete!==false,partial:j.partial===true,fallback};}
function hasAnyHistory(j,key){const data=j?.[key];return !!(j?.ok&&j?.weightPlan&&data&&Object.keys(data).length)}
loadQualifiedProduction=async function(season){
  try{return await importedHistory22()}catch(importError){console.warn('Verified Sleeper importer snapshot unavailable; trying direct Sleeper history.',importError)}
  try{return await directHistory22(season)}catch(directError){console.warn('Direct Sleeper season history unavailable; trying Netlify history service.',directError)}
  try{
    const r=await fetch(`/.netlify/functions/sleeper-history-live?leagueId=${encodeURIComponent(LEAGUE)}`,{cache:'no-store'});
    if(!r.ok)throw Error(`history endpoint ${r.status}`);
    const j=await r.json();if(!hasAnyHistory(j,'aggregatedBySeason'))throw Error(j?.error||'history endpoint returned no usable production data');
    applyHistoryMeta(j,false);
    return j.aggregatedBySeason;
  }catch(e){
    console.warn('Live Sleeper history refresh unavailable; trying PPR-safe fallback.',e);
    try{
      const r=await fetch(`/.netlify/functions/sleeper-production?season=${encodeURIComponent(season)}&leagueId=${encodeURIComponent(LEAGUE)}`,{cache:'no-store'});
      if(!r.ok)throw Error(`fallback history endpoint ${r.status}`);
      const j=await r.json();if(!hasAnyHistory(j,'stats'))throw Error(j?.error||'fallback history endpoint returned no usable data');
      applyHistoryMeta(j,true);
      return j.stats;
    }catch(fallbackError){
      console.warn('PPR-safe fallback unavailable; using legacy production fallback.',fallbackError);
      state.sleeperHistory=null;
      if(priorLoadQualifiedProduction)return priorLoadQualifiedProduction(season);
      return{};
    }
  }
};
})();
