import week1Preload2026 from './inquirer-week1-2026-preload.mjs';
import week2Preload2026 from './inquirer-week2-2026-preload.mjs';
import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r28.mjs';

const json=(body,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
    'netlify-cdn-cache-control':'public, durable, max-age=86400, stale-while-revalidate=604800',
    'x-fleeced-archive-fast':'1'
  }
});

const PRELOADS=new Map([
  ['2026|1',week1Preload2026],
  ['2026|2',week2Preload2026]
]);

export default async req=>{
  try{
    const u=new URL(req.url),season=Number(u.searchParams.get('season')),week=Number(u.searchParams.get('week'));
    if(!Number.isInteger(season)||!Number.isInteger(week))return json({error:'season and week required'},400);
    const raw=PRELOADS.get(`${season}|${week}`);
    if(!raw)return json({error:'preloaded archive not found'},404);
    const body=season===2026&&week===2?applyWeek2EditorialR16(raw):raw;
    return json(body);
  }catch(e){
    console.error('league-hub-archive-fast',e);
    return json({error:'archive unavailable'},503);
  }
};
