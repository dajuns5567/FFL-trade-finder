import {latestFullyCompletedWeek} from '../netlify/functions/ppr-scoring.mjs';

// Independently rebuild the importer's finalized-week and finalized-team
// boundary. This is NOT a tolerance for aggregate differences: qualified
// player-games still undergo exact games/points comparison against storage.
const normalizeTeam=v=>{
 const s=String(v||'').trim().toUpperCase();
 return({JAC:'JAX',WAS:'WSH',LA:'LAR',OAK:'LV',SD:'LAC',STL:'LAR'}[s]||s);
};
const keys=x=>[...x].sort().join('|');
export function currentSeasonAuditGate(manifest){
 const current=Number(manifest?.currentSeason);
 const qualification=manifest?.currentSeasonQualification;
 const finality=qualification?.weekFinalityByWeek;
 if(!Number.isInteger(current)||!finality||typeof finality!=='object')
  throw Error('Finalized-week audit cannot establish current-season game slots');
 const completedWeek=latestFullyCompletedWeek(finality);
 const advertised=Number(manifest?.currentSeasonCompletedWeek);
 if(!Number.isInteger(advertised)||completedWeek!==advertised)
  throw Error('Current-season scoring audit: verified completed week does not match importer manifest');
 const teamsByWeek={};
 for(let week=1;week<=completedWeek;week++){
  const info=finality[week],slots=info?.slots;
  if(info?.complete!==true||!Array.isArray(slots)||!slots.length)
   throw Error('Current-season scoring audit lacks finalized game slots for week '+week);
  if(slots.some(slot=>slot?.state!=='final'&&slot?.state!=='ignored'))
   throw Error('Current-season scoring audit has blocking game in finalized week '+week);
  const finalTeams=new Set();
  for(const slot of slots){
   if(slot.state!=='final')continue;
   if(!Array.isArray(slot.teams)||slot.teams.length!==2)
    throw Error('Current-season scoring audit has invalid final matchup teams in week '+week);
   for(const t of slot.teams){
    const name=normalizeTeam(t);
    if(!name)throw Error('Current-season scoring audit has missing final team in week '+week);
    finalTeams.add(name);
   }
  }
  const published=(qualification.finalTeamsByWeek||{})[week];
  if(!Array.isArray(published)||keys(published.map(normalizeTeam))!==keys(finalTeams))
   throw Error('Current-season scoring audit: final teams disagree with game-slot evidence in week '+week);
  teamsByWeek[week]=finalTeams;
 }
 return{
  completedWeek,
  eligible(week,team){
   return Number.isInteger(week)&&week>=1&&week<=completedWeek&&
    teamsByWeek[week]?.has(normalizeTeam(team))===true;
  },
  finalTeamCountByWeek:Object.fromEntries(Object.entries(teamsByWeek).map(([week,teams])=>[week,teams.size]))
 };
}
