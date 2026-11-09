import {getPickOrder5050} from './lib/pick-order-5050.mjs';
const DEFAULT_LEAGUE='1316867686394769408';
const SLEEPER='https://api.sleeper.app/v1';
const IMPORT='https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/sleeper-data/data/sleeper/offense-history.json';
const send=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
async function sourceJson(url){
  const response=await fetch(url,{headers:{accept:'application/json'},cache:'no-store'});
  if(!response.ok)throw Error('Source unavailable ('+response.status+')');
  return response.json();
}
export default async function handler(req){
  if(req.method!=='GET')return send({error:'GET only'},405);
  try{
    const url=new URL(req.url);
    const leagueId=String(url.searchParams.get('league_id')||DEFAULT_LEAGUE);
    if(!/^\d{10,22}$/.test(leagueId))return send({error:'invalid league id'},400);
    const league=await sourceJson(SLEEPER+'/league/'+leagueId);
    const season=Number(league?.season);
    if(!Number.isInteger(season)||season<2026)return send({error:'unverified current league season'},503);
    const [nfl,qualified]=await Promise.all([
      sourceJson(SLEEPER+'/state/nfl').catch(()=>null),
      sourceJson(IMPORT).catch(()=>null)
    ]);
    const nflWeek=Number(nfl?.season)===season?Math.max(0,(Number(nfl?.week)||1)-1):0;
    const qualifiedWeek=qualified?.complete===true&&qualified?.currentSeasonQualification?.fullWeekValuationGate===true&&Number(qualified?.currentSeason)===season?
      Math.max(0,Math.min(18,Number(qualified.completedWeek)||0)):0;
    let completedWeek=Math.max(nflWeek,qualifiedWeek),sourceLeague=leagueId,sourceSeason=season;
    // Preseason: use verified preceding league's last full season, not MIDA.
    if(completedWeek===0&&league?.previous_league_id){
      sourceLeague=String(league.previous_league_id);sourceSeason=season-1;completedWeek=18;
    }
    if(completedWeek<1)return send({status:'unavailable',error:'no verified completed week',season},503);
    completedWeek=Math.min(18,completedWeek);
    const ranking=await getPickOrder5050(sourceLeague,completedWeek);
    return send({status:'current',method:'50% completed record rank + 50% completed points-for rank',league_id:leagueId,
      source_league_id:sourceLeague,season,standings_season:sourceSeason,completed_week:completedWeek,
      computed_at:new Date().toISOString(),
      teams:ranking.map(({id,wins,losses,ties,pf,record,recordRank,pointsRank,combinedRank,projectedSlot})=>
        ({roster_id:id,wins,losses,ties,points_for:Number(pf.toFixed(2)),win_pct:Number(record.toFixed(4)),
          record_rank:recordRank,points_rank:pointsRank,combined_rank:combinedRank,projected_slot:projectedSlot}))});
  }catch(e){
    console.warn('draft-pick-rankings-5050',String(e?.message||e));
    return send({status:'unavailable',error:'Verified Sleeper standings unavailable; no pick rank inferred'},503);
  }
}
