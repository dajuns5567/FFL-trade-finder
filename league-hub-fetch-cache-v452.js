(()=>{
'use strict';
if(window.__fleecedLeagueHubFetchCacheV452)return;
window.__fleecedLeagueHubFetchCacheV452=true;

const nativeFetch=window.fetch.bind(window),memory=new Map(),pending=new Map(),CACHE_NAME='fleeced-league-hub-v453';
const cloneRecord=r=>new Response(r.body,{status:r.status,statusText:r.statusText,headers:r.headers});
const recordResponse=async response=>({body:await response.text(),status:response.status,statusText:response.statusText,headers:[...response.headers.entries()]});
const requestKey=url=>url.pathname+url.search;

function cacheable(url){
  if(url.origin!==location.origin)return false;
  if(url.pathname==='/.netlify/functions/value-history'&&url.searchParams.get('trades')==='1')return true;
  if(url.pathname!=='/.netlify/functions/league-hub')return false;
  return ['weekly','weekly_awards','managers','drafts','reporters','broadcast_archive'].some(k=>url.searchParams.has(k));
}
async function readPersistent(key){
  if(!('caches' in window))return null;
  try{
    const c=await caches.open(CACHE_NAME),r=await c.match(new Request(location.origin+key));
    return r?recordResponse(r):null;
  }catch{return null}
}
async function writePersistent(key,rec){
  if(!('caches' in window)||!rec||rec.status<200||rec.status>=300)return;
  try{
    const c=await caches.open(CACHE_NAME);
    await c.put(new Request(location.origin+key),cloneRecord(rec));
  }catch{}
}
function backgroundRefresh(key,input,init){
  if(pending.has(key))return;
  const job=nativeFetch(input,{...(init||{}),cache:'no-store'}).then(recordResponse).then(rec=>{
    if(rec.status>=200&&rec.status<300){memory.set(key,rec);writePersistent(key,rec)}
    return rec;
  }).catch(()=>null).finally(()=>pending.delete(key));
  pending.set(key,job);
}

window.fetch=async function(input,init){
  let url;
  try{url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href)}catch{return nativeFetch(input,init)}
  const method=String(init?.method||((typeof input==='object'&&input?.method)||'GET')).toUpperCase();
  if(method!=='GET')return nativeFetch(input,init);

  if(url.origin===location.origin&&url.pathname==='/.netlify/functions/league-hub'){
    const season=Number(url.searchParams.get('broadcast_season')),week=Number(url.searchParams.get('broadcast_week'));
    if(season===2026&&[1,2].includes(week)){
      const key=`archive:${season}|${week}`;
      if(memory.has(key))return cloneRecord(memory.get(key));
      if(pending.has(key))return pending.get(key).then(cloneRecord);
      const persistent=await readPersistent(key);
      if(persistent){memory.set(key,persistent);backgroundRefresh(key,`/.netlify/functions/league-hub-archive-fast?season=${season}&week=${week}`,{cache:'default'});return cloneRecord(persistent)}
      const target=`/.netlify/functions/league-hub-archive-fast?season=${season}&week=${week}`;
      const job=nativeFetch(target,{...(init||{}),cache:'default'}).then(recordResponse).then(rec=>{
        if(rec.status>=200&&rec.status<300){memory.set(key,rec);writePersistent(key,rec)}
        return rec;
      }).finally(()=>pending.delete(key));
      pending.set(key,job);
      return job.then(cloneRecord);
    }
  }

  if(!cacheable(url))return nativeFetch(input,init);
  const key=requestKey(url);
  if(memory.has(key))return cloneRecord(memory.get(key));
  if(pending.has(key))return pending.get(key).then(cloneRecord);

  const persistent=await readPersistent(key);
  if(persistent){
    memory.set(key,persistent);
    backgroundRefresh(key,input,init);
    return cloneRecord(persistent);
  }

  const job=nativeFetch(input,{...(init||{}),cache:'default'}).then(recordResponse).then(rec=>{
    if(rec.status>=200&&rec.status<300){memory.set(key,rec);writePersistent(key,rec)}
    return rec;
  }).finally(()=>pending.delete(key));
  pending.set(key,job);
  return job.then(cloneRecord);
};

function warm(){
  const urls=[
    '/.netlify/functions/league-hub?weekly=1',
    '/.netlify/functions/league-hub?broadcast_archive=1',
    '/.netlify/functions/league-hub?reporters=1',
    '/.netlify/functions/league-hub?managers=1',
    '/.netlify/functions/league-hub?weekly_awards=1',
    '/.netlify/functions/league-hub?drafts=1',
    '/.netlify/functions/value-history?trades=1'
  ];
  urls.forEach(u=>window.fetch(u,{cache:'default'}).catch(()=>{}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(warm,0),{once:true});else setTimeout(warm,0);
})();
