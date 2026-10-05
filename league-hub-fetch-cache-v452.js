(()=>{
'use strict';
if(window.__fleecedLeagueHubFetchCacheV456)return;
window.__fleecedLeagueHubFetchCacheV456=true;

// One runtime state, one request per resource. No persistent cache survives a
// preview deploy. Read-only publication and snapshot endpoints bypass the
// heavyweight League Hub generator; anything left is deduplicated in-flight and
// cached only for this page session.
const nativeFetch=window.fetch.bind(window),memory=new Map(),pending=new Map();
const cloneRecord=r=>new Response(r.body,{status:r.status,statusText:r.statusText,headers:r.headers});
const recordResponse=async response=>({body:await response.text(),status:response.status,statusText:response.statusText,headers:[...response.headers.entries()]});
const keyFor=url=>url.pathname+url.search;

function fastRoute(url){
  if(url.origin!==location.origin||url.pathname!=='/.netlify/functions/league-hub')return null;
  const season=Number(url.searchParams.get('broadcast_season')),week=Number(url.searchParams.get('broadcast_week'));
  if(season===2026&&[1,2].includes(week)){
    return{key:`archive:${season}|${week}`,target:`/.netlify/functions/league-hub-archive-fast?season=${season}&week=${week}&rev=456`};
  }
  if(url.searchParams.get('weekly')==='1')return{key:'publication:latest',target:'/.netlify/functions/league-hub-read-fast?mode=latest&rev=456'};
  if(url.searchParams.get('broadcast_archive')==='1')return{key:'publication:archive',target:'/.netlify/functions/league-hub-read-fast?mode=archive&rev=456'};
  if(url.searchParams.get('reporters')==='1')return{key:'publication:reporters',target:'/.netlify/functions/league-hub-read-fast?mode=reporters&rev=456'};
  if(url.searchParams.get('managers')==='1')return{key:'snapshot:managers',target:'/.netlify/functions/league-hub-read-fast?mode=managers&rev=456'};
  if(url.searchParams.get('weekly_awards')==='1')return{key:'snapshot:weekly-awards',target:'/.netlify/functions/league-hub-read-fast?mode=weekly-awards&rev=456'};
  return null;
}

function sessionCacheable(url){
  if(url.origin!==location.origin)return false;
  if(url.pathname==='/.netlify/functions/value-history'&&url.searchParams.get('trades')==='1')return true;
  if(url.pathname!=='/.netlify/functions/league-hub')return false;
  return url.searchParams.has('drafts');
}

async function runOnce(key,target,init,remember=true){
  if(memory.has(key))return cloneRecord(memory.get(key));
  if(pending.has(key))return pending.get(key).then(cloneRecord);
  const job=nativeFetch(target,{...(init||{}),cache:'no-store'}).then(recordResponse).then(rec=>{
    if(remember&&rec.status>=200&&rec.status<300)memory.set(key,rec);
    return rec;
  }).finally(()=>pending.delete(key));
  pending.set(key,job);
  return job.then(cloneRecord);
}

window.fetch=async function(input,init){
  let url;
  try{url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href)}catch{return nativeFetch(input,init)}
  const method=String(init?.method||((typeof input==='object'&&input?.method)||'GET')).toUpperCase();
  if(method!=='GET')return nativeFetch(input,init);

  const fast=fastRoute(url);
  if(fast)return runOnce(fast.key,fast.target,init,true);
  if(sessionCacheable(url))return runOnce(`session:${keyFor(url)}`,input,init,true);
  return nativeFetch(input,init);
};
})();
