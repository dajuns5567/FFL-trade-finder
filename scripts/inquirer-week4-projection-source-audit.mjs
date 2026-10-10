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

const [league,projectionRaw]=await Promise.all([
 fetch('https://api.sleeper.app/v1/league/1316867686394769408').then(r=>r.json()),
 fetch('https://api.sleeper.app/projections/nfl/2026/4?season_type=regular').then(r=>r.json())
]);
const scoring=league.scoring_settings||{};
const rowsById=new Map(projectionRaw.map(r=>[String(r.player_id),r]));
const score=stats=>{if(!stats||typeof stats!=='object')return null;let sum=0,used=0;for(const [key,weight] of Object.entries(scoring)){
 const raw=stats[key]??(key.startsWith('idp_')?stats[key.slice(4)]:undefined);
 if(raw==null||raw==='')continue;
 const v=Number(raw),w=Number(weight);if(Number.isFinite(v)&&Number.isFinite(w)){sum+=v*w;used++;}
}return used?Number(sum.toFixed(2)):null};
const teamRows=week.teams.map(t=>{const starters=(t.starter_details||[]),scored=starters.map(p=>({id:String(p.id),position:p.position,projected:score(rowsById.get(String(p.id))?.stats)})),missing=scored.filter(p=>p.projected==null);
 return {team:t.team_name,roster:t.roster_id,starters:starters.length,coverage:scored.length-missing.length,total:missing.length?null:Number(scored.reduce((n,p)=>n+p.projected,0).toFixed(2)),missing};
});
const allMissing=teamRows.flatMap(t=>t.missing.map(p=>({...p,team:t.team})));
console.log('MISSING_WEEK4_SOURCE_ROWS',JSON.stringify(allMissing.map(p=>{const row=rowsById.get(p.id);return {id:p.id,team:p.team,position:p.position,found:!!row,sourceKeys:Object.keys(row||{}),stats:row?.stats||null,projection:row?.projection||null,pts_ppr:row?.pts_ppr??null,player:row?.player||null}})));
console.log('WEEK4_SCORED_PROJECTIONS',JSON.stringify({scoringSettings:Object.keys(scoring).length,uniqueStarterIds:players.length,totalLineupPositions:teamRows.reduce((n,x)=>n+x.starters,0),fullyCoveredTeams:teamRows.filter(t=>t.total!==null).length,playersWithNoUsableStats:allMissing,teams:teamRows.map(({team,coverage,starters,total})=>({team,coverage,starters,total})),retrievedAsOf:new Date().toISOString()}));

const {gzipSync}=await import('node:zlib');
const {createHash}=await import('node:crypto');
const scores=Object.fromEntries(players.map(id=>[id,score(rowsById.get(id)?.stats)]).filter(([id,v])=>v!==null));
const snapshot={season:2026,week:4,league_id:'1316867686394769408',source:'https://api.sleeper.app/projections/nfl/2026/4?season_type=regular',retrieved_at:new Date().toISOString(),verified_pregame:false,scoring_keys:Object.keys(scoring).length,scoring_sha256:createHash('sha256').update(JSON.stringify(Object.entries(scoring).sort())).digest('hex'),starter_ids:players,points_by_player:scores};
console.log('WEEK4_PROJECTION_SNAPSHOT_BASE64 '+gzipSync(Buffer.from(JSON.stringify(snapshot))).toString('base64'));

const {fallbackProjection}=await import('../netlify/functions/inquirer-projection-fallback.mjs');
const previous=[1,2,3];
const history=[];
const posById=new Map(projectionRaw.map(r=>[String(r.player_id),String(r.player?.position||'')]));
for(const w of previous){
 const response=await fetch(`https://api.sleeper.app/stats/nfl/regular/2026/${w}`);
 if(!response.ok)throw Error('Cannot verify completed prior week '+w);
 const rows=await response.json();
 for(const [id,record] of Object.entries(rows||{})){
  const value=score(record?.stats||record);
  if(value!==null)history.push({player_id:id,position:posById.get(id)||'',points:value,week:w});
 }
}
const backfilled={};
for(const p of allMissing){
 const estimate=fallbackProjection({playerId:p.id,position:p.position,history});
 if(estimate)backfilled[p.id]=estimate;
}
const snapshotBackfill={season:2026,week:4,method:'prior completed weeks 1-3; same-position historical median otherwise',based_on_weeks:[1,2,3],source:'Sleeper completed-week stats',scoring_sha256:snapshot.scoring_sha256,estimates:backfilled};
console.log('WEEK4_MISSING_ESTIMATE_AUDIT',JSON.stringify({missingPlayers:allMissing.length,coveredByEstimate:Object.keys(backfilled).length,estimated:backfilled}));
console.log('WEEK4_BACKFILL_BASE64 '+gzipSync(Buffer.from(JSON.stringify(snapshotBackfill))).toString('base64'));
