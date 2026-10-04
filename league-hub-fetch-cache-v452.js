(()=>{
'use strict';
if(window.__fleecedLeagueHubFetchCacheV452)return;
window.__fleecedLeagueHubFetchCacheV452=true;

const nativeFetch=window.fetch.bind(window),memory=new Map(),pending=new Map();
const cloneRecord=r=>new Response(r.body,{status:r.status,statusText:r.statusText,headers:r.headers});
const recordResponse=async response=>({body:await response.text(),status:response.status,statusText:response.statusText,headers:[...response.headers.entries()]});

window.fetch=async function(input,init){
  let url;
  try{url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href)}catch{return nativeFetch(input,init)}
  if(url.origin!==location.origin||url.pathname!=='/.netlify/functions/league-hub')return nativeFetch(input,init);

  const season=Number(url.searchParams.get('broadcast_season')),week=Number(url.searchParams.get('broadcast_week'));
  if(season!==2026||![1,2].includes(week))return nativeFetch(input,init);

  const key=`${season}|${week}`;
  if(memory.has(key))return cloneRecord(memory.get(key));
  if(pending.has(key))return pending.get(key).then(cloneRecord);

  const target=`/.netlify/functions/league-hub-archive-fast?season=${season}&week=${week}`;
  const nextInit={...(init||{}),cache:'default'};
  const job=nativeFetch(target,nextInit).then(async response=>{
    const rec=await recordResponse(response);
    if(response.ok)memory.set(key,rec);
    return rec;
  }).finally(()=>pending.delete(key));
  pending.set(key,job);
  return job.then(cloneRecord);
};
})();
