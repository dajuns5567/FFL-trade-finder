const LEAGUE='1316867686394769408',API='https://api.sleeper.app/v1';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=30, stale-while-revalidate=120','netlify-cdn-cache-control':'public, max-age=45, stale-while-revalidate=180','x-fleeced-weekly-live':'3'}});
const fetchJson=async url=>{const r=await fetch(url,{headers:{accept:'application/json','user-agent':'Fleeced-League-Hub/weekly-players'},cache:'no-store'});if(!r.ok)throw new Error('fetch '+r.status+' '+url);return r.json()};
const score=(stats,scoring)=>{if(!stats)return null;let n=0,used=false;for(const [k,w] of Object.entries(scoring||{})){const raw=stats[k]??(String(k).startsWith('idp_')?stats[String(k).slice(4)]:undefined),v=Number(raw),m=Number(w);if(Number.isFinite(v)&&Number.isFinite(m)){n+=v*m;used=true}}return used?Number(n.toFixed(2)):null};
const rows=payload=>Array.isArray(payload)?payload.map((x,i)=>({id:String(x?.player_id||x?.id||i),stats:x?.stats&&typeof x.stats==='object'?x.stats:x})):Object.entries(payload||{}).map(([k,x])=>({id:String(x?.player_id||x?.id||k),stats:x?.stats&&typeof x.stats==='object'?x.stats:x}));
const side=position=>{const p=String(position||'').toUpperCase();if(['QB','RB','WR','TE'].includes(p))return'offense';if(['DL','DE','DT','NT','EDGE','LB','DB','CB','S'].includes(p))return'defense';return''};
export default async req=>{
 try{
  const u=new URL(req.url),season=Number(u.searchParams.get('season')),week=Number(u.searchParams.get('week'));
  if(!Number.isInteger(season)||season<2024||!Number.isInteger(week)||week<1||week>18)return json({error:'valid season/week required'},400);
  const [league,players,stats]=await Promise.all([
   fetchJson(`${API}/league/${LEAGUE}`),
   fetchJson(`${API}/players/nfl`),
   fetchJson(`${API}/stats/nfl/regular/${season}/${week}`)
  ]),leaders={offense:null,defense:null};
  for(const row of rows(stats)){
   const meta=players?.[row.id]||{},group=side(meta.position),pts=score(row.stats,league?.scoring_settings||{});
   if(!group||pts==null)continue;
   const x={player_id:String(row.id),player_name:String(meta.full_name||[meta.first_name,meta.last_name].filter(Boolean).join(' ')||row.id),position:String(meta.position||''),nfl_team:String(meta.team||'FA'),points:Number(pts.toFixed(2))};
   if(!leaders[group]||x.points>leaders[group].points||(x.points===leaders[group].points&&x.player_id<leaders[group].player_id))leaders[group]=x;
  }
  if(!leaders.offense||!leaders.defense)return json({season,week,error:'weekly player leaders unavailable'},503);
  return json({season,week,players_of_week:leaders});
 }catch(e){console.error('league-hub-weekly-live-fast',e);return json({error:String(e?.message||e||'weekly player leaders unavailable')},503)}
};