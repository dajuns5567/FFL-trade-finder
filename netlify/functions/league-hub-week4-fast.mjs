import week4Preload2026 from './inquirer-week4-2026-preload.mjs';
import {rebuildWeek4Editorial} from './inquirer-week4-editorial-rebuild.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','netlify-cdn-cache-control':'no-store, max-age=0','x-fleeced-week4-fast':'1'}});
export default async()=>json(rebuildWeek4Editorial(week4Preload2026()));
