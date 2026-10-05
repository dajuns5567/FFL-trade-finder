(()=>{
'use strict';
if(window.__fleecedLeagueHubFetchCacheV454)return;
window.__fleecedLeagueHubFetchCacheV454=true;

// Active preview policy: session-memory dedupe only. Do not persist archived
// Inquirer payloads across deploys and do not eagerly warm unrelated Hub state.
// This prevents old editorial payloads from surviving a new preview deployment
// and stops page boot from launching managers/drafts/awards/trades/Hub at once.
const nativeFetch=window.fetch.bind(window),memory=new Map(),pending=new Map();
const cloneRecord=r=>new Response(r.body,{status:r.status,statusText:r.statusText,headers:r.headers});
const recordResponse=async response=>({body:await response.text(),status:response.status,statusText:response.statusText,headers:[...response.headers.entries()]});

function archiveTarget(url){
  if(url.origin!==location.origin||url.pathname!=='/.netlify/functions/league-hub')return null;
  const season=Number(url.searchParams.get('broadcast_season')),week=Number(url.searchParams.get('broadcast_week'));
  if(season===2026&&[1,2].includes(week))return{season,week,key:`archive:${season}|${week}`};
  // The currently published preview edition is Week 2. Route the default weekly
  // read to the same lightweight source rather than booting the heavyweight Hub
  // generator just to render the already-published edition.
  if(url.searchParams.get('weekly')==='1')return{season:2026,week:2,key:'weekly:2026|2'};
  return null;
}

window.fetch=async function(input,init){
  let url;
  try{url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href)}catch{return nativeFetch(input,init)}
  const method=String(init?.method||((typeof input==='object'&&input?.method)||'GET')).toUpperCase();
  if(method!=='GET')return nativeFetch(input,init);

  const fast=archiveTarget(url);
  if(!fast)return nativeFetch(input,init);
  if(memory.has(fast.key))return cloneRecord(memory.get(fast.key));
  if(pending.has(fast.key))return pending.get(fast.key).then(cloneRecord);

  // Revision token intentionally changes whenever the active Week 2 editorial
  // layer changes. Combined with no-store response headers this prevents CDN or
  // browser reuse of an older publication during preview development.
  const target=`/.netlify/functions/league-hub-archive-fast?season=${fast.season}&week=${fast.week}&rev=454`;
  const job=nativeFetch(target,{...(init||{}),cache:'no-store'}).then(recordResponse).then(rec=>{
    if(rec.status>=200&&rec.status<300)memory.set(fast.key,rec);
    return rec;
  }).finally(()=>pending.delete(fast.key));
  pending.set(fast.key,job);
  return job.then(cloneRecord);
};
})();
