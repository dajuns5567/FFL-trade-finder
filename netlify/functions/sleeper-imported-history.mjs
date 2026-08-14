const ROOT='https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/sleeper-data/data/sleeper';

const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const PPR_KEYS=['pts_ppr','gp','gms_active','games_played','games','gms','off_snp','off_snaps','offensive_snaps','snaps_offense','pass_att','rush_att','rec_tgt','targets'];

function compactRow(row){
  const src=row?.stats&&typeof row.stats==='object'?row.stats:(row||{});
  const out={};
  for(const k of PPR_KEYS){const n=num(src?.[k]);if(n!=null)out[k]=n;}
  return out;
}
function compactSeason(payload){
  const out={};
  if(Array.isArray(payload)){
    for(const row of payload){const id=String(row?.player_id||row?.id||'');if(id)out[id]=compactRow(row);}
  }else if(payload&&typeof payload==='object'){
    for(const [key,row] of Object.entries(payload)){const id=String(row?.player_id||key);if(id)out[id]=compactRow(row);}
  }
  return out;
}
function usable(data){
  let players=0,withGames=0,withPpr=0;
  for(const row of Object.values(data||{})){
    players++;
    const gp=num(row.gp)??num(row.gms_active)??num(row.games_played)??num(row.games)??num(row.gms)??0;
    if(gp>0)withGames++;
    if(num(row.pts_ppr)!=null)withPpr++;
  }
  return players>100&&withGames>75&&withPpr>75;
}
async function getJson(url){
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'FFL-Trade-Finder-Sleeper-Importer-Bridge'},cache:'no-store'});
  if(!r.ok)throw new Error(`${url.split('/').pop()} ${r.status}`);
  return await r.json();
}

export default async()=>{
  try{
    const manifest=await getJson(`${ROOT}/manifest.json`);
    if(!manifest?.ok||manifest?.source!=='Sleeper public API'||!manifest?.productionWeightPlan?.yearWeights)throw new Error('Importer manifest validation failed');
    const years=Object.keys(manifest.productionWeightPlan.yearWeights).map(Number).filter(Number.isFinite).sort((a,b)=>b-a);
    if(years.length<3)throw new Error('Importer manifest does not contain the required scoring window');
    const stats={},errors={};
    await Promise.all(years.map(async year=>{
      try{
        const full=await getJson(`${ROOT}/${year}/season-stats.json`);
        const data=compactSeason(full);
        if(!usable(data))throw new Error(`season ${year} failed compact validation`);
        stats[year]=data;
      }catch(e){errors[year]=String(e?.message||e);}
    }));
    const availableYears=years.filter(y=>usable(stats[y]));
    if(availableYears.length!==years.length)throw new Error(`Importer snapshot incomplete: ${JSON.stringify(errors)}`);
    return new Response(JSON.stringify({
      ok:true,
      source:'Sleeper importer snapshot',
      generatedAt:manifest.generatedAt,
      currentSeason:Number(manifest.currentSeason),
      completedWeek:Number(manifest.currentSeasonCompletedWeek)||0,
      weightPlan:manifest.productionWeightPlan,
      requiredYears:years,
      availableYears,
      complete:true,
      partial:false,
      qualifyingHistoricalSeasonMinimumGames:Number(manifest.qualifyingHistoricalSeasonMinimumGames)||8,
      pprMethod:manifest.pprMethod,
      seasonDiagnostics:manifest.seasonDiagnostics||null,
      stats
    }),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }catch(e){
    return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{status:502,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }
};
