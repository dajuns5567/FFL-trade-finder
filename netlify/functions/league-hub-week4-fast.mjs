import week4Preload2026 from './inquirer-week4-2026-preload.mjs';
import week3Preload2026 from './inquirer-week3-2026-preload.mjs';
import {applyPublishedForwardFix} from './inquirer-week3-published-r1.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=0, stale-while-revalidate=60','netlify-cdn-cache-control':'public, max-age=60, stale-while-revalidate=300','x-fleeced-week4-fast':'1'}});
export default async()=>json(applyPublishedForwardFix(week4Preload2026(),week3Preload2026()));
