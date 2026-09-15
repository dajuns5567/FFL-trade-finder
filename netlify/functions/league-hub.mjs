import { getStore } from '@netlify/blobs';

const LEAGUE='1316867686394769408';
const API='https://api.sleeper.app/v1';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const fetchJson=async url=>{const r=await fetch(url,{headers:{accept:'application/json','user-agent':'Fleeced-League-Hub/2.0'},cache:'no-store'});if(!r.ok)throw new Error(`Sleeper ${r.status}`);return r.json()};
const store=()=>getStore('fleeced-league-hub',{consistency:'strong'});
const score=(stats,scoring)=>{if(!stats)return null;let n=0,used=false;for(const [k,w] of Object.entries(scoring||{})){const v=Number(stats[k]),m=Number(w);if(Number.isFinite(v)&&Number.isFinite(m)){n+=v*m;used=true}}return used?Number(n.toFixed(2)):null};
function projectionRows(raw){if(Array.isArray(raw))return raw;if(Array.isArray(raw?.players))return raw.players;if(raw&&typeof raw==='object')return Object.values(raw);return[]}
async function projections(season,week,scoring){
  const urls=[`https://api.sleeper.app/projections/nfl/${season}/${week}?season_type=regular`,`https://api.sleeper.com/projections/nfl/${season}/${week}?season_type=regular`];
  for(const u of urls)try{const raw=await fetchJson(u),map={};for(const r of projectionRows(raw)){const id=String(r?.player_id||r?.player?.player_id||'');if(!id)continue;const s=r?.stats||r?.projection||r;const custom=score(s,scoring),fallback=Number(r?.pts_ppr??s?.pts_ppr??r?.fantasy_points);map[id]=Number.isFinite(custom)?custom:(Number.isFinite(fallback)?fallback:null)}if(Object.keys(map).length)return map}catch{}
  return{};
}
function txByRoster(rows){const out={};for(const tx of rows||[]){const touched=new Set([...(tx?.roster_ids||[]).map(String),...Object.values(tx?.adds||{}).map(String),...Object.values(tx?.drops||{}).map(String)]);for(const id of touched){if(!out[id])out[id]=[];out[id].push({id:String(tx?.transaction_id||''),type:String(tx?.type||'transaction'),status:String(tx?.status||''),adds:Object.keys(tx?.adds||{}),drops:Object.keys(tx?.drops||{}),created:Number(tx?.status_updated||tx?.created)||null})}}return out}
function opponentMap(matchups){const groups=new Map(),out={};for(const m of matchups||[]){const k=String(m?.matchup_id??'');if(!k)continue;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m)}for(const rows of groups.values())if(rows.length===2){out[String(rows[0].roster_id)]=String(rows[1].roster_id);out[String(rows[1].roster_id)]=String(rows[0].roster_id)}return out}
async function weeklyReport(){
 const [league,nfl]=await Promise.all([fetchJson(`${API}/league/${LEAGUE}`),fetchJson(`${API}/state/nfl`)]);
 const season=Number(league?.season||nfl?.season),currentWeek=Number(nfl?.week)||1,week=Math.max(1,currentWeek-1);
 if(currentWeek<=1)return{available:false,season,week:null,reason:'The first weekly report unlocks after Sleeper advances beyond Week 1, so incomplete games are never written up.'};
 const [matchups,transactions,rosters,users,proj]=await Promise.all([
  fetchJson(`${API}/league/${LEAGUE}/matchups/${week}`),
  fetchJson(`${API}/league/${LEAGUE}/transactions/${week}`).catch(()=>[]),
  fetchJson(`${API}/league/${LEAGUE}/rosters`),
  fetchJson(`${API}/league/${LEAGUE}/users`),
  projections(season,week,league?.scoring_settings||{})
 ]);
 const opp=opponentMap(matchups),tx=txByRoster(transactions),userById=new Map((users||[]).map(u=>[String(u.user_id),u])),rosterById=new Map((rosters||[]).map(r=>[String(r.roster_id),r]));
 const teams=(matchups||[]).map(m=>{const id=String(m.roster_id),oid=opp[id],o=(matchups||[]).find(x=>String(x.roster_id)===oid),r=rosterById.get(id),u=userById.get(String(r?.owner_id||'')),starters=(m.starters||[]).filter(x=>x&&x!=='0'),points=m.players_points||{},projected=starters.reduce((n,p)=>n+(Number(proj[p])||0),0),projectedKnown=starters.filter(p=>Number.isFinite(Number(proj[p]))).length,bench=(m.players||[]).filter(p=>!starters.includes(p)),bestBench=bench.map(p=>({id:String(p),points:Number(points[p])||0})).sort((a,b)=>b.points-a.points)[0]||null,worstStarter=starters.map(p=>({id:String(p),points:Number(points[p])||0})).sort((a,b)=>a.points-b.points)[0]||null;
  return{roster_id:id,team_name:String(u?.metadata?.team_name||u?.display_name||`Roster ${id}`),opponent_roster_id:oid||null,points:Number(m.points)||0,opponent_points:Number(o?.points)||0,won:o?Number(m.points)>Number(o.points):null,projected:Number(projected.toFixed(2)),projection_coverage:projectedKnown,starter_count:starters.length,best_bench:bestBench,worst_starter:worstStarter,transactions:tx[id]||[]};
 });
 return{available:true,season,week,generated_at:new Date().toISOString(),projection_source:Object.keys(proj).length?'Sleeper weekly projections scored with league scoring settings':'projection data unavailable',teams};
}
async function draftAwards(){
 const league=await fetchJson(`${API}/league/${LEAGUE}`),current=Number(league?.season)||new Date().getFullYear(),years=[current,current-1,current-2,current-3],out=[];
 for(const season of years){
  let leagueId=String(league?.league_id||LEAGUE),seasonLeague=league;
  while(Number(seasonLeague?.season)>season&&seasonLeague?.previous_league_id){leagueId=String(seasonLeague.previous_league_id);seasonLeague=await fetchJson(`${API}/league/${leagueId}`).catch(()=>null);if(!seasonLeague)break}
  if(Number(seasonLeague?.season)!==season)continue;
  const drafts=await fetchJson(`${API}/league/${leagueId}/drafts`).catch(()=>[]);
  for(const d of drafts||[]){
   const did=String(d?.draft_id||'');if(!did)continue;
   const [draft,picks]=await Promise.all([fetchJson(`${API}/draft/${did}`).catch(()=>d),fetchJson(`${API}/draft/${did}/picks`).catch(()=>[])]);
   for(const p of picks||[])out.push({season:Number(draft?.season||season),round:Number(p?.round)||null,pick_no:Number(p?.pick_no)||null,draft_slot:Number(p?.draft_slot)||null,roster_id:String(p?.roster_id||''),player_id:String(p?.player_id||''),draft_id:did});
  }
 }
 return{draft_picks:out};
}
async function draftRecords(req){
 const s=store(),body=req.method==='POST'?await req.json().catch(()=>null):null;
 if(req.method==='POST'&&body?.records&&Array.isArray(body.records)){
  const old=await s.get('awards/draft-records.json',{type:'json'}).catch(()=>null),records=Array.isArray(old)?old:[],seen=new Set(records.map(x=>[x.season,x.roster_id,x.player_id,x.pick_no,x.captured_value].join('|')));
  for(const x of body.records){const rec={season:Number(x.season)||null,roster_id:String(x.roster_id||''),player_id:String(x.player_id||''),pick_no:Number(x.pick_no)||null,captured_value:Math.round(Number(x.captured_value)||0),delta:Math.round(Number(x.delta)||0),captured_at:new Date().toISOString()};const k=[rec.season,rec.roster_id,rec.player_id,rec.pick_no,rec.captured_value].join('|');if(rec.season&&rec.roster_id&&rec.player_id&&rec.pick_no&&!seen.has(k)){seen.add(k);records.push(rec)}}
  await s.setJSON('awards/draft-records.json',records.slice(-5000));return json({ok:true,records});
 }
 const records=await s.get('awards/draft-records.json',{type:'json'}).catch(()=>null);return json({records:Array.isArray(records)?records:[]});
}
async function managerHistory(){
 const s=store(),nfl=await fetchJson(`${API}/state/nfl`).catch(()=>({})),currentSeason=Number(nfl?.season)||new Date().getFullYear(),currentWeek=Number(nfl?.week)||1;
 let league=await fetchJson(`${API}/league/${LEAGUE}`),chain=[];
 for(let guard=0;league&&guard<12;guard++){chain.push(league);if(!league.previous_league_id)break;league=await fetchJson(`${API}/league/${league.previous_league_id}`).catch(()=>null)}
 chain.sort((a,b)=>Number(a.season)-Number(b.season));
 const career={},assignments=[],current=[];
 for(const lg of chain){
  const lid=String(lg.league_id),season=Number(lg.season),[rosters,users,bracket]=await Promise.all([fetchJson(`${API}/league/${lid}/rosters`).catch(()=>[]),fetchJson(`${API}/league/${lid}/users`).catch(()=>[]),fetchJson(`${API}/league/${lid}/winners_bracket`).catch(()=>[])]);
  const ub=new Map(users.map(u=>[String(u.user_id),u])),rb=new Map(rosters.map(r=>[String(r.roster_id),r])),ownerByRoster={};
  for(const r of rosters){const uid=String(r.owner_id||'');if(!uid)continue;ownerByRoster[String(r.roster_id)]=uid;const u=ub.get(uid)||{};if(!career[uid])career[uid]={user_id:uid,sleeper_id:String(u.display_name||u.username||uid),wins:0,championships:0,division_wins:0,regular_season_titles:0,seasons:[]};assignments.push({season,roster_id:String(r.roster_id),user_id:uid,sleeper_id:career[uid].sleeper_id});if(String(lg.league_id)===String(LEAGUE))current.push({roster_id:String(r.roster_id),user_id:uid,sleeper_id:career[uid].sleeper_id})}
  const maxWeek=season<currentSeason?14:Math.min(14,Math.max(0,currentWeek-1)),seasonWins={};
  for(let w=1;w<=maxWeek;w++){const ms=await fetchJson(`${API}/league/${lid}/matchups/${w}`).catch(()=>[]),groups={};for(const m of ms){const k=String(m.matchup_id??'');if(!k)continue;(groups[k]||(groups[k]=[])).push(m)}for(const pair of Object.values(groups)){if(pair.length!==2)continue;const [a,b]=pair,ap=Number(a.points)||0,bp=Number(b.points)||0,aw=ap>bp,bw=bp>ap;for(const [m,won,o] of [[a,aw,b],[b,bw,a]]){const uid=ownerByRoster[String(m.roster_id)];if(!uid||!won)continue;career[uid].wins++;seasonWins[uid]=(seasonWins[uid]||0)+1;const rd=rb.get(String(m.roster_id))?.settings?.division,od=rb.get(String(o.roster_id))?.settings?.division;if(rd!=null&&od!=null&&String(rd)===String(od))career[uid].division_wins++}}}
  if(season<currentSeason){const champ=(bracket||[]).find(x=>Number(x.p)===1),champRoster=String(champ?.w||champ?.roster_id||'');if(champRoster&&ownerByRoster[champRoster])career[ownerByRoster[champRoster]].championships++;let top=null;for(const r of rosters){const uid=ownerByRoster[String(r.roster_id)];if(!uid)continue;const wins=Number(r.settings?.wins)||seasonWins[uid]||0,fpts=Number(r.settings?.fpts)||0,fpd=Number(r.settings?.fpts_decimal)||0,score=wins*1e9+fpts*1000+fpd;if(!top||score>top.score)top={uid,score}}if(top)career[top.uid].regular_season_titles++}
 }
 const old=await s.get('managers/registry.json',{type:'json'}).catch(()=>null),registry=old&&typeof old==='object'?old:{current:{},graveyard:[]},now=new Date().toISOString(),curMap={};
 for(const x of current){curMap[x.roster_id]={user_id:x.user_id,sleeper_id:x.sleeper_id,since:registry.current?.[x.roster_id]?.user_id===x.user_id?registry.current[x.roster_id].since:now};const prev=registry.current?.[x.roster_id];if(prev?.user_id&&prev.user_id!==x.user_id&&!registry.graveyard.some(g=>g.user_id===prev.user_id&&g.roster_id===x.roster_id)){const st=career[prev.user_id]||{};registry.graveyard.push({...prev,roster_id:x.roster_id,retired_at:now,career:{wins:st.wins||0,championships:st.championships||0,division_wins:st.division_wins||0,regular_season_titles:st.regular_season_titles||0}})}}
 registry.current=curMap;await s.setJSON('managers/registry.json',registry);
 return{current,graveyard:registry.graveyard||[],career:Object.values(career),assignments,generated_at:now};
}
async function awards(req){
 const s=store();
 if(req.method==='GET'){const list=await s.get('awards/history.json',{type:'json'}).catch(()=>null);return json({history:Array.isArray(list)?list:[]})}
 const body=await req.json().catch(()=>null),period=String(body?.period||''),rows=Array.isArray(body?.awards)?body.awards:[];
 if(!/^\w+ \d{4}$/.test(period)||!rows.length)return json({error:'invalid award snapshot'},400);
 const old=await s.get('awards/history.json',{type:'json'}).catch(()=>null),history=Array.isArray(old)?old:[];
 if(!history.some(x=>x.period===period)){history.push({period,captured_at:new Date().toISOString(),awards:rows.slice(0,20).map(x=>({key:String(x.key||''),title:String(x.title||''),roster_id:String(x.roster_id||''),detail:String(x.detail||'')}))});history.sort((a,b)=>String(a.period).localeCompare(String(b.period)));await s.setJSON('awards/history.json',history)}
 return json({ok:true,history});
}
export default async req=>{try{const u=new URL(req.url);if(u.searchParams.get('weekly')==='1')return json(await weeklyReport());if(u.searchParams.get('managers')==='1')return json(await managerHistory());if(u.searchParams.get('drafts')==='1')return json(await draftAwards());if(u.searchParams.get('draft_records')==='1')return draftRecords(req);if(u.searchParams.get('awards')==='1')return awards(req);return json({error:'query required'},400)}catch(e){console.error('league-hub',e);return json({error:'league hub unavailable'},503)}};
