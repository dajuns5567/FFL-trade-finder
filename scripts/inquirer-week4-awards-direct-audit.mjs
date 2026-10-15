import assert from 'node:assert/strict';
import livePlayersHandler from '../netlify/functions/league-hub-weekly-live-fast.mjs';
const season=2026,week=4;
const res=await livePlayersHandler(new Request('https://example.invalid/.netlify/functions/league-hub-weekly-live-fast?season='+season+'&week='+week));
assert.equal(res.status,200,'Real Sleeper Players of the Week handler unavailable');
const payload=await res.json();
assert.equal(payload.season,season);
assert.equal(payload.week,week);
const leaders=payload.players_of_week||{};
const sides={offense:new Set(['QB','RB','WR','TE']),defense:new Set(['DL','DE','DT','NT','EDGE','LB','DB','CB','S'])};
for(const side of ['offense','defense']){
 const winner=leaders[side];
 assert(winner?.player_id&&winner?.player_name,'Missing verified '+side+' player');
 assert(sides[side].has(String(winner.position).toUpperCase()),'Wrong position side for '+side);
 assert(Number.isFinite(Number(winner.points)),'Missing points for '+side);
}
const API='https://api.sleeper.app/v1';
const get=async path=>{
 const r=await fetch(API+path,{headers:{accept:'application/json','user-agent':'Fleeced-Week4-Awards-Independent-Audit/1.0'},cache:'no-store'});
 assert.equal(r.status,200,'Independent Sleeper source '+path+' unavailable');return r.json();
};
const [league,players,stats,matchups]=await Promise.all([
 get('/league/1316867686394769408'),
 get('/players/nfl'),
 get('/stats/nfl/regular/2026/4'),
 get('/league/1316867686394769408/matchups/4')
]);
const scoredIds=new Set((matchups||[]).flatMap(m=>Object.entries(m.players_points||{}).filter(([,p])=>Number.isFinite(Number(p))&&Number(p)!==0).map(([id])=>String(id))));
const missingStatIds=[...scoredIds].filter(id=>!(id in (stats||{})));
console.log('WEEK4_MATCHUP_TO_RAW_STATS_COVERAGE',JSON.stringify({nonzeroMatchupScorers:scoredIds.size,missingRawStats:missingStatIds.length,missingIds:missingStatIds.slice(0,30)}));
const settings=league.scoring_settings||{};
function independentScore(row){
 let result=0,any=false;
 for(const [stat,weight] of Object.entries(settings)){
  const raw=row?.[stat]??(stat.startsWith('idp_')?row?.[stat.slice(4)]:undefined);
  if(raw!==undefined&&raw!==null&&Number.isFinite(Number(raw))&&Number.isFinite(Number(weight))){result+=Number(raw)*Number(weight);any=true}
 }
 return any?Math.round(result*100)/100:null;
}
const independent={offense:null,defense:null};
for(const [id,raw] of Object.entries(stats||{})){
 const row=raw?.stats&&typeof raw.stats==='object'?raw.stats:raw;
 const position=String(players?.[id]?.position||'').toUpperCase();
 const side=sides.offense.has(position)?'offense':sides.defense.has(position)?'defense':null;
 if(!side)continue;
 const points=independentScore(row);
 if(points==null)continue;
 if(!independent[side]||points>independent[side].points||(points===independent[side].points&&id<independent[side].id))independent[side]={id,points,position};
}
for(const side of ['offense','defense']){
 assert.equal(leaders[side].player_id,independent[side]?.id,'League-scored '+side+' winner differs from independent raw Sleeper calculation');
 assert.equal(leaders[side].points,independent[side]?.points,'League-scored '+side+' points differ from independent scoring');
}
assert(Object.keys(settings).some(k=>k.startsWith('idp_')||/tackle|sack|interception|def_/i.test(k)),'League-scoring settings contain no identifiable IDP weights');
console.log(JSON.stringify({ok:true,season,week,source:'live Sleeper league settings, player metadata, and weekly stats',offense:leaders.offense,defense:leaders.defense,scoringKeys:Object.keys(settings).length},null,2));
