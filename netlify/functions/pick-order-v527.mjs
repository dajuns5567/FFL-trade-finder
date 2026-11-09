import {rank5050,getPickOrder5050} from './lib/pick-order-5050.mjs';
const DEFAULT_LEAGUE='1316867686394769408';
const SLEEPER='https://api.sleeper.app/v1';
const AUDIT='https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/sleeper-data/data/sleeper/league-audit';
const send=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
async function sourceJson(url){
  const response=await fetch(url,{headers:{accept:'application/json','user-agent':'FFL-TradeFinder-PickOrder/1.0'},cache:'no-store'});
  if(!response.ok)throw Error('Source unavailable ('+response.status+'): '+url.split('/').slice(-2).join('/'));
  return response.json();
}
// The canonical Sleeper importer already records standings using roster.settings:
// wins/losses/ties and fpts+fpts_decimal/100. Do not reconstruct team points
// from player stats or assume exactly 16 matchup pairs per week.
export function completedRosterStandings(rosters){
  if(!Array.isArray(rosters)||rosters.length!==32)throw Error('incomplete 32-team Sleeper roster standings');
  const rows=rosters.map(r=>{
    const s=r?.settings||{},id=Number(r?.roster_id);
    const wins=Number(s.wins),losses=Number(s.losses),ties=Number(s.ties||0);
    const integer=Number(s.fpts),decimal=Number(s.fpts_decimal||0);
    if(![wins,losses,ties,integer,decimal].every(Number.isFinite)||
        ![wins,losses,ties,integer,decimal].every(x=>x>=0)||
        !Number.isInteger(integer)||!Number.isInteger(decimal)||decimal>=100)
      throw Error('incomplete Sleeper standings for roster '+id);
    return{id,wins,losses,ties,pf:integer+decimal/100};
  });
  const games=rows[0].wins+rows[0].losses+rows[0].ties;
  if(!Number.isInteger(games)||games<1||games>18||
     rows.some(r=>r.wins+r.losses+r.ties!==games))
    throw Error('Sleeper standings are not finalized for the same completed week');
  return{rows,completedWeek:games};
}
async function verifiedLiveRankings(leagueId,season){
  // Sleeper live roster settings are authoritative; the importer saves the
  // exact same schema in league-audit/{season}/rosters.json for recovery.
  // A partially updated 32-row live response is not a completed week.
  // Only accept validated full-roster standings. The independently verified
  // importer audit is a safe fallback if live is missing or incomplete.
  try{
    const live=await sourceJson(SLEEPER+'/league/'+leagueId+'/rosters');
    return{...completedRosterStandings(live),source:'sleeper-live-rosters'};
  }catch(e){
    console.warn('pick-order-live-rosters-incomplete',String(e?.message||e));
  }
  const archived=await sourceJson(AUDIT+'/'+season+'/rosters.json?ts='+Date.now());
  return{...completedRosterStandings(archived),source:'sleeper-importer-audit'};
}
export default async function handler(req){
  if(req.method!=='GET')return send({error:'GET only'},405);
  try{
    const url=new URL(req.url),leagueId=String(url.searchParams.get('league_id')||DEFAULT_LEAGUE);
    if(!/^\d{10,22}$/.test(leagueId))return send({error:'invalid league id'},400);
    const league=await sourceJson(SLEEPER+'/league/'+leagueId);
    const season=Number(league?.season);
    if(!Number.isInteger(season)||season<2026)return send({error:'unverified league season'},503);
    let completedWeek,source='sleeper-live-rosters',ranking;
    // Current standings have all 32 verified completed-game records and
    // aggregate PF. This is the same source of truth used by the importer.
    let current=await verifiedLiveRankings(leagueId,season);
    const playoffStart=Number(league?.settings?.playoff_week_start);
    const regularSeasonEnd=Number.isInteger(playoffStart)&&playoffStart>1?playoffStart-1:18;
    if(current.completedWeek>regularSeasonEnd)
      throw Error('regular-season records not available at completion; never mix playoff results');
    completedWeek=current.completedWeek;source=current.source;
    ranking=rank5050(current.rows);
    return send({status:'current',method:'50% completed record rank + 50% completed points-for rank',
      league_id:leagueId,source,season,standings_season:season,completed_week:completedWeek,
      computed_at:new Date().toISOString(),teams:ranking.map(
        ({id,wins,losses,ties,pf,record,recordRank,pointsRank,combinedRank,projectedSlot})=>({
          roster_id:id,wins,losses,ties,points_for:Number(pf.toFixed(2)),
          win_pct:Number(record.toFixed(4)),record_rank:recordRank,
          points_rank:pointsRank,combined_rank:combinedRank,projected_slot:projectedSlot}))});
  }catch(e){
    console.warn('draft-pick-rankings-5050',String(e?.message||e));
    return send({status:'unavailable',error:'Verified Sleeper standings unavailable; no pick rank inferred'},503);
  }
}
