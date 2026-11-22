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
