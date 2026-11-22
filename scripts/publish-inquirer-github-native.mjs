// GitHub-native Sleeper -> Inquirer publisher. No Netlify API, Blobs, host,
// deploy, SSO, publication secret, or site environment required.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildInquirerWeek,buildLeagueOverview,inquirerWeekClassification} from '../netlify/functions/inquirer-reporters.mjs';
import {applyInquirerEditorialV31,evaluateInquirerEditionQuality,FORWARD_EDITORIAL_REVISION,FORWARD_INQUIRER_VERSION} from '../netlify/functions/inquirer-editorial-v31.mjs';
import {inspectEditionBeforePublication,deterministicInquirerAdmission,inspectPreviousWeekEditorialReuse} from '../netlify/functions/inquirer-publication-guard.mjs';
import {auditIndependentInquirerCopy} from '../netlify/functions/lib/inquirer-independent-copy-audit.mjs';

export const LEAGUE_ID='1316867686394769408';
const API='https://api.sleeper.app/v1';
const digest=raw=>createHash('sha256').update(raw).digest('hex');
const pad=w=>String(w).padStart(2,'0');
const req=async(url,fetcher=fetch)=>{
 const res=await fetcher(url,{headers:{accept:'application/json','user-agent':'Fleeced-GitHub-Newspaper/1.0'},cache:'no-store',signal:AbortSignal.timeout(25000)});
 if(!res.ok)throw Error('Sleeper HTTP '+res.status+' at '+new URL(url).pathname);
 return res.json();
};
export function completeMatchups(rows){
 if(!Array.isArray(rows)||rows.length!==32)return false;
 const groups=new Map(),rosters=new Set();
 for(const m of rows){
  const id=String(m?.roster_id??''),match=String(m?.matchup_id??'');
  if(!id||!match||rosters.has(id)||m?.points==null||
    !Number.isFinite(Number(m.points))||!m.players_points||
    !Object.keys(m.players_points).length)return false;
  rosters.add(id);
  if(!groups.has(match))groups.set(match,[]);
  groups.get(match).push(m);
 }
 return groups.size===16&&[...groups.values()].every(pair=>pair.length===2);
}
function opponentMap(rows){
 const byGame=new Map();
 for(const m of rows||[]){const key=String(m.matchup_id??'');if(!byGame.has(key))byGame.set(key,[]);byGame.get(key).push(m)}
 const result=new Map();
 for(const pair of byGame.values())if(pair.length===2){result.set(String(pair[0].roster_id),String(pair[1].roster_id));result.set(String(pair[1].roster_id),String(pair[0].roster_id))}
 return result;
}
const score=(stats,scoring)=>{
 if(!stats||typeof stats!=='object')return null;
 let n=0,used=false;
 for(const [key,weight] of Object.entries(scoring||{})){
  const raw=stats[key]??(key.startsWith('idp_')?stats[key.slice(4)]:undefined);
  if(raw==null||!Number.isFinite(Number(raw))||!Number.isFinite(Number(weight)))continue;
  n+=Number(raw)*Number(weight);used=true;
 }
 return used?Number(n.toFixed(2)):null;
};
function canonicalCompletedTrades(transactions,teams,season,week){
 const names=new Map(teams.map(t=>[String(t.roster_id),t.team_name]));
 return (transactions||[]).filter(tx=>tx?.type==='trade'&&tx?.status==='complete'&&
  Array.isArray(tx.roster_ids)&&tx.roster_ids.length===2).map(tx=>{
  const rosterIds=tx.roster_ids.map(String);
  return{id:String(tx.transaction_id||''),season,week,created:Number(tx.status_updated||tx.created)||null,
   roster_ids:rosterIds,team_names:Object.fromEntries(rosterIds.map(id=>[id,names.get(id)||'Roster '+id])),
   sides:rosterIds.map(id=>({roster_id:id,
    player_ids:Object.keys(tx.adds||{}).filter(pid=>String(tx.adds[pid])===id),
    picks:(tx.draft_picks||[]).filter(p=>String(p.owner_id||'')===id)
     .map(p=>({season:Number(p.season)||null,round:Number(p.round)||null,roster_id:p.roster_id}))}))};
 });
}
function leagueContext(histories,teams){
 const result={};
 for(const t of teams){
  const id=String(t.roster_id),games=[];
  for(const [w,rows] of histories){
   const m=rows.find(x=>String(x.roster_id)===id),opp=opponentMap(rows).get(id),o=rows.find(x=>String(x.roster_id)===opp);
   if(m&&o&&m.points!=null&&o.points!=null&&Number.isFinite(Number(m.points))&&Number.isFinite(Number(o.points)))
    games.push({week:w,roster_id:id,opponent_roster_id:opp,points:Number(m.points),opponent_points:Number(o.points),won:Number(m.points)>Number(o.points)});
  }
  result[id]={record:{wins:games.filter(x=>x.won).length,losses:games.filter(x=>x.points<x.opponent_points).length,ties:games.filter(x=>x.points===x.opponent_points).length},recent_games:games.slice(-5)};
 }
 return result;
}
export function buildSourceTeams({league,week,matchups,history=[],nextMatchups=[],rosters,users,players,previousEdition,transactions=[]}){
 if(!completeMatchups(matchups)||!Array.isArray(rosters)||rosters.length!==32||!Array.isArray(users)||users.length<1)
  throw Error('Unverified 32-team Sleeper matchup inputs');
 const rosterById=new Map(rosters.map(r=>[String(r.roster_id),r])),byUser=new Map(users.map(u=>[String(u.user_id),u]));
 if(rosterById.size!==32)throw Error('Duplicate Sleeper rosters');
 const byId=new Map(matchups.map(m=>[String(m.roster_id),m])),opp=opponentMap(matchups),next=opponentMap(nextMatchups);
 const prevTeams=new Map((previousEdition?.teams||[]).map(t=>[String(t.roster_id),t]));
 const context=leagueContext(history.length?history:[[week,matchups]],matchups);
 const slots=(league?.roster_positions||[]).filter(x=>x!=='BN'&&x!=='IR'&&x!=='TAXI');
 const pname=id=>String(players[id]?.full_name||[players[id]?.first_name,players[id]?.last_name].filter(Boolean).join(' ')||id);
 const ppos=id=>String(players[id]?.position||'FLEX');
 const identities=new Map();
 for(const m of matchups){
  const r=rosterById.get(String(m.roster_id)),u=byUser.get(String(r?.owner_id));
  if(!r||!u)throw Error('Missing Sleeper roster owner identity for '+m.roster_id);
  identities.set(String(m.roster_id),{team_name:String(u.metadata?.team_name||u.display_name||u.username||'Roster '+m.roster_id).trim(),
   manager_name:String(u.display_name||u.username||'Roster '+m.roster_id)});
 }
 return matchups.map(m=>{
  const id=String(m.roster_id),r=rosterById.get(id),owner=byUser.get(String(r.owner_id)),
   opponentId=opp.get(id),opponent=byId.get(opponentId),nextId=next.get(id),
   starters=(m.starters||[]).filter(x=>x&&x!=='0').map(String),
   rosterPlayers=(m.players?.length?m.players:r.players||[]).filter(x=>x&&x!=='0').map(String);
  if(!opponent||!nextId&&week<17)throw Error('Missing verified opponent for roster '+id);
  const details=starters.map((pid,i)=>({id:pid,name:pname(pid),position:ppos(pid),nfl_team:String(players[pid]?.team||'FA'),
   lineup_slot:slots[i]||ppos(pid),points:Number(m.players_points[pid]??0),projected:null}));
  const bench=rosterPlayers.filter(pid=>!starters.includes(pid)).map(pid=>({id:pid,name:pname(pid),position:ppos(pid),nfl_team:String(players[pid]?.team||'FA'),points:Number(m.players_points[pid]??0),projected:null}));
  const byPoints=(a,b)=>b.points-a.points;
  const original=prevTeams.get(id),identity=identities.get(id),other=identities.get(opponentId),nextTeam=identities.get(nextId);
  return{
   roster_id:id,manager_user_id:String(owner.user_id),manager_name:identity.manager_name,team_name:identity.team_name,
   division:r.settings?.division??null,conference:'',opponent_roster_id:opponentId,opponent_name:other.team_name,
   next_opponent_roster_id:nextId||null,next_opponent_name:nextTeam?.team_name||null,
   points:Number(m.points),opponent_points:Number(opponent.points),won:Number(m.points)>Number(opponent.points),
   projected:0,projection_coverage:0,opponent_projected:null,
   starter_count:starters.length,starter_details:details.sort(byPoints),roster_player_ids:rosterPlayers,
   best_bench:bench.sort(byPoints)[0]||null,worst_starter:details.slice().sort((a,b)=>a.points-b.points)[0]||null,
   best_lineup_miss:null,
   transactions:transactions.filter(tx=>[...(tx.roster_ids||[]).map(String),
      ...Object.values(tx.adds||{}).map(String),...Object.values(tx.drops||{}).map(String)].includes(id))
    .map(tx=>({id:String(tx.transaction_id||''),type:String(tx.type||'transaction'),
      status:String(tx.status||''),created:Number(tx.status_updated||tx.created)||null,
      adds:Object.keys(tx.adds||{}).filter(pid=>String(tx.adds[pid])===id),
      drops:Object.keys(tx.drops||{}).filter(pid=>String(tx.drops[pid])===id)})),
   trade_acquisitions:[],trade_history:[],
   recent_trade_count:0,current_week_trade_count:0,
   previous_fan_sentiment:original?.inquirer_article?.fan_sentiment||null,
   value_history_player_movers:{risers:[],fallers:[]},value_history_week:null,
   next_week_availability:null,league_context:context[id],opponent_context:context[opponentId],
   upcoming_opponents:nextId?[{week:week+1,roster_id:nextId,team_name:nextTeam?.team_name,context:context[nextId]}]:[],
   division_context:null,next_opponent_context:context[nextId]||null,
   next_opponent_division_context:null,division_results:[],playoff_context:null,
   manager_career:null
  };
 });
}
export function verifyEditorialEdition(edition,previous,historical=[]){
 const audit=inspectEditionBeforePublication(edition),quality=evaluateInquirerEditionQuality(edition,previous);
 const priorIssueCount=quality.issues.length;
 for(const old of historical)for(const issue of inspectPreviousWeekEditorialReuse(edition,old))
  quality.issues.push({...issue,source_week:Number(old.week)});
 if(quality.issues.length>priorIssueCount)quality.ok=false;
 const independent=auditIndependentInquirerCopy([edition],{revision:FORWARD_EDITORIAL_REVISION,mode:'publication'});
 const admission=deterministicInquirerAdmission(edition,{quality,audit,previousEdition:previous});
 return{ok:quality.ok&&audit.ok&&independent.ok&&admission.approved,
  audit,quality,independent,admission};
}
export function selectEditorialEdition({rawInquirer,rawOverview,season,week,previous,historical=[]}){
 const classification=inquirerWeekClassification(week,season);
 let best=null,passing=null;
 for(const salt of [5,0,1,2,3,4,6,7,8,9,10,11,12,13,14,15]){
  const drafted=applyInquirerEditorialV31({season,week,rawInquirer,rawOverview,
   previousEdition:previous,previousEditions:historical,weekClassification:classification,variationSalt:salt});
  const edition={available:true,published_locked:true,season,week,
   week_classification:classification,broadcast_version:17,inquirer_version:FORWARD_INQUIRER_VERSION,
   editorial_revision:FORWARD_EDITORIAL_REVISION,
   editorial_generation:{engine:'v31-forward',variation_salt:salt,previous_week:week-1,
     quality_metrics:{}},
   teams:drafted.inquirer.teams,reporters:drafted.inquirer.reporters,
   league_overview:drafted.leagueOverview};
  const verdict=verifyEditorialEdition(edition,previous,historical);
  edition.editorial_generation.quality_metrics=verdict.quality.metrics||{};
  const score=(verdict.quality.issues?.length||0)*4+(verdict.audit.issues?.length||0)+(verdict.independent.issues?.length||0)*8;
  if(!best||score<best.score)best={edition,verdict,score};
  if(verdict.ok){
   passing={edition,verdict,score};
   if(!verdict.quality.metrics?.minor_repetition_warning)break;
  }
 }
 return passing||best;
}
function statusFor(edition,verdict){
 const issues=[...(verdict?.quality?.issues||[]),...(verdict?.audit?.issues||[]),...(verdict?.independent?.issues||[])];
 return{season:Number(edition?.season),week:Number(edition?.week),editorial_revision:FORWARD_EDITORIAL_REVISION,
  state:verdict?.ok?'completed':'editorial-hold',published:!!verdict?.ok,
  issue_count:issues.length,issue_codes:issues.slice(0,24).map(x=>String(x?.id||x?.code||'unknown')).slice(0,24)};
}
export async function runGithubInquirerPublisher({archiveRoot,fetcher=fetch,now=new Date()}={}){
 if(!archiveRoot)throw Error('Required GitHub archive worktree path missing');
 const read=async(file)=>JSON.parse(await fs.readFile(path.join(archiveRoot,file),'utf8'));
 const state=await req(API+'/state/nfl',fetcher),league=await req(API+'/league/'+LEAGUE_ID,fetcher);
 const season=Number(league.season),current=Number(state.week),finalWeek=Math.min(17,current-1);
 if(!Number.isInteger(current)||!Number.isInteger(season)||season<2026||finalWeek<10)
  return{state:'not-ready',season,week:null};
 const previousManifest=await read('manifest.json');
 if(previousManifest?.schema_version!==1||previousManifest?.season!==2026||previousManifest?.entries?.length!==7)
  throw Error('Immutable original GitHub archive is not the expected verified Weeks 3-9 catalog');
 // Verify the ORIGINAL bytes, not a regenerated substitute or modified JSON.
 // Nothing in this workflow may revise the accepted historical originals.
 for(const [i,entry] of previousManifest.entries.entries()){
  const w=i+3,expected='2026/week-'+pad(w)+'.json';
  if(Number(entry.week)!==w||entry.path!==expected||!/^[a-f0-9]{64}$/.test(entry.sha256||''))
   throw Error('Protected original manifest entry is invalid for Week '+w);
  const raw=await fs.readFile(path.join(archiveRoot,expected));
  if(digest(raw)!==entry.sha256)throw Error('Protected original Week '+w+' archive differs from approved SHA-256');
 }
 const indexPath='forward/index.json';
 const index=await read(indexPath).catch(error=>{if(error.code==='ENOENT')return{schema_version:1,reports:[]};throw error});
 if(index.schema_version!==1||!Array.isArray(index.reports))throw Error('Invalid forward publication index');
 const recorded=new Set(index.reports.map(x=>Number(x.week)));
 let week=10;while(recorded.has(week))week++;
 if(week>finalWeek)return{state:'up-to-date',season,through_week:week-1};
 const previous=await read('2026/week-'+pad(week-1)+'.json').catch(async error=>{
  if(week>10&&error.code==='ENOENT')return read('forward/2026/week-'+pad(week-1)+'.json');
  throw error;
 });
 if(previous.available!==true||previous.published_locked!==true||Number(previous.week)!==week-1)
  throw Error('Previous immutable GitHub edition not verified for Week '+week);
 const [matchups,rosters,users,players,nextMatchups,transactions]=await Promise.all([
  req(API+'/league/'+LEAGUE_ID+'/matchups/'+week,fetcher),req(API+'/league/'+LEAGUE_ID+'/rosters',fetcher),
  req(API+'/league/'+LEAGUE_ID+'/users',fetcher),req(API+'/players/nfl',fetcher),
  req(API+'/league/'+LEAGUE_ID+'/matchups/'+(week+1),fetcher).catch(()=>[]),
  req(API+'/league/'+LEAGUE_ID+'/transactions/'+week,fetcher).catch(()=>[])
 ]);
 if(!completeMatchups(matchups))return{state:'not-ready',season,week,reason:'Sleeper scoring incomplete'};
 const history=await Promise.all(Array.from({length:week},(_,i)=>i+1).map(async w=>
  [w,w===week?matchups:await req(API+'/league/'+LEAGUE_ID+'/matchups/'+w,fetcher)]));
 const seen={};for(const [w,rows] of history)if(completeMatchups(rows))for(const m of rows){
  const id=String(m.roster_id);if(!seen[id])seen[id]={wins:0,losses:0};
  const oid=opponentMap(rows).get(id),o=rows.find(x=>String(x.roster_id)===oid);
  if(Number(m.points)>Number(o.points))seen[id].wins++;else if(Number(m.points)<Number(o.points))seen[id].losses++;
 }
 if(matchups.some(m=>{const r=rosters.find(x=>String(x.roster_id)===String(m.roster_id)),rec=seen[String(m.roster_id)];return !r||!rec||
  Number(r.settings?.wins||0)<rec.wins||Number(r.settings?.losses||0)<rec.losses;}))
  return{state:'not-ready',season,week,reason:'Sleeper roster standings not finalized'};
 const statHistory=Object.fromEntries(await Promise.all(Array.from({length:week},(_,i)=>i+1).map(async w=>
  [w,await req(API+'/stats/nfl/regular/'+season+'/'+w,fetcher).catch(()=>({}))])));
 const historical=[];
 for(let w=Math.max(3,week-4);w<=week-2;w++)historical.push(await read(w<=9?'2026/week-'+pad(w)+'.json':'forward/2026/week-'+pad(w)+'.json'));
 const teams=buildSourceTeams({league,week,matchups,rosters,users,players,previousEdition:previous,
  history,nextMatchups,transactions});
 const rawInquirer=buildInquirerWeek({season,week,teams,players,weeklyStats:statHistory[week],
  weeklyStatHistory:statHistory,historicalSeasonStats:{},historicalSeasonYear:season-1,
  scoringSettings:league.scoring_settings||{},scoreFn:score,weekClassification:inquirerWeekClassification(week,season),playerValues:{}});
 const rawOverview=buildLeagueOverview({season,week,teams:rawInquirer.teams,players,
  transactions,canonicalTrades:canonicalCompletedTrades(transactions,teams,season,week),
  weekClassification:inquirerWeekClassification(week,season),
  valueHistoryMeta:{source:'not available from GitHub-native snapshot'}});
 const chosen=selectEditorialEdition({rawInquirer,rawOverview,season,week,previous,historical});
 const {edition,verdict}=chosen;const resultStatus=statusFor(edition,verdict);
 if(!verdict.ok)return{...resultStatus,reason:'Editorial admission held; no published file or index changed'};
 edition.generated_at=now.toISOString();
 edition.editorial_generation.publication_mode='audited-deterministic-v31';
 const contents=JSON.stringify(edition),sha256=digest(contents);
 const rel='forward/2026/week-'+pad(week)+'.json';
 await fs.mkdir(path.dirname(path.join(archiveRoot,rel)),{recursive:true});
 await fs.writeFile(path.join(archiveRoot,rel),contents);
 index.reports.push({season,week,path:rel,sha256,generated_at:edition.generated_at,
  editorial_revision:FORWARD_EDITORIAL_REVISION,team_count:32});
 index.reports.sort((a,b)=>Number(a.season)-Number(b.season)||Number(a.week)-Number(b.week));
 await fs.mkdir(path.dirname(path.join(archiveRoot,indexPath)),{recursive:true});
 await fs.writeFile(path.join(archiveRoot,indexPath),JSON.stringify(index,null,2)+'\n');
 return{...resultStatus,sha256,path:rel,generated_at:edition.generated_at};
}
const isCli=process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]);
if(isCli){
 const root=process.env.INQUIRER_GITHUB_ARCHIVE_ROOT||process.argv[2];
 try{
  const result=await runGithubInquirerPublisher({archiveRoot:root});
  console.log('github-inquirer-publication '+JSON.stringify(result));
  if(result.state==='editorial-hold')process.exitCode=2;
 }catch(error){console.error('github-inquirer-publisher failed:',String(error?.stack||error));process.exitCode=1}
}
