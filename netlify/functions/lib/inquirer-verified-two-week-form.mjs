// The Inquirer may describe a two-game streak only from two consecutive,
// finalized Sleeper matchup scores. An absent "result" string is NOT a loss:
// the GitHub-native importer stores {week, points, opponent_points, won}.
export function verifiedTwoWeekForm(teams,week){
 const target=Number(week),rows=Array.isArray(teams)?teams:[];
 if(!Number.isInteger(target)||target<2||rows.length!==32||
    new Set(rows.map(t=>String(t?.roster_id??''))).size!==32)
   return{complete:false,winners:[],losers:[]};
 const winners=[],losers=[];
 for(const team of rows){
  const games=team?.league_context?.recent_games;
  if(!Array.isArray(games))return{complete:false,winners:[],losers:[]};
  const outcomes=[];
  for(const w of [target-1,target]){
   const matches=games.filter(g=>Number(g?.week)===w);
   if(matches.length!==1)return{complete:false,winners:[],losers:[]};
   const game=matches[0];
   if(game?.points==null||game?.opponent_points==null||
      !Number.isFinite(Number(game.points))||!Number.isFinite(Number(game.opponent_points)))
     return{complete:false,winners:[],losers:[]};
   const diff=Number(game.points)-Number(game.opponent_points);
   const outcome=diff>0?'W':diff<0?'L':'T';
   // Contradictory recorded labels invalidate the entire league-wide claim.
   if(game.result!=null&&String(game.result).toUpperCase()!==outcome)
     return{complete:false,winners:[],losers:[]};
   if(typeof game.won==='boolean'&&game.won!==(outcome==='W')&&outcome!=='T')
     return{complete:false,winners:[],losers:[]};
   outcomes.push(outcome);
  }
  if(outcomes.every(x=>x==='W'))winners.push(team);
  if(outcomes.every(x=>x==='L'))losers.push(team);
 }
 return{complete:true,winners,losers};
}
