// Read-only prerequisites for future-season publication. No writes, no
// automatic switch to an unrelated league, no changes to 2026 archive bytes.
export const INQUIRER_ORIGINAL_SEASON=2026;
export const INQUIRER_ORIGINAL_LEAGUE='1316867686394769408';
const id=x=>String(x??'').trim();
const year=x=>Number(x);
const validId=x=>/^\d{15,24}$/.test(id(x));
export function verifiedSuccessor({previous,candidates,targetSeason}){
 const season=year(targetSeason),prior=year(previous?.season),priorId=id(previous?.league_id);
 if(!Number.isInteger(season)||season!==prior+1||!validId(priorId)||
    previous?.sport!=='nfl'||Number(previous?.total_rosters)!==32)
  throw Error('Unverified prior league identity or nonconsecutive season');
 const choices=new Map();
 for(const row of candidates||[]){
  if(year(row?.season)!==season||id(row?.previous_league_id)!==priorId)continue;
  if(!validId(row?.league_id)||id(row.league_id)===priorId||row.sport!=='nfl'||
     Number(row.total_rosters)!==32)
   throw Error('Linked successor has invalid league identity');
  const key=id(row.league_id);
  if(choices.has(key)&&JSON.stringify(choices.get(key))!==JSON.stringify(row))
   throw Error('Conflicting metadata for linked successor');
  choices.set(key,row);
 }
 if(choices.size>1)throw Error('Ambiguous linked successor; never choose by name');
 return choices.values().next().value||null;
}
export function forwardIssuePath(season,week){
 if(!Number.isInteger(season)||season<INQUIRER_ORIGINAL_SEASON||season>9999||
    !Number.isInteger(week)||week<(season===2026?10:1)||week>17)
  throw Error('Invalid forward season/week');
 return 'forward/'+season+'/week-'+String(week).padStart(2,'0')+'.json';
}
// Future namespace is deliberately separate from legacy schema-1 forward/index.json.
// A planned issue is not a publication authorization. The actual writer must
// independently validate market, scoring, editorial and archive provenance.
export function futureSeasonPlan({league,index,current}){
 const season=year(league?.season),leagueId=id(league?.league_id);
 if(!Number.isInteger(season)||season<=2026||!validId(leagueId)||
    !validId(league?.previous_league_id)||id(league.previous_league_id)===leagueId||
    league.sport!=='nfl'||Number(league.total_rosters)!==32||
    !Number.isInteger(current)||current<1||current>18)
  throw Error('Unverified future-season publication clock or league');
 if(index?.schema_version!==2||year(index.season)!==season||
    id(index.league_id)!==leagueId||id(index.previous_league_id)!==id(league.previous_league_id)||
    !Array.isArray(index.reports))throw Error('Future-season ledger identity mismatch');
 for(const [i,row] of index.reports.entries()){
  const week=i+1;
  if(year(row.season)!==season||Number(row.week)!==week||
     row.path!==forwardIssuePath(season,week)||Number(row.team_count)!==32||
     !/^[a-f0-9]{64}$/.test(String(row.sha256||'')))
   throw Error('Future-season ledger has invalid or missing issue');
 }
 const finalized=Math.min(17,current-1),week=index.reports.length+1;
 if(index.reports.length>finalized)throw Error('Future-season ledger exceeds finalized clock');
 return {season,league_id:leagueId,finalized_through:finalized,
  state:week<=finalized?'due':'not-ready',week:week<=finalized?week:null,
  namespace:'forward/'+season+'/index.json',
  path:week<=finalized?forwardIssuePath(season,week):null};
}
export function futureSeasonMarketReady({league,index,snapshots}){
 const leagueId=id(league?.league_id);
 if(!validId(leagueId)||id(index?.league_id)!==leagueId||
    !Array.isArray(snapshots)||snapshots.length<2)return false;
 const [first,last]=snapshots;
 return [first,last].every(s=>id(s?.league)===leagueId&&
   s?.provenance?.canonical_parity==='exact'&&
   Array.isArray(s.rows)&&s.rows.length>=100&&
   Array.isArray(s.teams)&&s.teams.length===32&&
   new Set(s.teams.map(t=>id(t.id))).size===32&&
   String(s.valuation_contract||'').trim()&&String(s.valuation_model||'').trim()&&
   Number.isFinite(Date.parse(s.t)))&&
   first.valuation_model===last.valuation_model&&
   first.valuation_contract===last.valuation_contract&&Date.parse(first.t)<Date.parse(last.t);
}
