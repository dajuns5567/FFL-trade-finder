// READ ONLY: Week 5 completion and publishing prerequisites for the actual new-team site.
// Mirrors the production publisher's completion predicate; never generates or writes an article.
import assert from 'node:assert/strict';
import {getStore} from '@netlify/blobs';
const LEAGUE='1316867686394769408',SITE='2e556797-6f35-4037-aa5a-1338724eb71d',API='https://api.sleeper.app/v1';
assert.equal(process.env.FLEECED_NEW_TEAM_SITE_ID,SITE);
const token=process.env.NETLIFY_SANDBOX_DEPLOY_TOKEN;assert(token);
const get=async path=>{const response=await fetch(API+path);assert(response.ok,'Sleeper HTTP '+response.status+' for '+path);return response.json()};
const [state,league,rosters,...weeks]=await Promise.all([
 get('/state/nfl'),get('/league/'+LEAGUE),get('/league/'+LEAGUE+'/rosters'),
 ...Array.from({length:5},(_,i)=>get('/league/'+LEAGUE+'/matchups/'+(i+1)))
]);
const matchupGroups=rows=>{const groups=new Map();for(const m of rows||[]){const key=String(m?.matchup_id??'');if(!key)continue;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m)}return [...groups.values()]};
const week5=weeks[4]||[],groups=matchupGroups(week5);
const complete=!!(week5.length&&groups.every(pair=>pair.length===2&&pair.every(m=>Number.isFinite(Number(m.points))&&m.players_points&&Object.keys(m.players_points).length>0)));
const counters=new Map();
for(const rows of weeks){for(const pair of matchupGroups(rows)){if(pair.length!==2)continue;const [a,b]=pair;for(const x of pair)if(!counters.has(String(x.roster_id)))counters.set(String(x.roster_id),{wins:0,losses:0});if(Number(a.points)>Number(b.points)){counters.get(String(a.roster_id)).wins++;counters.get(String(b.roster_id)).losses++}else if(Number(b.points)>Number(a.points)){counters.get(String(b.roster_id)).wins++;counters.get(String(a.roster_id)).losses++}}}
const applied=complete&&week5.every(m=>{const r=rosters.find(x=>String(x.roster_id)===String(m.roster_id)),c=counters.get(String(m.roster_id));return r&&c&&Number(r.settings?.wins||0)>=c.wins&&Number(r.settings?.losses||0)>=c.losses});
const stats=await get('/stats/nfl/regular/2026/5').catch(()=>({}));
const s=getStore({name:'fleeced-league-hub',siteID:SITE,token,consistency:'strong'});
const index=await s.get('broadcasts/index.json',{type:'json'}),week5Stored=await s.get('broadcasts/2026/week-05.json',{type:'json'});
const output={current_nfl_week:state.week,current_nfl_season:state.season,league_season:league.season,matchup_rows:week5.length,matched_pairs:groups.length,scoring_complete:complete,roster_records_applied:applied,stat_player_rows:Object.keys(stats||{}).length,week5_already_stored:!!week5Stored,indexed_weeks:(Array.isArray(index)?index:[]).filter(r=>Number(r.season)===2026).map(r=>Number(r.week)),production_mutations:0};
console.log('FLEECED WEEK5 LIVE READINESS '+JSON.stringify(output));
if(!complete||!applied)process.exitCode=2;
