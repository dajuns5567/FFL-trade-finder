import assert from 'node:assert/strict';
import handler from '../netlify/functions/league-hub.mjs';
for (const week of [1,2,3,4]) {
 const response=await handler(new Request('http://localhost/.netlify/functions/league-hub?broadcast_season=2026&broadcast_week='+week));
 assert.equal(response.status,200,'Archived week '+week+' HTTP response');
 const body=await response.json();
 assert.equal(body.week,week,'Archived edition week');
 assert.equal(body.teams?.length,32,'All 32 teams must remain available in Week '+week);
 let withCoverage=0;
 for(const team of body.teams){
  const starters=team.starter_details||[],snapshot=team.projection_snapshot;
  assert(snapshot&&snapshot.verified_pregame===false,'Week '+week+' '+team.team_name+' must have honest source provenance');
  assert.equal(snapshot.starters,starters.length,'Starter count must reconcile for '+team.team_name);
  assert.equal(team.projection_coverage,starters.filter(p=>p.projected!=null&&Number.isFinite(Number(p.projected))).length);
  assert(snapshot.source?.includes('/2026/'+week+'?'),'Projection source must match publication week');
  if(team.projection_coverage)withCoverage++;
  if(team.projection_coverage!==team.starter_count)assert.equal(team.projected,null,'Never call partial subtotal a full forecast');
  else if(starters.length){
   const sum=Number(starters.reduce((n,p)=>n+Number(p.projected),0).toFixed(2));
   assert.equal(team.projected,sum,'Complete team total must reconcile');
  }
 }
 assert(withCoverage>0,'Week '+week+' should include sourced scoring projections');
 console.log('ARCHIVED_WEEK_PROJECTION_COVERAGE',JSON.stringify({season:2026,week,teams:32,teamsWithPlayerProjections:withCoverage,fullTeams:body.teams.filter(x=>x.projected!==null).length}));
}
