import week3Preload2026 from './inquirer-week3-2026-preload.mjs';

const json=(body,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'public, max-age=300, stale-while-revalidate=3600',
    'netlify-cdn-cache-control':'public, max-age=3600, stale-while-revalidate=86400',
    'x-fleeced-week3-fast':'1'
  }
});

export default async()=>json(week3Preload2026());
