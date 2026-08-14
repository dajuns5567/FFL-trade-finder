export default async function handler(req){
  const u=new URL(req.url),season=Number(u.searchParams.get('season'))||new Date().getUTCFullYear();
  const years=[season-1,season-2,season-3];
  const headers={accept:'application/json','user-agent':'FFL-TradeFinder/production-anchor'};
  const out={};
  const errors=[];
  function rows(payload){
    if(Array.isArray(payload))return payload.map(r=>[String(r?.player_id||r?.id||''),r?.stats&&typeof r.stats==='object'?r.stats:r]).filter(([id])=>id);
    if(!payload||typeof payload!=='object')return[];
    return Object.entries(payload).map(([id,v])=>[String(v?.player_id||id),v?.stats&&typeof v.stats==='object'?v.stats:v]).filter(([id])=>id);
  }
  function add(year,week,payload){
    out[year]||={};
    for(const [id,stats] of rows(payload)){
      if(!stats||typeof stats!=='object')continue;
      const numeric=Object.entries(stats).filter(([,v])=>Number.isFinite(Number(v)));
      if(!numeric.length)continue;
      const dst=out[year][id]||(out[year][id]={gp:0});
      dst.gp+=1;
      for(const [k,v] of numeric){
        if(['gp','gms_active','games_played'].includes(k))continue;
        dst[k]=(Number(dst[k])||0)+Number(v);
      }
    }
  }
  for(const year of years){
    const jobs=[];
    for(let week=1;week<=18;week++)jobs.push((async()=>{
      const url=`https://api.sleeper.app/v1/stats/nfl/regular/${year}/${week}`;
      try{
        const r=await fetch(url,{headers});
        if(!r.ok){errors.push(`${year}w${week}:${r.status}`);return}
        add(year,week,await r.json());
      }catch(e){errors.push(`${year}w${week}:${String(e?.message||e)}`)}
    })());
    await Promise.all(jobs);
  }
  return new Response(JSON.stringify({ok:true,season,years,stats:out,errors}),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=900, s-maxage=3600, stale-while-revalidate=86400'}});
}
