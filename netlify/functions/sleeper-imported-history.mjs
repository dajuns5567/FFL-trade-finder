const URL='https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/sleeper-data/data/sleeper/offense-history.json';

const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
function usable(data){
  let players=0,withGames=0,withPpr=0;
  for(const row of Object.values(data||{})){
    players++;
    const gp=num(row?.gp)??num(row?.gms_active)??num(row?.games_played)??num(row?.games)??num(row?.gms)??0;
    if(gp>0)withGames++;
    if(num(row?.pts_ppr)!=null)withPpr++;
  }
  return players>100&&withGames>75&&withPpr>75;
}

export default async()=>{
  try{
    const r=await fetch(`${URL}?ts=${Date.now()}`,{headers:{accept:'application/json','user-agent':'FFL-Trade-Finder-Sleeper-Importer-Bridge/1.1'},cache:'no-store'});
    if(!r.ok)throw new Error(`offense-history.json ${r.status}`);
    const j=await r.json();
    if(!j?.ok||j?.source!=='Sleeper importer snapshot'||!j?.complete||!j?.weightPlan?.yearWeights||!j?.stats)throw new Error('Compact importer history failed validation');
    const years=Object.keys(j.weightPlan.yearWeights).map(Number).filter(Number.isFinite),available=(j.availableYears||[]).map(Number);
    if(years.length<3||available.length!==years.length||!years.every(y=>usable(j.stats?.[y])))throw new Error('Compact importer history is incomplete');
    return new Response(JSON.stringify(j),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }catch(e){
    return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{status:502,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }
};
