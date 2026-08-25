(()=>{
'use strict';
if(typeof window.loadCore!=='function'||typeof window.get!=='function')return;
window.loadCore=async function(){
  status("Loading Sleeper league, users and rosters…");

  // Start every request that is independent of the league-season lookup immediately.
  // Assignment/render order remains identical to the frozen V274 loader.
  const leaguePromise=get("/league/"+LEAGUE);
  const usersPromise=get("/league/"+LEAGUE+"/users");
  const rostersPromise=get("/league/"+LEAGUE+"/rosters");
  const tradedPicksPromise=get("/league/"+LEAGUE+"/traded_picks").catch(()=>[]);
  const playersPromise=get("/players/nfl").catch(()=>null);
  const trendingPromise=get("/players/nfl/trending/add?lookback_hours=168&limit=100").catch(()=>[]);

  const league=await leaguePromise;
  const season=Number(league?.season)||FALLBACK_SEASON;
  const statsPromise=get("/stats/nfl/regular/"+season+"?season_type=regular").catch(()=>({}));

  const [users,rosters,tradedPicks]=await Promise.all([
    usersPromise,
    rostersPromise,
    tradedPicksPromise
  ]);
  state.league=league;state.users=users;state.rosters=rosters;state.tradedPicks=Array.isArray(tradedPicks)?tradedPicks:[];
  buildTeams();fillSelects();renderLeague();renderFinderShop();updateStageLabel();
  status(`Loaded <b>${state.teams.length} teams</b> from Sleeper. Loading player data…`,"success");

  const [players,stats,trending]=await Promise.all([
    playersPromise,
    statsPromise,
    trendingPromise
  ]);
  if(players)state.players=players;
  state.stats={[season]:stats||{}};
  state.trending=Array.isArray(trending)?Object.fromEntries(trending.map(a=>[a.player_id,Number(a.count||a.adds||1)])):(trending||{});
  buildTeams();renderAll();cacheSet("fll_sleeper_snapshot",{league:state.league,users:state.users,rosters:state.rosters,players:state.players,stats:state.stats,trending:state.trending,rankings:state.rankings,tradedPicks:state.tradedPicks,draftPicks:state.draftPicks,lastUpdate:new Date().toISOString()});
  status(`Loaded <b>${state.teams.length} teams</b> and <b>${state.allAssets.filter(x=>x.type==="player").length} rostered players</b> from Sleeper. Refreshing consensus references in the background…`,"success");
};
})();
