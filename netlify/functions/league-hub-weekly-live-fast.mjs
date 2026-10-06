import {getStore} from '@netlify/blobs';
import week1Preload2026 from './inquirer-week1-2026-preload.mjs';
import week2Preload2026 from './inquirer-week2-2026-preload.mjs';
import week3Preload2026 from './inquirer-week3-2026-preload.mjs';
import {applyWeek2EditorialR16} from './inquirer-week2-editorial-r28.mjs';
import {applyPublishedForwardFix} from './inquirer-week3-published-r1.mjs';

const LEAGUE='1316867686394769408',API='https://api.sleeper.app/v1';
const store=()=>getStore('fleeced-league-hub',{consistency:'strong'});
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=20, stale-while-revalidate=60','netlify-cdn-cache-control':'public, max-age=30, stale-while-revalidate=120','x-fleeced-weekly-live':'1'}});
const fetchJson=async url=>{const r=await fetch(url,{headers:{accept:'application/json','user-agent':'Fleeced-League-Hub/weekly-live'},cache:'no-store'});if(!r.ok)throw new Error('Sleeper '+r.status);return r.json()};
const score=(stats,scoring)=>{if(!stats)return null;let n=0,used=false;for(const [k,w] of Object.entries(scoring||{})){const raw=stats[k]??(String(k).startsWith('idp_')?stats[String(k).slice(4)]:undefined),v=Number(raw),m=Number(w);if(Number.isFinite(v)&&Number.isFinite(m)){n+=v*m;used=true}}return used?Number(n.toFixed(2)):null};
const statRows=payload=>Array.isArray(payload)?payload.map((x,i)=>({id:String(x?.player_id||x?.id||i),stats:x?.stats&&typeof x.stats==='object'?x.stats:x})):Object.entries(payload||{}).map(([k,x])=>({id:String(x?.player_id||x?.id||k),stats:x?.stats&&typeof x.stats==='object'?x.stats:x}));
const group=position=>{const p=String(position||'').toUpperCase();if(['QB','RB','WR','TE'].includes(p))return'offense';if(['DL','DE','DT','NT','EDGE','LB','DB','CB','S'].includes(p))return'defense';return''};
const week1=()=>week1Preload2026;
const week2=()=>applyWeek2EditorialR16(week2Preload2026);
const week3=()=>applyPublishedForwardFix(week3Preload2026(),week2());

async function archiveRows(){
 const idx=await store().get('broadcasts/index.json',{type:'json'}).catch(()=>[]),rows=Array.isArray(idx)?idx.slice():[];
 for(const p of [week1(),week2(),week3()]){const key=Number(p.season)+'|'+Number(p.week);if(!rows.some(x=>Number(x.season)+'|'+Number(x.week)===key))rows.push({season:Number(p.season),week:Number(p.week),preloaded:true})}
 return rows.filter(x=>Number(x.season)&&Number(x.week)).sort((a,b)=>Number(b.season)-Number(a.season)||Number(b.week)-Number(a.week));
}
async function edition(season,week){
 if(season===2026&&week===3)return week3();
 if(season===2026&&week===2)return week2();
 if(season===2026&&week===1)return week1();
 return store().get(`broadcasts/${season}/week-${String(week).padStart(2,'0')}.json`,{type:'json'}).catch(()=>null);
}
function managerAwards(b){
 const valid=(b?.teams||[]).filter(t=>Number.isFinite(Number(t?.points)));if(!valid.length)return[];
 const high=valid.slice().sort((a,b)=>Number(b.points)-Number(a.points)||String(a.roster_id).localeCompare(String(b.roster_id)))[0],
 low=valid.slice().sort((a,b)=>Number(a.points)-Number(b.points)||String(a.roster_id).localeCompare(String(b.roster_id)))[0],
 losses=valid.filter(g=>g.won===false),wins=valid.filter(g=>g.won===true),
 hot=losses.filter(g=>Number.isFinite(Number(g.projected))&&Number.isFinite(Number(g.opponent_projected))&&Number(g.projected)>Number(g.opponent_projected)).sort((a,b)=>(Number(b.projected)-Number(b.opponent_projected))-(Number(a.projected)-Number(a.opponent_projected)))[0],
 cool=wins.slice().sort((a,b)=>(Number(b.points)-Number(b.opponent_points))-(Number(a.points)-Number(a.opponent_points)))[0],
 item=(type,title,t,detail)=>t?{type,title,roster_id:String(t.roster_id||''),manager_user_id:String(t.manager_user_id||''),manager_name:String(t.manager_name||''),team_name:String(t.team_name||''),points:Number(t.points)||0,detail}:null;
 return[
  item('hot-seat','🔥 Hot Seat',hot,hot?`Projected by ${(Number(hot.projected)-Number(hot.opponent_projected)).toFixed(1)} to win • lost by ${Math.abs(Number(hot.points)-Number(hot.opponent_points)).toFixed(1)}`:''),
  item('cool-throne','🧊 Cool Throne',cool,cool?`Won by ${Math.abs(Number(cool.points)-Number(cool.opponent_points)).toFixed(1)}`:''),
  item('highest-scorer','🔥 Highest Scorer',high,high?`${Number(high.points).toFixed(1)} fantasy points`:''),
  item('lowest-scorer','🥶 Lowest Scorer',low,low?`${Number(low.points).toFixed(1)} fantasy points`:'')
 ].filter(Boolean);
}

export default async()=>{
 try{
  const rows=await archiveRows(),latest=rows[0];if(!latest)return json({records:[]});
  const season=Number(latest.season),week=Number(latest.week),broadcast=await edition(season,week);
  if(!broadcast?.available||!(broadcast?.teams||[]).length)return json({records:[]});
  const [league,players,stats]=await Promise.all([fetchJson(`${API}/league/${LEAGUE}`),fetchJson(`${API}/players/nfl`).catch(()=>({})),fetchJson(`${API}/stats/nfl/regular/${season}/${week}`).catch(()=>({}))]),leaders={offense:null,defense:null};
  for(const row of statRows(stats)){const meta=players?.[row.id]||{},g=group(meta.position),pts=score(row.stats,league?.scoring_settings||{});if(!g||pts==null)continue;const x={player_id:String(row.id),player_name:String(meta.full_name||[meta.first_name,meta.last_name].filter(Boolean).join(' ')||row.id),position:String(meta.position||''),nfl_team:String(meta.team||'FA'),points:Number(pts.toFixed(2))};if(!leaders[g]||x.points>leaders[g].points||(x.points===leaders[g].points&&x.player_id<leaders[g].player_id))leaders[g]=x}
  return json({schema_version:1,latest_completed:{season,week},records:[{season,week,captured_at:String(broadcast.generated_at||''),manager_awards:managerAwards(broadcast),players_of_week:leaders}]});
 }catch(e){console.error('league-hub-weekly-live-fast',e);return json({records:[],error:'weekly live unavailable'},503)}
};