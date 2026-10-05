import week1Preload2026 from './inquirer-week1-2026-preload.mjs';
import week2Preload2026 from './inquirer-week2-2026-preload.mjs';
import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r28.mjs';

const json=(body,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{
    'content-type':'application/json; charset=utf-8',
    // During active preview development the publication must reflect the exact
    // deployed editorial code. Never let browser/CDN stale-while-revalidate hide
    // a new revision behind an older Week 2 payload.
    'cache-control':'no-store, no-cache, must-revalidate',
    'netlify-cdn-cache-control':'no-store',
    'pragma':'no-cache',
    'expires':'0',
    'x-fleeced-archive-fast':'2'
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
