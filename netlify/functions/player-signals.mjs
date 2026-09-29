import {API,getJson,fetchBestSeason} from './history-fetch.mjs';
import {PLAYER_SIGNAL_VERSION,buildPlayerSignal,recentFormProfile} from './player-signal-engine.mjs';

const LEAGUE='1316867686394769408';
let memo={key:'',at:0,data:null};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const isDefensive=pos=>/^(DL|DE|DT|LB|DB|CB|S|ILB|OLB|FS|SS|NT|EDGE|IDP)$/i.test(String(pos||''));
const first=(row,...keys)=>{for(const k of keys){const n=Number(row?.[k]);if(Number.isFinite(n))return n}return null};
const games=row=>['gp','gms_active','games_played','games','gms'].map(k=>Number(row?.[k])).find(n=>Number.isFinite(n)&&n>=0)||0;
const score=(stats,scoring)=>{if(!stats)return null;let n=0,used=false;for(const [k,w] of Object.entries(scoring||{})){const raw=stats[k]??(String(k).startsWith('idp_')?stats[String(k).slice(4)]:undefined),v=Number(raw),m=Number(w);if(Number.isFinite(v)&&Number.isFinite(m)){n+=v*m;used=true}}return used?Number(n.toFixed(2)):null};
function statsMap(payload){
  const out={};
  if(Array.isArray(payload)){for(const row of payload||[]){const id=String(row?.player_id||row?.id||'');if(id)out[id]=row?.stats&&typeof row.stats==='object'?row.stats:row}return out}
  for(const [id,row] of Object.entries(payload||{}))out[String(row?.player_id||row?.id||id)]=row?.stats&&typeof row.stats==='object'?row.stats:row;
  return out;
}
function playerName(meta,id){return String(meta?.full_name||((meta?.first_name||'')+' '+(meta?.last_name||'')).trim()||id)}
function playerPacket(meta,id,stats,priorRaw,seasonSeries,scoring){
  const position=String(meta?.position||meta?.fantasy_positions?.[0]||'FLEX'),defensive=isDefensive(position),
    currentPoints=score(stats,scoring),seasonPoints=seasonSeries.reduce((n,x)=>n+Number(x.points||0),0),seasonGames=seasonSeries.length,
    currentSnaps=first(stats,...(defensive?['def_snp','def_snaps','defensive_snaps']:['off_snp','off_snaps','offensive_snaps'])),
    teamSnaps=first(stats,...(defensive?['tm_def_snp','team_def_snaps']:['tm_off_snp','team_off_snaps'])),
    currentSnapPctRaw=first(stats,...(defensive?['def_snp_pct','def_snap_pct','def_pct','snap_pct']:['off_snp_pct','off_snap_pct','off_pct','snap_pct'])),
    currentSnapPct=currentSnapPctRaw!=null&&Number(currentSnapPctRaw)>0?(Number(currentSnapPctRaw)>1.5?Number(currentSnapPctRaw)/100:Number(currentSnapPctRaw)):(Number.isFinite(Number(currentSnaps))&&Number.isFinite(Number(teamSnaps))&&Number(teamSnaps)>0?Number(currentSnaps)/Number(teamSnaps):null),
    priorGames=games(priorRaw),priorTotal=priorGames?score(priorRaw,scoring):null,priorAvg=priorGames&&Number.isFinite(Number(priorTotal))?Number(priorTotal)/priorGames:null,
    priorSnaps=first(priorRaw,...(defensive?['def_snp','def_snaps','defensive_snaps']:['off_snp','off_snaps','offensive_snaps'])),
    priorTeamSnaps=first(priorRaw,...(defensive?['tm_def_snp','team_def_snaps']:['tm_off_snp','team_off_snaps'])),
    priorSnapsPerGame=priorGames&&Number.isFinite(Number(priorSnaps))?Number(priorSnaps)/priorGames:null,
    priorSnapPctRaw=first(priorRaw,...(defensive?['def_snp_pct','def_snap_pct','def_pct','snap_pct']:['off_snp_pct','off_snap_pct','off_pct','snap_pct'])),
    priorSnapPct=priorSnapPctRaw!=null&&Number(priorSnapPctRaw)>0?(Number(priorSnapPctRaw)>1.5?Number(priorSnapPctRaw)/100:Number(priorSnapPctRaw)):(Number.isFinite(Number(priorSnaps))&&Number.isFinite(Number(priorTeamSnaps))&&Number(priorTeamSnaps)>0?Number(priorSnaps)/Number(priorTeamSnaps):null);
  return{
    id:String(id),name:playerName(meta,id),position,nfl_team:String(meta?.team||'FA'),
    age:Number.isFinite(Number(meta?.age))?Number(meta.age):null,years_exp:Number.isFinite(Number(meta?.years_exp))?Number(meta.years_exp):null,
    points:Number.isFinite(Number(currentPoints))?Number(currentPoints):null,
    season_games:seasonGames,season_fantasy_points:seasonPoints,season_avg:seasonGames?seasonPoints/seasonGames:null,
    prior_season_games:priorGames,prior_season_avg:Number.isFinite(Number(priorAvg))?Number(priorAvg):null,
    current_snap_count:Number.isFinite(Number(currentSnaps))?Number(currentSnaps):null,current_snap_pct:Number.isFinite(Number(currentSnapPct))?Number(currentSnapPct):null,
    prior_season_snaps:Number.isFinite(Number(priorSnaps))?Number(priorSnaps):null,prior_season_snaps_per_game:Number.isFinite(Number(priorSnapsPerGame))?Number(priorSnapsPerGame):null,
    prior_season_snap_pct:Number.isFinite(Number(priorSnapPct))?Number(priorSnapPct):null
  };
}
async function buildSignals(){
  const [league,state,rosters,users,players]=await Promise.all([
    getJson(`${API}/league/${LEAGUE}`),getJson(`${API}/state/nfl`),getJson(`${API}/league/${LEAGUE}/rosters`),getJson(`${API}/league/${LEAGUE}/users`),getJson(`${API}/players/nfl`)
  ]);
  const season=Number(league?.season)||Number(state?.season)||new Date().getUTCFullYear(),rawWeek=Number(state?.week)||1,
    completedWeek=Math.max(0,Math.min(18,rawWeek-1)),cacheKey=season+'|'+completedWeek;
  if(memo.data&&memo.key===cacheKey&&Date.now()-memo.at<300000)return memo.data;
  const weekNums=Array.from({length:completedWeek},(_,i)=>i+1),[priorSeason,weeklyPayloads]=await Promise.all([
    fetchBestSeason(season-1),Promise.all(weekNums.map(w=>getJson(`${API}/stats/nfl/regular/${season}/${w}`).catch(()=>({}))))
  ]),weekly=Object.fromEntries(weekNums.map((w,i)=>[w,statsMap(weeklyPayloads[i])])),
    userById=new Map((users||[]).map(u=>[String(u.user_id),u])),ownership=new Map(),ids=new Set();
  for(const roster of rosters||[]){
    const rid=String(roster.roster_id),owner=String(roster.owner_id||''),u=userById.get(owner)||{},teamName=String(u?.metadata?.team_name||u?.display_name||u?.username||('Roster '+rid));
    for(const raw of roster.players||[]){const id=String(raw||'');if(!id)continue;ids.add(id);ownership.set(id,{roster_id:rid,user_id:owner,manager_name:String(u?.display_name||u?.username||owner),team_name:teamName})}
  }
  const scoring=league?.scoring_settings||{},historyByPlayer={},currentSignals=[];
  for(const id of ids){
    const meta=players?.[id]||{},priorRaw=priorSeason?.stats?.[id]||{},series=[],signals=[];let previousSignal=null,previousPlayer=null;
    for(const week of weekNums){
      const st=weekly[week]?.[id];
      if(!st){previousSignal=null;previousPlayer=null;continue}
      const pts=score(st,scoring);
      if(!Number.isFinite(Number(pts))){previousSignal=null;previousPlayer=null;continue}
      series.push({week,points:Number(pts)});
      const player=playerPacket(meta,id,st,priorRaw,series,scoring),form=recentFormProfile(series),
        signal=buildPlayerSignal({player,previousPlayer,recentForm:form,season,week,previousSignal,slot:1});
      signals.push(signal);previousSignal=signal;previousPlayer=player;
    }
    if(!signals.length)continue;
    historyByPlayer[id]=signals;
    const current={...signals[signals.length-1],ownership:ownership.get(id)||null};
    currentSignals.push(current);
  }
  currentSignals.sort((a,b)=>String(a.state).localeCompare(String(b.state))||String(a.player_name).localeCompare(String(b.player_name)));
  const byState={},byMomentum={};for(const s of currentSignals){byState[s.state]=(byState[s.state]||0)+1;byMomentum[s.momentum]=(byMomentum[s.momentum]||0)+1}
  const data={available:true,signal_version:PLAYER_SIGNAL_VERSION,season,through_week:completedWeek,generated_at:new Date().toISOString(),source:'Sleeper completed-week stats + Fleeced reporter classifier',prior_season_source:priorSeason?.source||null,summary:{players:currentSignals.length,by_state:byState,by_momentum:byMomentum,transitions:currentSignals.filter(x=>x.changed).length},signals:currentSignals,history_by_player:historyByPlayer};
  memo={key:cacheKey,at:Date.now(),data};return data;
}
export default async req=>{
  try{
    if(req.method!=='GET')return json({error:'method not allowed'},405);
    const data=await buildSignals(),url=new URL(req.url),id=String(url.searchParams.get('player_id')||'');
    if(id){
      const history=data.history_by_player?.[id]||[],current=history.length?{...history[history.length-1],ownership:data.signals.find(x=>String(x.player_id)===id)?.ownership||null}:null;
      return json({available:!!current,signal_version:data.signal_version,season:data.season,through_week:data.through_week,generated_at:data.generated_at,source:data.source,player_id:id,current,history});
    }
    const compact=url.searchParams.get('compact')==='1',
      transitions=compact?Object.values(data.history_by_player||{}).flat().filter(x=>x?.changed).sort((a,b)=>Number(b.week)-Number(a.week)||String(a.player_name).localeCompare(String(b.player_name))):null;
    return json(compact?{available:true,signal_version:data.signal_version,season:data.season,through_week:data.through_week,generated_at:data.generated_at,source:data.source,summary:data.summary,signals:data.signals,transitions}:data);
  }catch(e){return json({available:false,error:String(e?.message||e)},500)}
};
