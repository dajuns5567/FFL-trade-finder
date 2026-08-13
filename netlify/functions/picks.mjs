
const DEFAULT_LEAGUE="1316867686394769408";
export default async (req)=>{
  try{
    const leagueId=new URL(req.url).searchParams.get("leagueId")||DEFAULT_LEAGUE;
    const r=await fetch(`https://api.sleeper.app/v1/league/${leagueId}/traded_picks`,{
      headers:{"user-agent":"FLL-Dynasty-Trade-Finder/14.3"}
    });
    if(!r.ok) throw new Error(`Sleeper traded_picks HTTP ${r.status}`);
    const picks=await r.json();
    return new Response(JSON.stringify({ok:true,leagueId,picks,fetchedAt:new Date().toISOString()}),{
      headers:{"content-type":"application/json","cache-control":"no-store"}
    });
  }catch(e){
    return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}),{
      status:502,headers:{"content-type":"application/json","cache-control":"no-store"}
    });
  }
};
