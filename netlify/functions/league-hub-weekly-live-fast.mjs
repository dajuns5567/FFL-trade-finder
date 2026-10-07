const LEAGUE='1316867686394769408',API='https://api.sleeper.app/v1';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=20, stale-while-revalidate=60','netlify-cdn-cache-control':'public, max-age=30, stale-while-revalidate=120','x-fleeced-weekly-live':'2'}});
const fetchJson=async url=>{const r=await fetch(url,{headers:{accept:'application/json','user-agent':'Fleeced-League-Hub/weekly-live'},cache:'no-store'});if(!r.ok)throw new Error('fetch '+r.status+' '+url);return r.json()};
const score=(stats,scoring)=>{if(!stats)return null;let n=0,used=false;for(const [k,w] of Object.entries(scoring||{})){const raw=stats[k]??(String(k).startsWith('idp_')?stats[String(k).slice(4)]:undefined),v=Number(raw),m=Number(w);if(Number.isFinite(v)&&Number.isFinite(m)){n+=v*m;used=true}}return used?Number(n.toFixed(2)):null};
const statRows=payload=>Array.isArray(payload)?payload.map((x,i)=>({id:String(x?.player_id||x?.id||i),stats:x?.stats&&typeof x.stats==='object'?x.stats:x})):Object.entries(payload||{}).map(([k,x])=>({id:String(x?.player_id||x?.id||k),stats:x?.stats&&typeof x.stats==='object'?x.stats:x}));
const group=position=>{const p=String(position||'').toUpperCase();if(['QB','RB','WR','TE'].includes(p))return'offense';if(['DL','DE','DT','NT','EDGE','LB','DB','CB','S'].includes(p))return'defense';return''};
function managerAwards(b){
 const valid=(b?.teams||[]).filter(t=>Number.isFinite(Number(t?.points)));if(!valid.length)return[];
 const byId=new Map(valid.map(t=>[String(t.roster_id),t])),oppProj=t=>Number(t?.opponent_projected??byId.get(String(t?.opponent_roster_id||''))?.projected),
 high=valid.slice().sort((a,b)=>Number(b.points)-Number(a.points)||String(a.roster_id).localeCompare(String(b.roster_id)))[0],
 low=valid.slice().sort((a,b)=>Number(a.points)-Number(b.points)||String(a.roster_id).localeCompare(String(b.roster_id)))[0],
 losses=valid.filter(g=>g.won===false),wins=valid.filter(g=>g.won===true),
 hot=losses.filter(g=>Number.isFinite(Number(g.projected))&&Number.isFinite(oppProj(g))&&Number(g.projected)>oppProj(g)).sort((a,b)=>(Number(b.projected)-oppProj(b))-(Number(a.projected)-oppProj(a))||String(a.roster_id).localeCompare(String(b.roster_id)))[0],
 cool=wins.slice().sort((a,b)=>(Number(b.points)-Number(b.opponent_points))-(Number(a.points)-Number(a.opponent_points))||String(a.roster_id).localeCompare(String(b.roster_id)))[0],
 item=(type,title,t,detail)=>t?{type,title,roster_id:String(t.roster_id||''),manager_user_id:String(t.manager_user_id||''),manager_name:String(t.manager_name||''),team_name:String(t.team_name||''),points:Number(t.points)||0,detail}:null;
 return[
  item('hot-seat','🔥 Hot Seat',hot,hot?`Projected by ${(Number(hot.projected)-oppProj(hot)).toFixed(1)} to win • lost by ${Math.abs(Number(hot.points)-Number(hot.opponent_points)).toFixed(1)}`:''),
  item('cool-throne','🧊 Cool Throne',cool,cool?`Won by ${Math.abs(Number(cool.points)-Number(cool.opponent_points)).toFixed(1)}`:''),
  item('highest-scorer','🔥 Highest Scorer',high,high?`${Number(high.points).toFixed(1)} fantasy points`:''),
  item('lowest-scorer','🥶 Lowest Scorer',low,low?`${Number(low.points).toFixed(1)} fantasy points`:'')
 ].filter(Boolean);
}
export default async(req)=>{
 try{
  const origin=new URL(req.url).origin,editionResponse=await fetch(origin+'/.netlify/functions/league-hub?weekly=1',{headers:{accept:'application/json'},cache:'no-store'});
  if(!editionResponse.ok)throw new Error('latest edition '+editionResponse.status);
  const broadcast=await editionResponse.json(),season=Number(broadcast?.season),week=Number(broadcast?.week);
  if(!broadcast?.available||!season||!week||!(broadcast?.teams||[]).length)return json({records:[],reason:'no completed edition'});
  const [league,players,stats]=await Promise.all([
   fetchJson(`${API}/league/${LEAGUE}`),
   fetchJson(`${API}/players/nfl`).catch(()=>({})),
   fetchJson(`${API}/stats/nfl/regular/${season}/${week}`).catch(()=>({}))
  ]),leaders={offense:null,defense:null};
  for(const row of statRows(stats)){const meta=players?.[row.id]||{},g=group(meta.position),pts=score(row.stats,league?.scoring_settings||{});if(!g||pts==null)continue;const x={player_id:String(row.id),player_name:String(meta.full_name||[meta.first_name,meta.last_name].filter(Boolean).join(' ')||row.id),position:String(meta.position||''),nfl_team:String(meta.team||'FA'),points:Number(pts.toFixed(2))};if(!leaders[g]||x.points>leaders[g].points||(x.points===leaders[g].points&&x.player_id<leaders[g].player_id))leaders[g]=x}
  if(!leaders.offense||!leaders.defense)return json({records:[],season,week,reason:'weekly player stats incomplete'},503);
  return json({schema_version:2,latest_completed:{season,week},records:[{season,week,captured_at:String(broadcast.generated_at||''),manager_awards:managerAwards(broadcast),players_of_week:leaders}]});
 }catch(e){console.error('league-hub-weekly-live-fast',e);return json({records:[],error:String(e?.message||e||'weekly live unavailable')},503)}
};