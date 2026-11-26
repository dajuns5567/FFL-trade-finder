
const DEFAULT_LEAGUE="1316867686394769408";
export default async (req)=>{
  try{
    if(req.method!=='GET')return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers:{'content-type':'application/json','cache-control':'no-store'}});
    const leagueId=new URL(req.url).searchParams.get("leagueId")||DEFAULT_LEAGUE;
    if(!/^\d{1,24}$/.test(leagueId))return new Response(JSON.stringify({error:'Invalid league ID'}),{status:400,headers:{'content-type':'application/json','cache-control':'no-store'}});
    const r=await fetch(`https://api.sleeper.app/v1/league/${leagueId}/traded_picks`,{
      headers:{"user-agent":"FLL-Dynasty-Trade-Finder/14.3"}
    });
    if(!r.ok) throw new Error(`Sleeper traded_picks HTTP ${r.status}`);
    const picks=await r.json();
    return new Response(JSON.stringify({ok:true,leagueId,picks,fetchedAt:new Date().toISOString()}),{
      headers:{"content-type":"application/json","cache-control":"no-store"}
    });
  }catch(e){
    return new Response(JSON.stringify({ok:false,error:'Sleeper pick data unavailable'}),{
      status:502,headers:{"content-type":"application/json","cache-control":"no-store"}
    });
  }
};

// Netlify edge admission limit: cap costly calls across warm instances.
// A minute of normal concurrent league use fits within this budget.
export const config={rateLimit:{action:'rate_limit',aggregateBy:'domain',windowSize:60,windowLimit:300}};
