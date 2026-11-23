// Player Value History award bridge.
// A verified League Hub completed-week record takes precedence. When its cache
// has not yet synchronized, reconstruct the SAME offensive/IDP leaders from
// completed Sleeper NFL stats using the league's actual scoring settings.
// In-progress weeks and absent stat feeds cannot award badges.
export function playerWeeklyMilestoneAwards({
 playerId,season,week,currentSeason,currentCompletedWeek,canonical,
 payload,players={},scoring={},score,verifiedCompletedWeek=null
}={}){
 const y=Number(season),w=Number(week),current=Number(currentSeason);
 if(!Number.isInteger(y)||!Number.isInteger(w)||w<1||w>18||
    y>current||(y===current&&w>Number(currentCompletedWeek))||
    !playerId||typeof score!=='function')return[];
 const groups=['offense','defense'],winners={};
 for(const group of groups){
  const awarded=canonical?.players_of_week?.[group];
  // A published named winner must never be replaced by a re-calculation.
  if(awarded?.player_id&&awarded?.points!=null&&Number.isFinite(Number(awarded.points))){
   winners[group]={player_id:String(awarded.player_id),points:Number(awarded.points)};
  }
 }
 const missing=groups.filter(g=>!winners[g]);
 // Reconstruct a badge only when an independent completed-league-week
 // readback verifies this season/week. NFL state/week number alone is not
 // evidence that all Sleeper scores have finalized.
 const verifiedFallback=Number.isInteger(Number(verifiedCompletedWeek))&&
   Number(verifiedCompletedWeek)>=w;
 if(missing.length&&verifiedFallback&&payload&&Object.keys(payload).length&&Object.keys(scoring).length){
  const rows=Array.isArray(payload)?payload.map((row,i)=>({
   id:String(row?.player_id||row?.id||i),
   stats:row?.stats&&typeof row.stats==='object'?row.stats:row
  })):Object.entries(payload).map(([id,row])=>({
   id:String(row?.player_id||row?.id||id),
   stats:row?.stats&&typeof row.stats==='object'?row.stats:row
  }));
  const groupFor=position=>{
   const p=String(position||'').toUpperCase();
   if(['QB','RB','WR','TE'].includes(p))return'offense';
   if(['DL','DE','DT','NT','EDGE','LB','DB','CB','S'].includes(p))return'defense';
   return'';
  };
  for(const row of rows){
   const group=groupFor(players?.[row.id]?.position);
   if(!missing.includes(group))continue;
   const points=score(row.stats,scoring);
   if(points==null||!Number.isFinite(Number(points)))continue;
   const old=winners[group];
   if(!old||Number(points)>old.points||
     (Number(points)===old.points&&row.id<old.player_id))
    winners[group]={player_id:row.id,points:Number(points)};
  }
 }
 return groups.filter(g=>winners[g]?.player_id===String(playerId)).map(group=>({
  type:group==='offense'?'offensive-player-of-week':'defensive-player-of-week',
  title:group==='offense'?'Top Offensive Scorer':'Top Defensive Scorer',
  points:Number(Number(winners[group].points||0).toFixed(2)),
  season:y,week:w
 }));
}
