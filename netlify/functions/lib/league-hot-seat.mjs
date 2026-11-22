// Finalized-score fallback is explicit: Sleeper's completed matchup feed
// contains scores, not projections. Never claim an upset without both
// trustworthy pregame projections.
export function selectHotSeat(teams=[]){
 const losses=(Array.isArray(teams)?teams:[]).filter(g=>
  g?.won===false&&g?.points!=null&&g?.opponent_points!=null&&
  Number.isFinite(Number(g.points))&&Number.isFinite(Number(g.opponent_points))&&
  Number(g.points)<Number(g.opponent_points));
 if(!losses.length)return null;
 const projected=losses.filter(g=>
  g.projected!=null&&g.opponent_projected!=null&&
  Number.isFinite(Number(g.projected))&&
  Number.isFinite(Number(g.opponent_projected))&&
  Number(g.projected)>Number(g.opponent_projected));
 const sorted=projected.length
  ?projected.slice().sort((a,b)=>
    (Number(b.projected)-Number(b.opponent_projected))-
    (Number(a.projected)-Number(a.opponent_projected))||
    String(a.roster_id).localeCompare(String(b.roster_id)))
  :losses.slice().sort((a,b)=>
    (Number(b.opponent_points)-Number(b.points))-
    (Number(a.opponent_points)-Number(a.points))||
    String(a.roster_id).localeCompare(String(b.roster_id)));
 const winner=sorted[0],margin=Number(winner.opponent_points)-Number(winner.points);
 return{...winner,hot_seat_basis:projected.length?'projected-upset':'largest-finalized-defeat',
  hot_seat_detail:projected.length
   ?'Projected by '+(Number(winner.projected)-Number(winner.opponent_projected)).toFixed(1)+
    ' to win • lost by '+margin.toFixed(1)
   :'Largest completed-week defeat • lost by '+margin.toFixed(1)+
    ' • pregame projections unavailable'};
}

export function supplementCompletedHotSeat(cache,completed){
 const records=Array.isArray(cache?.records)?cache.records:[];
 if(completed?.available!==true||!Array.isArray(completed.teams)||
    completed.teams.length!==32||!records.length)return cache;
 const missing=records.some(rec=>Number(rec.season)===Number(completed.season)&&
  Number(rec.week)===Number(completed.week)&&
  !(rec.manager_awards||[]).some(a=>a.type==='hot-seat'));
 if(!missing)return cache;
 const hot=selectHotSeat(completed.teams);
 if(!hot)return cache;
 const next=records.map(rec=>{
  if(Number(rec.season)!==Number(completed.season)||
     Number(rec.week)!==Number(completed.week)||
     (rec.manager_awards||[]).some(a=>a.type==='hot-seat'))return rec;
  const badge={type:'hot-seat',title:'🔥 Hot Seat',
   roster_id:String(hot.roster_id),manager_user_id:String(hot.manager_user_id||''),
   manager_name:String(hot.manager_name||''),team_name:String(hot.team_name||''),
   points:Number(hot.points),detail:hot.hot_seat_detail,
   provisional:true,source:'sleeper-finalized-matchups'};
  return{...rec,manager_awards:[badge,...(rec.manager_awards||[])],
   derived_hot_seat:true};
 });
 return{...cache,records:next};
}
