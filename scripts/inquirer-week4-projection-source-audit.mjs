import preload from '../netlify/functions/inquirer-week4-2026-preload.mjs';
const week=preload();const players=[...new Set(week.teams.flatMap(t=>(t.starter_details||[]).map(p=>String(p.id))))];
const sources=[
 'https://api.sleeper.app/projections/nfl/2026/4?season_type=regular',
 'https://api.sleeper.com/projections/nfl/2026/4?season_type=regular',
 'https://api.sleeper.app/projections/nfl/2026/5?season_type=regular',
 'https://api.sleeper.com/projections/nfl/2026/5?season_type=regular',
 'https://api.sleeper.app/v1/league/1316867686394769408',
 'https://api.sleeper.app/v1/league/1316867686394769408/matchups/4'
];
for(const url of sources){try{
 const c=new AbortController(),tm=setTimeout(()=>c.abort(),18000);
 let r;try{r=await fetch(url,{signal:c.signal,headers:{accept:'application/json','user-agent':'Fleeced-League-Hub/2.0'}})}finally{clearTimeout(tm)}
 const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{}
 const obj=data&&typeof data==='object'?data:{};
 let rows=Array.isArray(data)?data:Array.isArray(obj.players)?obj.players:Object.entries(obj).map(([id,x])=>x&&typeof x==='object'?{...x,player_id:x.player_id??id}:null).filter(Boolean);
 const ids=new Set(rows.map(x=>String(x.player_id||x.player?.player_id||'')));
 console.log('PROJECTION_SOURCE_DIAGNOSTIC',JSON.stringify({url,status:r.status,bytes:raw.length,kind:Array.isArray(data)?'array':typeof data,topKeys:Object.keys(obj).slice(0,8),rows:rows.length,starterMatches:players.filter(x=>ids.has(x)).length,sample:rows.slice(0,2).map(x=>({id:x.player_id,keys:Object.keys(x).slice(0,12),statKeys:Object.keys(x.stats||x.projection||{}).slice(0,12)})),firstChars:r.ok?'':raw.slice(0,110)}))
}catch(e){console.log('PROJECTION_SOURCE_DIAGNOSTIC',JSON.stringify({url,error:String(e?.message||e)}))}}
console.log('WEEK4_STARTER_IDS',players.length);
