// Automatically advances Fleeced! League Hub only when Sleeper has finalized the next sequential week.
// The canonical league-hub publisher owns article generation, forward V31 editorial logic,
// weekly recap, awards, Players of the Week, Manager Spotlight scoring, Hot Seat, and Cool Throne.
const call=async url=>{
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'Fleeced-Weekly-Publisher/1.0'},cache:'no-store'});
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(r.status+' '+url+' '+String(body?.error||body?.reason||''));
  return body;
};

export default async (req,context)=>{
  const origin=String(context?.site?.url||new URL(req.url).origin).replace(/\/$/,'');
  let latest=null,previousKey='';
  // Publish sequentially. Multiple iterations self-heal if more than one completed week was missed,
  // but the canonical completion gate prevents publication of a live/incomplete week.
  for(let i=0;i<3;i++){
    const report=await call(origin+'/.netlify/functions/league-hub?weekly=1');
    if(!report?.available)break;
    latest=report;
    const key=Number(report.season)+'|'+Number(report.week);
    if(key===previousKey)break;
    previousKey=key;
  }
  if(latest?.available){
    await Promise.all([
      call(origin+'/.netlify/functions/league-hub?weekly_awards=1'),
      call(origin+'/.netlify/functions/league-hub?managers=1')
    ]);
  }
  return new Response(JSON.stringify({ok:true,latest:latest?.available?{season:Number(latest.season),week:Number(latest.week)}:null}),{
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
  });
};

export const config={schedule:'15 * * * *'};
