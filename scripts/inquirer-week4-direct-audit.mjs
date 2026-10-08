import assert from 'node:assert/strict';
import fs from 'node:fs';
import week3Loader from '../netlify/functions/inquirer-week3-2026-preload.mjs';
const week3=week3Loader();
import {
  buildInquirerWeek,
  buildLeagueOverview,
  inquirerWeekClassification,
  publicReporters
} from '../netlify/functions/inquirer-reporters.mjs';
import {fetchBestSeason} from '../netlify/functions/history-fetch.mjs';
import {
  applyInquirerEditorialV31,
  evaluateInquirerEditionQuality,
  FORWARD_INQUIRER_VERSION,
  FORWARD_EDITORIAL_REVISION
} from '../netlify/functions/inquirer-editorial-v31.mjs';

const LEAGUE='1316867686394769408';
const API='https://api.sleeper.app/v1';
const SEASON=2026;
const WEEK=4;
const clone=x=>structuredClone(x);

async function getJson(url, fallback){
  try{
    const r=await fetch(url,{headers:{accept:'application/json','user-agent':'Fleeced-Inquirer-Week4-Direct-Audit/1.0'},cache:'no-store'});
    if(!r.ok)throw new Error(`${r.status} ${url}`);
    return await r.json();
  }catch(e){
    if(arguments.length>1)return fallback;
    throw e;
  }
}

function groups(rows){
  const out=new Map();
  for(const m of rows||[]){
    const k=String(m?.matchup_id??'');
    if(!k)continue;
    if(!out.has(k))out.set(k,[]);
    out.get(k).push(m);
  }
  return out;
}
function opponentMap(rows){
  const out={};
  for(const pair of groups(rows).values())if(pair.length===2){
    out[String(pair[0].roster_id)]=String(pair[1].roster_id);
    out[String(pair[1].roster_id)]=String(pair[0].roster_id);
  }
  return out;
}
function records(weeks){
  const out={};
  for(const rows of weeks){
    for(const pair of groups(rows).values()){
      if(pair.length!==2)continue;
      const [a,b]=pair,ap=Number(a.points)||0,bp=Number(b.points)||0;
      for(const [m,p,op] of [[a,ap,bp],[b,bp,ap]]){
        const id=String(m.roster_id);
        const r=out[id]??={wins:0,losses:0,ties:0,points_for:0};
        r.points_for+=p;
        if(p>op)r.wins++;
        else if(p<op)r.losses++;
        else r.ties++;
        out[id]=r;
      }
    }
  }
  return out;
}
function rankMap(record){
  const rows=Object.entries(record).sort((a,b)=>
    b[1].wins-a[1].wins||a[1].losses-b[1].losses||b[1].points_for-a[1].points_for
  );
  return new Map(rows.map(([id],i)=>[id,i+1]));
}
function txByRoster(rows){
  const out={};
  for(const tx of rows||[]){
    const touched=new Set([...(tx?.roster_ids||[]).map(String),...Object.values(tx?.adds||{}).map(String),...Object.values(tx?.drops||{}).map(String)]);
    for(const rid of touched){
      out[rid]??=[];
      out[rid].push({
        id:String(tx?.transaction_id||''),
        type:String(tx?.type||'transaction'),
        status:String(tx?.status||''),
        adds:Object.keys(tx?.adds||{}).filter(p=>String(tx.adds[p])===rid),
        drops:Object.keys(tx?.drops||{}).filter(p=>String(tx.drops[p])===rid),
        created:Number(tx?.status_updated||tx?.created)||null
      });
    }
  }
  return out;
}
function teamName(roster,userById){
  const u=userById.get(String(roster?.owner_id||''));
  return String(u?.metadata?.team_name||u?.display_name||u?.username||`Roster ${roster?.roster_id}`);
}
function managerName(roster,userById){
  const u=userById.get(String(roster?.owner_id||''));
  return String(u?.display_name||u?.username||`Roster ${roster?.roster_id}`);
}
function divisionName(league,roster){
  const d=String(roster?.settings?.division??'').trim();
  return d?String(league?.metadata?.[`division_${d}`]||`Division ${d}`):'';
}
function position(p){return String(p?.position||p?.fantasy_positions?.[0]||'FLEX')}
function starterSlots(league){return(league?.roster_positions||[]).map(String).filter(x=>!['BN','IR','TAXI'].includes(x.toUpperCase()))}
function accepts(slot,pos){
  const s=String(slot||'').toUpperCase(),p=String(pos||'').toUpperCase();
  if(s===p)return true;
  if(s==='FLEX')return['RB','WR','TE'].includes(p);
  if(s==='REC_FLEX')return['WR','TE'].includes(p);
  if(s==='WRRB_FLEX')return['RB','WR'].includes(p);
  if(['SUPER_FLEX','OP'].includes(s))return['QB','RB','WR','TE'].includes(p);
  if(s==='DL')return['DL','DE','DT'].includes(p);
  if(s==='DB')return['DB','CB','S'].includes(p);
  if(['IDP','IDP_FLEX'].includes(s))return['DL','DE','DT','LB','DB','CB','S'].includes(p);
  return false;
}
function playerName(players,id){
  const p=players?.[id]||{};
  return String(p.full_name||`${p.first_name||''} ${p.last_name||''}`.trim()||id);
}
function bestLineupMiss(starters,bench){
  let best=null;
  for(const s of starters)for(const b of bench){
    if(!accepts(s.lineup_slot,b.position))continue;
    const gap=Number(b.points)-Number(s.points);
    if(gap>0&&(!best||gap>best.gap))best={gap,slot:s.lineup_slot,starter:s,reserve:b};
  }
  return best;
}

const [league,rosters,users,players,transactions,w1,w2,w3,w4,w5]=await Promise.all([
  getJson(`${API}/league/${LEAGUE}`),
  getJson(`${API}/league/${LEAGUE}/rosters`),
  getJson(`${API}/league/${LEAGUE}/users`),
  getJson(`${API}/players/nfl`),
  getJson(`${API}/league/${LEAGUE}/transactions/${WEEK}`,[]),
  getJson(`${API}/league/${LEAGUE}/matchups/1`),
  getJson(`${API}/league/${LEAGUE}/matchups/2`),
  getJson(`${API}/league/${LEAGUE}/matchups/3`),
  getJson(`${API}/league/${LEAGUE}/matchups/4`),
  getJson(`${API}/league/${LEAGUE}/matchups/5`,[])
]);

assert.equal(rosters.length,32,'Expected 32 league rosters');
assert.equal(w4.length,32,'Expected 32 Week 4 matchup rows');
assert.ok(w4.every(m=>Number.isFinite(Number(m.points))&&m?.players_points&&Object.keys(m.players_points).length),'Week 4 Sleeper scoring must be complete');

const userById=new Map(users.map(u=>[String(u.user_id),u]));
const rosterById=new Map(rosters.map(r=>[String(r.roster_id),r]));
const week4ByRoster=new Map(w4.map(m=>[String(m.roster_id),m]));
const opp=opponentMap(w4),nextOpp=opponentMap(w5),record=records([w1,w2,w3,w4]),rank=rankMap(record),txMap=txByRoster(transactions),slots=starterSlots(league);

const teams=rosters.map(r=>{
  const rid=String(r.roster_id),m=week4ByRoster.get(rid)||{},oid=opp[rid],opponentRoster=rosterById.get(oid),nid=nextOpp[rid],nextRoster=rosterById.get(nid);
  const starterIds=(m.starters||[]).map(String).filter(id=>id&&id!=='0'),rosterPlayers=(r.players||[]).map(String).filter(id=>id&&id!=='0'),pts=m.players_points||{};
  const starterDetails=starterIds.map((id,i)=>{const p=players?.[id]||{};return{id,name:playerName(players,id),position:position(p),nfl_team:String(p.team||'FA'),lineup_slot:String(slots[i]||position(p)),points:Number(pts[id])||0,projected:null}});
  const bench=rosterPlayers.filter(id=>!starterIds.includes(id)).map(id=>{const p=players?.[id]||{};return{id,name:playerName(players,id),position:position(p),nfl_team:String(p.team||'FA'),points:Number(pts[id])||0,projected:null}});
  const rec=record[rid]||{wins:0,losses:0,ties:0,points_for:0},div=divisionName(league,r),divisionRows=rosters.filter(x=>divisionName(league,x)===div).map(x=>{const q=record[String(x.roster_id)]||{wins:0,losses:0,ties:0,points_for:0};return{id:String(x.roster_id),...q}}).sort((a,b)=>b.wins-a.wins||a.losses-b.losses||b.points_for-a.points_for),divisionRank=divisionRows.findIndex(x=>x.id===rid)+1;
  const opponentPoints=Number(week4ByRoster.get(oid)?.points)||0;
  return{
    roster_id:rid,
    team_name:teamName(r,userById),
    manager_name:managerName(r,userById),
    division:String(r?.settings?.division||''),
    division_name:div,
    roster_player_ids:rosterPlayers,
    starter_ids:starterIds,
    starter_details:starterDetails,
    bench_details:bench,
    best_bench:bench.slice().sort((a,b)=>b.points-a.points)[0]||null,
    worst_starter:starterDetails.slice().sort((a,b)=>a.points-b.points)[0]||null,
    best_lineup_miss:bestLineupMiss(starterDetails,bench),
    transactions:txMap[rid]||[],
    points:Number(m.points)||0,
    opponent_points:opponentPoints,
    won:Number(m.points)>opponentPoints,
    projected:null,
    opponent_roster_id:oid,
    opponent_name:opponentRoster?teamName(opponentRoster,userById):`Roster ${oid}`,
    next_opponent_roster_id:nid||null,
    next_opponent_name:nextRoster?teamName(nextRoster,userById):'',
    division_context:{division_name:div,division_rank:divisionRank,division_size:divisionRows.length,record:{wins:rec.wins,losses:rec.losses,ties:rec.ties}},
    league_context:{snapshot_through_week:WEEK,standings_rank:rank.get(rid)||null,league_size:32,playoff_teams:Number(league?.settings?.playoff_teams)||16,playoff_week_start:14,games_until_playoffs:11,record:{wins:rec.wins,losses:rec.losses,ties:rec.ties},division_name:div,division_rank:divisionRank,division_size:divisionRows.length},
    week_classification:inquirerWeekClassification(WEEK,SEASON)
  };
});

// Sleeper matchup rows already contain the authoritative fantasy point totals.
// Expose those totals through a minimal weekly stat map so the article builder
// can discuss player scoring without inventing unsupported box-score detail.
const weeklyStats={};
for(const m of w4)for(const [id,points] of Object.entries(m?.players_points||{}))weeklyStats[id]={_audit_points:Number(points)};
const scoreFn=(stats,scoring={})=>{
  if(Number.isFinite(Number(stats?._audit_points)))return Number(stats._audit_points);
  if(!stats)return null;
  let total=0,used=false;
  for(const [key,weight] of Object.entries(scoring||{})){
    const raw=stats[key]??(String(key).startsWith('idp_')?stats[String(key).slice(4)]:undefined),v=Number(raw),w=Number(weight);
    if(Number.isFinite(v)&&Number.isFinite(w)){total+=v*w;used=true}
  }
  return used?Number(total.toFixed(2)):null;
};
const historicalSeason=await fetchBestSeason(2025);
assert.ok(historicalSeason?.stats&&Object.keys(historicalSeason.stats).length,'2025 historical player stats must be available for the Week 4 preload');
const classification=inquirerWeekClassification(WEEK,SEASON);
const rawInquirer=buildInquirerWeek({season:SEASON,week:WEEK,teams,players,weeklyStats,weeklyStatHistory:{4:weeklyStats},historicalSeasonStats:historicalSeason.stats,historicalSeasonYear:2025,scoringSettings:league.scoring_settings||{},scoreFn,weekClassification:classification,playerValues:{}});
const rawOverview=buildLeagueOverview({season:SEASON,week:WEEK,teams:rawInquirer.teams,players,transactions,canonicalTrades:[],weekClassification:classification,valueHistoryMeta:{source:'direct-sleeper-week4-read-only-audit'}});

let accepted=null,lastQuality=null;
for(let salt=0;salt<8;salt++){
  const edited=applyInquirerEditorialV31({season:SEASON,week:WEEK,rawInquirer:clone(rawInquirer),rawOverview:clone(rawOverview),previousEdition:week3,weekClassification:classification,variationSalt:salt});
  const candidate={available:true,season:SEASON,week:WEEK,inquirer_version:FORWARD_INQUIRER_VERSION,editorial_revision:FORWARD_EDITORIAL_REVISION,reporters:publicReporters(),teams:edited.inquirer.teams,league_overview:edited.leagueOverview,editorial_generation:{variation_salt:salt,source:'direct-sleeper-read-only-audit'}};
  const q=evaluateInquirerEditionQuality(candidate,week3);lastQuality=q;
  if(q.ok){accepted=candidate;break;}
}
assert.ok(accepted,'Direct Sleeper Week 4 data could not produce an accepted edition within 8 salts: '+JSON.stringify(lastQuality?.issues||[]).slice(0,12000));

const paragraphs=a=>(a?.sections||[]).flatMap(s=>[...(s?.paragraphs||[]),...(s?.blocks||[]).flatMap(b=>b?.paragraphs||[])]).filter(Boolean);
const words=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
const teamStats=accepted.teams.map(t=>({roster_id:String(t.roster_id),team_name:String(t.team_name||''),reporter:String(t?.inquirer_article?.reporter?.name||''),reporter_id:String(t?.inquirer_article?.reporter?.id||''),headline:String(t?.inquirer_article?.headline||''),paragraphs:paragraphs(t.inquirer_article).length,words:words(paragraphs(t.inquirer_article).join(' '))}));
const reporterCounts=Object.fromEntries([...new Set(teamStats.map(x=>x.reporter_id))].sort().map(id=>[id,teamStats.filter(x=>x.reporter_id===id).length]));
const minWords=Math.min(...teamStats.map(x=>x.words)),maxWords=Math.max(...teamStats.map(x=>x.words)),averageWords=Math.round(teamStats.reduce((n,x)=>n+x.words,0)/teamStats.length);
const audit={ok:true,source:'Sleeper API Week 4 matchups/rosters/users/transactions',candidate_version:accepted.inquirer_version,candidate_revision:accepted.editorial_revision,variation_salt:accepted.editorial_generation.variation_salt,quality:lastQuality?.metrics||{},teams:accepted.teams.length,reporter_counts:reporterCounts,words:{min:minWords,max:maxWords,average:averageWords},team_stats:teamStats};
fs.writeFileSync('/tmp/inquirer-week4-direct-candidate.json',JSON.stringify(accepted,null,2)+'\n');
fs.writeFileSync('/tmp/inquirer-week4-direct-audit.json',JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify(audit,null,2));
