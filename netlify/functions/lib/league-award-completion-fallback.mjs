// Read-only independent Sleeper finalization for a player milestone query.
// Netlify protected previews can reject same-site HTTP calls to League Hub;
// the fallback must use the identical 32-roster/pair validation and applied
// Sleeper standings rather than trust the NFL clock or weekly stat feed alone.
import {completedLeagueWeekView} from './league-completed-week.mjs';

export async function verifiedSleeperCompletedAwardWeek({
 season,nflState,leagueId,read
}={}){
 const y=Number(season),nflSeason=Number(nflState?.season),weekNow=Number(nflState?.week);
 if(!Number.isInteger(y)||!Number.isInteger(weekNow)||weekNow<2||
    nflSeason!==y||typeof read!=='function'||!leagueId)return 0;
 const newest=Math.min(17,weekNow-1);
 if(newest<1)return 0;
 const base='/league/'+String(leagueId);
 try{
  const [league,rosters]=await Promise.all([read(base),read(base+'/rosters')]);
  if(Number(league?.season)!==y||!Array.isArray(rosters)||rosters.length!==32)return 0;
  const playoffStart=Number(league?.settings?.playoff_week_start);
  if(!Number.isInteger(playoffStart)||playoffStart<2||playoffStart>18)return 0;
  const matchups=new Map();
  const getWeek=async week=>{
   if(!matchups.has(week))matchups.set(week,read(base+'/matchups/'+week).catch(()=>null));
   return matchups.get(week);
  };
  for(let week=newest;week>=Math.max(1,newest-2);week--){
   const rows=await getWeek(week);
   if(!completedLeagueWeekView({season:y,week,matchups:rows,rosters,users:[]}))continue;
   if(week>=playoffStart){
    const bracket=await read(base+'/winners_bracket').catch(()=>null);
    const round=week-playoffStart+1;
    const nodes=Array.isArray(bracket)?bracket.filter(x=>Number(x?.r)===round):[];
    if(nodes.length&&nodes.every(x=>String(x?.w||'')!=='0'&&x?.w!=null&&
      String(x?.l||'')!=='0'&&x?.l!=null))return week;
    continue;
   }
   // A complete matchup can still be provisional. Sleeper's actual roster
   // standings must have applied every regular-season result through week.
   const earlier=await Promise.all(Array.from({length:week-1},(_,i)=>getWeek(i+1)));
   if(earlier.some((p,i)=>!completedLeagueWeekView({
      season:y,week:i+1,matchups:p,rosters,users:[]
    })))continue;
   const tally=new Map(rosters.map(r=>[String(r.roster_id),{wins:0,losses:0}]));
   for(const batch of [...earlier,rows]){
    const pairs=new Map();
    for(const game of batch){
     const id=String(game.matchup_id);
     if(!pairs.has(id))pairs.set(id,[]);
     pairs.get(id).push(game);
    }
    for(const [a,b] of pairs.values()){
     if(Number(a.points)===Number(b.points))continue;
     const winner=Number(a.points)>Number(b.points)?a:b;
     const loser=winner===a?b:a;
     tally.get(String(winner.roster_id)).wins++;
     tally.get(String(loser.roster_id)).losses++;
    }
   }
   if(rosters.every(r=>{
    const actual=r?.settings,expected=tally.get(String(r.roster_id));
    return expected&&actual&&Number(actual.wins)>=expected.wins&&
      Number(actual.losses)>=expected.losses;
   }))return week;
  }
 }catch(error){console.warn('player-weekly-awards-direct-sleeper-unavailable',String(error?.message||error))}
 return 0;
}
