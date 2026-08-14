import {PPR_WEIGHTS,aggregateWeeks} from './ppr-scoring.mjs';

export default async function handler(req){
  const u=new URL(req.url),season=Number(u.searchParams.get('season'))||new Date().getUTCFullYear();
  const years=[season-1,season-2,season-3];
  const headers={accept:'application/json','user-agent':'FFL-TradeFinder/production-anchor-1.1'};
  const out={},errors=[];
  for(const year of years){
    const weekly={};
    const jobs=[];
    for(let week=1;week<=18;week++)jobs.push((async()=>{
      const url=`https://api.sleeper.app/v1/stats/nfl/regular/${year}/${week}`;
      try{
        const r=await fetch(url,{headers,cache:'no-store'});
        if(!r.ok){errors.push(`${year}w${week}:${r.status}`);weekly[week]={};return}
        weekly[week]=await r.json();
      }catch(e){errors.push(`${year}w${week}:${String(e?.message||e)}`);weekly[week]={}}
    })());
    await Promise.all(jobs);
    out[year]=aggregateWeeks(weekly);
  }
  return new Response(JSON.stringify({ok:true,season,years,stats:out,errors,pprScoringWeights:PPR_WEIGHTS,pprReconstruction:true}),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}
