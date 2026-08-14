export function weightPlan(currentSeason,completedWeek,leagueStatus){
  const w=Math.max(0,Math.min(18,Number(completedWeek)||0));
  const status=String(leagueStatus||'').toLowerCase();
  if(w===0)return{mode:'preseason-offseason',completedWeek:0,weights:{currentYear:0,previousYear:.60,twoYearsAgo:.30,threeYearsAgo:.10},yearWeights:{[currentSeason-1]:.60,[currentSeason-2]:.30,[currentSeason-3]:.10}};
  const seasonComplete=['complete','post_season','offseason'].includes(status);
  if(seasonComplete)return{mode:'postseason-offseason',completedWeek:w,weights:{currentYear:0,previousYear:.60,twoYearsAgo:.30,threeYearsAgo:.10},yearWeights:{[currentSeason]:.60,[currentSeason-1]:.30,[currentSeason-2]:.10}};
  const current=.10+.50*((w-1)/17),remaining=1-current,base=[.55,.25,.10],total=.90;
  const previous=remaining*(base[0]/total),two=remaining*(base[1]/total),three=remaining*(base[2]/total);
  return{mode:'in-season',completedWeek:w,weights:{currentYear:current,previousYear:previous,twoYearsAgo:two,threeYearsAgo:three},yearWeights:{[currentSeason]:current,[currentSeason-1]:previous,[currentSeason-2]:two,[currentSeason-3]:three}};
}
