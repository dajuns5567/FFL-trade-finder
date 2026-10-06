(()=>{
'use strict';
if(window.__fleecedLeagueHubFetchCacheV469)return;
window.__fleecedLeagueHubFetchCacheV469=true;

const nativeFetch=window.fetch.bind(window),memory=new Map(),pending=new Map();
const editions=window.__fleecedLeagueHubEditionsV457=window.__fleecedLeagueHubEditionsV457||new Map();
const cloneRecord=r=>new Response(r.body,{status:r.status,statusText:r.statusText,headers:r.headers});
const recordResponse=async response=>({body:await response.text(),status:response.status,statusText:response.statusText,headers:[...response.headers.entries()]});
const keyFor=url=>url.pathname+url.search;

function rememberEdition(key,rec){
  if(!rec||rec.status<200||rec.status>=300)return;
  if(!(String(key).startsWith('archive:')||String(key).startsWith('edition:')||key==='publication:latest'))return;
  try{
    const value=JSON.parse(rec.body);
    if(value?.available&&Array.isArray(value?.teams)&&value.teams.length){
      editions.set(String(key),value);
      window.__fleecedLeagueHubCurrentEditionV457=value;
    }
  }catch{}
}

function fastRoute(url){
  if(url.origin!==location.origin||url.pathname!=='/.netlify/functions/league-hub')return null;
  const season=Number(url.searchParams.get('broadcast_season')),week=Number(url.searchParams.get('broadcast_week'));
  if(season===2026&&[1,2].includes(week)){
    return{key:`archive:${season}|${week}`,target:`/.netlify/functions/league-hub-archive-fast?season=${season}&week=${week}&rev=469`};
  }
  if(season===2026&&week===3){
    return{key:'archive:2026|3',target:'/.netlify/functions/league-hub-week3-fast?rev=469'};
  }
  if(url.searchParams.get('weekly')==='1')return{key:'publication:latest',target:'/.netlify/functions/league-hub-read-fast?mode=latest&rev=469',fallback:'/.netlify/functions/league-hub-week3-fast?rev=469'};
  if(url.searchParams.get('broadcast_archive')==='1')return{key:'publication:archive',target:'/.netlify/functions/league-hub-archive-index-fast?rev=469'};
  if(url.searchParams.get('reporters')==='1')return{key:'publication:reporters',target:'/.netlify/functions/league-hub-read-fast?mode=reporters&rev=469'};
  if(url.searchParams.get('managers')==='1')return{key:'snapshot:managers',target:'/.netlify/functions/league-hub-read-fast?mode=managers&rev=469'};
  if(url.searchParams.get('weekly_awards')==='1')return{key:'snapshot:weekly-awards',target:'/.netlify/functions/league-hub-read-fast?mode=weekly-awards&rev=469'};
  return null;
}

function sessionKey(url){
  if(url.origin!==location.origin)return'';
  if(url.pathname!=='/.netlify/functions/league-hub')return'';
  if(url.searchParams.has('drafts'))return`session:${keyFor(url)}`;
  const season=Number(url.searchParams.get('broadcast_season')),week=Number(url.searchParams.get('broadcast_week'));
  if(season&&week)return`edition:${season}|${week}`;
  return'';
}

async function fetchRecord(target,init){return recordResponse(await nativeFetch(target,{...(init||{}),cache:'default'}))}
async function runOnce(key,target,init,remember=true,fallback=''){
  if(memory.has(key))return cloneRecord(memory.get(key));
  if(pending.has(key))return pending.get(key).then(cloneRecord);
  const job=(async()=>{
    let rec;
    try{rec=await fetchRecord(target,init)}catch{rec={body:'',status:599,statusText:'Fetch failed',headers:[]}}
    if((rec.status<200||rec.status>=300)&&fallback){
      try{rec=await fetchRecord(fallback,init)}catch{}
    }
    if(remember&&rec.status>=200&&rec.status<300)memory.set(key,rec);
    rememberEdition(key,rec);
    return rec;
  })().finally(()=>pending.delete(key));
  pending.set(key,job);
  return job.then(cloneRecord);
}

window.fetch=async function(input,init){
  let url;
  try{url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href)}catch{return nativeFetch(input,init)}
  const method=String(init?.method||((typeof input==='object'&&input?.method)||'GET')).toUpperCase();
  if(method!=='GET')return nativeFetch(input,init);

  const fast=fastRoute(url);
  if(fast)return runOnce(fast.key,fast.target,init,true,fast.fallback||'');
  const key=sessionKey(url);
  if(key)return runOnce(key,input,init,true);
  return nativeFetch(input,init);
};
})();
