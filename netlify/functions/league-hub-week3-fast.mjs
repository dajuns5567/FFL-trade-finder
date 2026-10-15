import week2Preload2026 from './inquirer-week2-2026-preload.mjs';
import week3Preload2026 from './inquirer-week3-2026-preload.mjs';
import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r28.mjs';
import {applyPublishedWeek3Fix} from './inquirer-week3-published-r1.mjs';

const json=(body,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'public, max-age=0, stale-while-revalidate=60',
    'netlify-cdn-cache-control':'public, max-age=60, stale-while-revalidate=300',
    'x-fleeced-week3-fast':'2'
  }
});
let memo=null;
function week3(){
  if(memo)return memo;
  const previous=applyWeek2EditorialR16(week2Preload2026);
  memo=applyPublishedWeek3Fix(week3Preload2026(),previous);
  return memo;
}
export default async()=>json(week3());
