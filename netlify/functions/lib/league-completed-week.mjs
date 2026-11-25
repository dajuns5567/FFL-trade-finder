// Independent, read-only Fleeced Daily matchup feed.
// Never read the Inquirer archive, awards, publication cursor, or editorial status.
export function completedLeagueWeekView({season,week,matchups,rosters,users,playerProjections=null,noPublishedScoring=[]}={}){
 if(!Number.isInteger(Number(season))||!Number.isInteger(Number(week))||Number(week)<1)return null;
 if(!Array.isArray(matchups)||matchups.length!==32||!Array.isArray(rosters)||rosters.length!==32)return null;
 const rosterById=new Map(rosters.map(r=>[String(r.roster_id),r]));
 const userById=new Map((users||[]).map(u=>[String(u.user_id),u]));
 const byMatchup=new Map(),seen=new Set();
 for(const m of matchups){
  const id=String(m?.roster_id??''),game=String(m?.matchup_id??'');
  if(!id||!game||seen.has(id)||!rosterById.has(id)||
    m.points==null||!Number.isFinite(Number(m.points))||!m.players_points||
    !Object.keys(m.players_points).length)return null;
  seen.add(id);
  if(!byMatchup.has(game))byMatchup.set(game,[]);
  byMatchup.get(game).push(m);
 }
 if(byMatchup.size!==16||[...byMatchup.values()].some(pair=>pair.length!==2))return null;
 const teams=[],noScoringSet=new Set(noPublishedScoring.map(String));
 for(const pair of byMatchup.values())for(const [m,o] of [[pair[0],pair[1]],[pair[1],pair[0]]]){
  const r=rosterById.get(String(m.roster_id)),u=userById.get(String(r.owner_id));
  const name=String(u?.metadata?.team_name||u?.display_name||u?.username||'Roster '+m.roster_id).trim();
  // Reuse Sleeper's weekly player projection feed and league scoring.
  // Both starters lists must have complete coverage; missing projections
  // are NEVER converted to zero or replaced with final scores.
  const projectedFor=game=>{
   const starters=Array.isArray(game?.starters)?
    game.starters.map(String).filter(id=>id&&id!=='0'):[],
    values=starters.map(id=>playerProjections?.[id]);
   // An explicitly empty submitted lineup contributes zero; an absent lineup is unknown.
   return Array.isArray(game?.starters)&&values.every(v=>v!=null&&Number.isFinite(Number(v)))?
    Number(values.reduce((sum,v)=>sum+Number(v),0).toFixed(2)):null;
  };
  const projected=projectedFor(m),opponentProjected=projectedFor(o);
  const noScoringCount=game=>(game?.starters||[]).map(String).filter(id=>noScoringSet.has(id)).length;
  teams.push({roster_id:String(m.roster_id),opponent_roster_id:String(o.roster_id),
   manager_user_id:String(r.owner_id||''),manager_name:String(u?.display_name||u?.username||'Roster '+m.roster_id),
   team_name:name,points:Number(m.points),opponent_points:Number(o.points),
   won:Number(m.points)>Number(o.points),tied:Number(m.points)===Number(o.points),
   projected,opponent_projected:opponentProjected,
   projection_coverage:projected==null?0:1,projection_no_published_scoring_count:noScoringCount(m),opponent_projection_no_published_scoring_count:noScoringCount(o),projection_source:projected==null?null:'sleeper-weekly-player-projections'});
 }
 return{available:true,source:'sleeper-finalized-matchups',season:Number(season),week:Number(week),
  teams:teams.sort((a,b)=>Number(a.roster_id)-Number(b.roster_id))};
}
