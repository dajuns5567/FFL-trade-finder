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
import {correctWeekNineReaderEdition} from '../netlify/functions/lib/inquirer-week09-editorial-correction.mjs';
import {inquirerMarketCutoff} from '../netlify/functions/lib/inquirer-market-window.mjs';
import {inspectCanonicalArchive} from '../netlify/functions/lib/inquirer-legacy-history.mjs';

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
// The exact canonical league master-value archive, independently maintained
// in GitHub. Never reconstruct historical market values or use today's market
// to describe a past edition.
const VALUE_ROOT='https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/value-history-data/';
async function readGithubJson(relative,fetcher=fetch){
 const res=await fetcher(VALUE_ROOT+relative,{
  headers:{accept:'application/json','user-agent':'Fleeced-GitHub-Newspaper/1.0'},
  cache:'no-store',signal:AbortSignal.timeout(25000)});
 if(!res.ok)throw Error('Verified GitHub value history HTTP '+res.status+' '+relative);
 return res.json();
}
export function selectValueHistoryWindow(index,asOf){
 const cutoff=Date.parse(asOf);
 if(!Number.isFinite(cutoff)||index?.league_id!==LEAGUE_ID||
   !Array.isArray(index?.items))throw Error('Invalid GitHub value archive timeline');
 const available=index.items.filter(r=>Number.isFinite(Date.parse(r.t))&&Date.parse(r.t)<=cutoff&&
   /^value-history\/snapshots\/\d{4}\/\d{2}\/[^/]+\.json$/.test(String(r.path||'')))
   .sort((a,b)=>Date.parse(a.t)-Date.parse(b.t));
 if(!available.length)return null;
 const latest=available.at(-1),target=Date.parse(latest.t)-7*86400000;
 const earlier=available.filter(r=>Date.parse(r.t)<=target);
 // A baseline must actually exist. No fabricated history.
 if(!earlier.length)return null;
 return{latest,baseline:earlier.at(-1),period:'7D'};
}
function verifiedValueSnapshot(snapshot,entry){
 if(snapshot?.league!==LEAGUE_ID||snapshot?.t!==entry.t||
   snapshot?.fingerprint!==entry.fingerprint||!Array.isArray(snapshot?.rows)||
   snapshot.rows.length<100||!Array.isArray(snapshot?.teams)||snapshot.teams.length!==32)
  throw Error('Canonical dynasty value snapshot incomplete or index mismatch');
 // Pre-V101 canonical GitHub snapshots did not embed the later
 // source_manifest field. Their branch, index fingerprint, model contract and
 // full saved player/team records remain authoritative historical evidence.
 // Never rewrite them or pretend modern provenance was present.
 if(!String(snapshot.valuation_contract||'').trim()||
    (snapshot.provenance&&snapshot.provenance.canonical_parity!=='exact'))
  throw Error('Archived dynasty market model contract is missing or invalid');
 const ids=new Set();
 for(const row of snapshot.rows){
  if(!row.id||ids.has(String(row.id))||!Number.isFinite(Number(row.value)))
   throw Error('Invalid or duplicate consensus-anchored player value');
  ids.add(String(row.id));
 }
 return snapshot;
}
export function buildArchivedMarketContext({latest,baseline,players={},period='7D'}={}){
 if(!latest||!baseline||latest.valuation_contract!==baseline.valuation_contract||
   latest.valuation_model!==baseline.valuation_model)
  throw Error('Noncomparable dynasty valuation model eras; market context held');
 const baseTeams=new Map(baseline.teams.map(x=>[String(x.id),x]));
 const basePlayers=new Map(baseline.rows.map(x=>[String(x.id),x]));
 const currentValues=Object.fromEntries(latest.rows.map(x=>[String(x.id),Number(x.value)]));
 const teams=latest.teams.map(row=>{
  const old=baseTeams.get(String(row.id));
  if(!old||!Number.isFinite(Number(old.value)))throw Error('Team baseline missing for '+row.id);
  const delta=Math.round(Number(row.value)-Number(old.value));
  return{team_id:String(row.id),value:Math.round(Number(row.value)),
   baseline_value:Math.round(Number(old.value)),delta,
   pct:Number(old.value)?100*delta/Number(old.value):null,
   player_count:Number(row.player_count)||0,
   baseline_t:baseline.t,latest_t:latest.t,period};
 });
 const player_deltas=latest.rows.flatMap(row=>{
  const old=basePlayers.get(String(row.id));
  if(!old||!Number.isFinite(Number(old.value)))return[];
  const delta=Math.round(Number(row.value)-Number(old.value));
  return delta?[{player_id:String(row.id),delta,value:Math.round(Number(row.value)),
   baseline_value:Math.round(Number(old.value)),position:String(row.pos||''),
   pct:Number(old.value)?delta/Number(old.value)*100:null,
   baseline_t:baseline.t,latest_t:latest.t,period}]:[];
 });
 return{teams,player_deltas,playerValues:currentValues,baseline:baseline.t,
  latest:latest.t,period,source:'github-canonical-value-history',valuation_model:latest.valuation_model};
}
async function archivedMarketForWeek(season,week,fetcher=fetch){
 const url='https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates='+season+
  '&seasontype=2&week='+week;
 const schedule=await req(url,fetcher);
 const dates=(schedule.events||[]).map(event=>event.date).filter(Boolean);
 if(!dates.length)throw Error('Historical NFL schedule dates not verified for Week '+week);
 const asOf=inquirerMarketCutoff({game_starts:dates});
 const index=await readGithubJson('value-history/index.json',fetcher);
 const window=selectValueHistoryWindow(index,asOf);
 if(!window)throw Error('No authentic seven-day GitHub valuation history before Week '+week+' cutoff');
 // A valuation model change may split the seven-day window. Walk backward
 // by reference rather than comparing different consensus scales.
 const latest=verifiedValueSnapshot(
  await readGithubJson(window.latest.path,fetcher),window.latest);
 const matching=index.items.filter(row=>Date.parse(row.t)<=Date.parse(window.latest.t)-7*86400000&&
  Date.parse(row.t)<=Date.parse(asOf)).sort((a,b)=>Date.parse(b.t)-Date.parse(a.t));
 let baseline=null;
 for(const row of matching.slice(0,20)){
  const candidate=verifiedValueSnapshot(await readGithubJson(row.path,fetcher),row);
  if(candidate.valuation_contract===latest.valuation_contract&&
     candidate.valuation_model===latest.valuation_model){baseline=candidate;break}
 }
 if(!baseline)throw Error('No comparable dynasty-model historical baseline; cannot invent a seven-day market movement');
 const market=buildArchivedMarketContext({latest,baseline});
 console.info('github-inquirer-dynasty-market',JSON.stringify({week,cutoff:asOf,
  baseline:baseline.t,latest:latest.t,players:latest.rows.length,teams:latest.teams.length,
  valuation_model:latest.valuation_model}));
 return market;
}
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
// Use the same eligibility rules as the existing League Hub.
function eligibleStarterSlot(slot,position){
 const a=String(slot||'').toUpperCase(),p=String(position||'').toUpperCase();
 if(!a||!p)return false;
 if(a===p)return true;
 if(a==='FLEX')return ['RB','WR','TE'].includes(p);
 if(a==='REC_FLEX')return ['WR','TE'].includes(p);
 if(a==='WRRB_FLEX')return ['WR','RB'].includes(p);
 if(a==='SUPER_FLEX'||a==='OP')return ['QB','RB','WR','TE'].includes(p);
 if(a==='DL')return ['DL','DE','DT'].includes(p);
 if(a==='DB')return ['DB','CB','S'].includes(p);
 if(a==='IDP_FLEX'||a==='IDP')return ['DL','DE','DT','NT','EDGE','LB','ILB','OLB','DB','CB','S','FS','SS'].includes(p);
 return false;
}
function eligibleBenchMiss(starters,bench){
 let best=null;
 for(const a of starters||[])for(const b of bench||[]){
  if(!eligibleStarterSlot(a.lineup_slot,b.position))continue;
  const gap=Number(b.points)-Number(a.points);
  if(!Number.isFinite(gap)||gap<=0)continue;
  if(!best||gap>best.gap)best={slot:String(a.lineup_slot),gap,starter:a,reserve:b};
 }
 return best;
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
export function buildSourceTeams({league,week,matchups,history=[],nextMatchups=[],rosters,users,players,previousEdition,transactions=[],market=null}){
 if(!completeMatchups(matchups)||!Array.isArray(rosters)||rosters.length!==32||!Array.isArray(users)||users.length<1)
  throw Error('Unverified 32-team Sleeper matchup inputs');
 const rosterById=new Map(rosters.map(r=>[String(r.roster_id),r])),byUser=new Map(users.map(u=>[String(u.user_id),u]));
 if(rosterById.size!==32)throw Error('Duplicate Sleeper rosters');
 const byId=new Map(matchups.map(m=>[String(m.roster_id),m])),opp=opponentMap(matchups),next=opponentMap(nextMatchups);
 const prevTeams=new Map((previousEdition?.teams||[]).map(t=>[String(t.roster_id),t]));
 const context=leagueContext(history.length?history:[[week,matchups]],matchups);
 const marketByTeam=new Map((market?.teams||[]).map(x=>[String(x.team_id),x]));
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
 // The newsroom needs actual divisional competitors and records, not a
 // stock "division race" placeholder repeated across nine articles.
 const divisionFor=id=>{
  const r=rosterById.get(String(id)),div=r?.settings?.division;
  if(div==null)return null;
  const rows=[...rosterById.values()].filter(x=>String(x?.settings?.division)===String(div)).map(x=>{
   const rid=String(x.roster_id),rec=context[rid]?.record||{},games=context[rid]?.recent_games||[];
   return{roster_id:rid,team_name:identities.get(rid)?.team_name,
    wins:Number(rec.wins)||0,losses:Number(rec.losses)||0,ties:Number(rec.ties)||0,
    points_for:games.reduce((n,g)=>n+Number(g.points||0),0)};
  }).sort((a,b)=>b.wins-a.wins||a.losses-b.losses||b.ties-a.ties||b.points_for-a.points_for||Number(a.roster_id)-Number(b.roster_id));
  const pos=rows.findIndex(x=>x.roster_id===String(id)),me=rows[pos],best=rows[0];
  if(!me||!best)return null;
  const short=x=>({roster_id:x.roster_id,team_name:x.team_name,
   record:{wins:x.wins,losses:x.losses,ties:x.ties}});
  return{division_name:String(league?.metadata?.['division_'+div]||'Division '+div),
   division_rank:pos+1,division_size:rows.length,
   record:{wins:me.wins,losses:me.losses,ties:me.ties},
   leaders:rows.filter(x=>x.wins===best.wins&&x.losses===best.losses&&x.ties===best.ties).map(short),
   same_record_teams:rows.filter(x=>x.roster_id!==me.roster_id&&x.wins===me.wins&&x.losses===me.losses&&x.ties===me.ties).map(short),
   ahead_teams:rows.slice(0,pos).map(short),behind_teams:rows.slice(pos+1).map(short),
   snapshot_through_week:week};
 };
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
   division:r.settings?.division??null,division_name:divisionFor(id)?.division_name||null,
   conference:String(divisionFor(id)?.division_name||'').toUpperCase().startsWith('AFC')?'AFC':
    String(divisionFor(id)?.division_name||'').toUpperCase().startsWith('NFC')?'NFC':'',
   opponent_roster_id:opponentId,opponent_name:other.team_name,
   next_opponent_roster_id:nextId||null,next_opponent_name:nextTeam?.team_name||null,
   points:Number(m.points),opponent_points:Number(opponent.points),won:Number(m.points)>Number(opponent.points),
   projected:0,projection_coverage:0,opponent_projected:null,
   starter_count:starters.length,starter_details:details.sort(byPoints),roster_player_ids:rosterPlayers,
   best_bench:bench.sort(byPoints)[0]||null,worst_starter:details.slice().sort((a,b)=>a.points-b.points)[0]||null,
   best_lineup_miss:eligibleBenchMiss(details,bench),
   transactions:transactions.filter(tx=>[...(tx.roster_ids||[]).map(String),
      ...Object.values(tx.adds||{}).map(String),...Object.values(tx.drops||{}).map(String)].includes(id))
    .map(tx=>({id:String(tx.transaction_id||''),type:String(tx.type||'transaction'),
      status:String(tx.status||''),created:Number(tx.status_updated||tx.created)||null,
      adds:Object.keys(tx.adds||{}).filter(pid=>String(tx.adds[pid])===id),
      drops:Object.keys(tx.drops||{}).filter(pid=>String(tx.drops[pid])===id)})),
   trade_acquisitions:[],trade_history:[],
   recent_trade_count:0,current_week_trade_count:0,
   previous_fan_sentiment:original?.inquirer_article?.fan_sentiment||null,
   value_history_player_movers:{
    risers:(market?.player_deltas||[]).filter(x=>x.delta>0&&rosterPlayers.includes(x.player_id))
     .sort((a,b)=>b.delta-a.delta).map(x=>({...x,player_name:pname(x.player_id)})),
    fallers:(market?.player_deltas||[]).filter(x=>x.delta<0&&rosterPlayers.includes(x.player_id))
     .sort((a,b)=>a.delta-b.delta).map(x=>({...x,player_name:pname(x.player_id)}))
   },value_history_week:marketByTeam.get(id)||null,
   next_week_availability:null,league_context:context[id],opponent_context:context[opponentId],
   upcoming_opponents:nextId?[{week:week+1,roster_id:nextId,team_name:nextTeam?.team_name,context:context[nextId]}]:[],
   division_context:divisionFor(id),next_opponent_context:context[nextId]||null,
   next_opponent_division_context:nextId?divisionFor(nextId):null,
   next_divisional:nextId&&String(rosterById.get(nextId)?.settings?.division)===String(r.settings?.division),
   division_results:[...rosterById.values()].filter(x=>String(x.settings?.division)===String(r.settings?.division)&&String(x.roster_id)!==id)
    .map(x=>({roster_id:String(x.roster_id),team_name:identities.get(String(x.roster_id))?.team_name,
     record:context[String(x.roster_id)]?.record||null})),playoff_context:null,
   manager_career:null
  };
 });
}
// Repetition tolerance never authorizes publishing explanatory engine copy as
// a newspaper article. Check only unmistakable meta-language, not normal
// sports analysis or harmless editorial variation.
export function inspectInquirerNewspaperVoice(edition){
 const offenders=[];
 const banned=/\b(?:not a result between NFL franchises|not the NFL standings|not interchangeable NFL.team prose|a comparison of league lineup totals, not a head.to.head matchup|this is a manager .*? lineup decision, not a mystery about the final|the fantasy managers, starters and specific lineup decisions explain)\b/i;
 const check=(text,where)=>{if(banned.test(String(text||'')))offenders.push({id:'newspaper-meta-prose',where})};
 for(const t of edition?.teams||[])for(const section of t.inquirer_article?.sections||[])
  for(const p of section.paragraphs||[])check(p,'team '+String(t.roster_id)+' / '+section.kind);
 for(const sec of edition?.league_overview?.sections||[]){
  for(const p of sec.paragraphs||[])check(p,'recap '+String(sec.heading||''));
  for(const block of sec.blocks||[])for(const p of block.paragraphs||[])
   check(p,'recap '+String(block.kind||''));
 }
 return offenders;
}
export function verifyEditorialEdition(edition,previous,historical=[]){
 const audit=inspectEditionBeforePublication(edition),quality=evaluateInquirerEditionQuality(edition,previous);
 const priorIssueCount=quality.issues.length;
 for(const old of historical)for(const issue of inspectPreviousWeekEditorialReuse(edition,old))
  quality.issues.push({...issue,source_week:Number(old.week)});
 if(quality.issues.length>priorIssueCount)quality.ok=false;
 const independent=auditIndependentInquirerCopy([edition],{revision:FORWARD_EDITORIAL_REVISION,mode:'publication'});
 const voiceIssues=inspectInquirerNewspaperVoice(edition);
 const admission=deterministicInquirerAdmission(edition,{quality,audit,previousEdition:previous});
 // The same canonical archive contract used by the public League Hub reader
 // must pass BEFORE any edition is committed to GitHub.
 const canonical=inspectCanonicalArchive(edition,edition?.season,edition?.week);
 return{ok:quality.ok&&audit.ok&&independent.ok&&admission.approved&&canonical.ok&&!voiceIssues.length,
  audit,quality,independent,admission,canonical,voiceIssues};
}
// Keep the existing >=25-word independent value-desk audit unchanged.
// Only add genuinely measured facts to a clipped deterministic desk.
export function completeVerifiedMarketDesk(edition){
 let amended=0;
 for(const t of edition.teams||[]){
  const section=t.inquirer_article?.sections?.find(x=>x.kind==='value');
  if(!section)continue;
  const wordCount=()=>String((section.paragraphs||[]).join(' ')).trim().split(/\s+/).filter(Boolean).length;
  if(wordCount()>=25)continue;
  const m=t.value_history_week;
  if(!m||m.value==null||m.baseline_value==null||m.delta==null||
     ![m.value,m.baseline_value,m.delta].every(x=>Number.isFinite(Number(x))))
   continue;
  const change=Number(m.delta),current=Math.round(Number(m.value)),base=Math.round(Number(m.baseline_value));
  const movers=[...(t.value_history_player_movers?.risers||[]),
   ...(t.value_history_player_movers?.fallers||[])]
   .filter(x=>Number.isFinite(Number(x.delta))&&x.player_name)
   .sort((a,b)=>Math.abs(Number(b.delta))-Math.abs(Number(a.delta)));
  const leader=movers[0],name=String(t.team_name),opponent=String(t.opponent_name||'the opponent'),
   fmt=n=>Math.abs(Math.round(n)).toLocaleString('en-US');
  const direction=change>0?'higher':change<0?'lower':'unchanged';
  const supporting=leader?
   name+' had '+leader.player_name+' move '+(leader.delta>0?'up':'down')+
    ' '+fmt(leader.delta)+' points in the same recorded player-value window.':
   name+' has no separately verified individual player mover to attribute to this recorded team-value comparison.';
  section.paragraphs.push(name+' entered the measured window at '+fmt(base)+
   ' dynasty points and finished at '+fmt(current)+', '+direction+
   (change?' by '+fmt(change):'')+'. '+supporting+
   ' Those recorded value figures are separate from the '+Number(t.points).toFixed(1)+
   '-point fantasy result against '+opponent+'.');
  amended++;
  t.inquirer_article.paragraphs=t.inquirer_article.sections.flatMap(x=>x.paragraphs||[]);
 }
 return amended;
}
export function selectEditorialEdition({rawInquirer,rawOverview,season,week,previous,historical=[]}){
 const classification=inquirerWeekClassification(week,season);
 let best=null,passing=null;
 const selectedSalts=process.env.FLEECED_INQUIRER_DIAGNOSE_SALT?
  [Number(process.env.FLEECED_INQUIRER_DIAGNOSE_SALT)]:[5,0,1,2,3,4,6,7,8,9,10,11,12,13,14,15];
 for(const salt of selectedSalts){
  const drafted=applyInquirerEditorialV31({season,week,rawInquirer,rawOverview,
   previousEdition:previous,previousEditions:historical,weekClassification:classification,variationSalt:salt});
  const edition={available:true,published_locked:true,season,week,
   week_classification:classification,broadcast_version:17,inquirer_version:FORWARD_INQUIRER_VERSION,
   editorial_revision:FORWARD_EDITORIAL_REVISION,
   editorial_generation:{engine:'v31-forward',variation_salt:salt,previous_week:week-1,
     quality_metrics:{}},
   teams:drafted.inquirer.teams,reporters:drafted.inquirer.reporters,
   league_overview:drafted.leagueOverview};
  const completedMarketDesks=completeVerifiedMarketDesk(edition);
  const verdict=verifyEditorialEdition(edition,previous,historical);
  edition.editorial_generation.quality_metrics=verdict.quality.metrics||{};
  const score=(verdict.quality.issues?.length||0)*4+(verdict.audit.issues?.length||0)+(verdict.independent.issues?.length||0)*8;
  console.info('github-inquirer-editorial-candidate',JSON.stringify({
   season,week,salt,admitted:verdict.ok,quality:verdict.quality.ok,
   audit:verdict.audit.ok,independent:verdict.independent.ok,
   deep_issues:verdict.quality.issues?.length||0,basic_issues:verdict.audit.issues?.length||0,
   independent_issues:verdict.independent.issue_count||0,completed_market_desks:completedMarketDesks
  }));
  if(process.env.FLEECED_INQUIRER_DIAGNOSE_SALT){
   console.info('github-inquirer-copy-issue-details',JSON.stringify({
    season,week,salt,
    deep:(verdict.quality.issues||[]).slice(0,14).map(x=>({
     id:x.id,phrase:String(x.phrase||'').slice(0,140),
     sentence:String(x.sentence||'').slice(0,180),
     examples:x.examples?.slice?.(0,5),teams:x.teams,
     count:x.count,excerpt:String(x.excerpt||'').slice(0,180)})),
    basic:(verdict.audit.issues||[]).slice(0,5)
   }));
  }
  if(!best||score<best.score)best={edition,verdict,score};
  if(verdict.ok){
   passing={edition,verdict,score};
   if(!verdict.quality.metrics?.minor_repetition_warning)break;
  }
 }
 return passing||best;
}
function statusFor(edition,verdict){
 const issues=[...(verdict?.quality?.issues||[]),...(verdict?.audit?.issues||[]),...(verdict?.independent?.issues||[]),
  ...(verdict?.canonical?.issues||[]).map(message=>({id:'canonical-reader-contract',message})),
  ...(verdict?.voiceIssues||[])];
 return{season:Number(edition?.season),week:Number(edition?.week),editorial_revision:FORWARD_EDITORIAL_REVISION,
  state:verdict?.ok?'completed':'editorial-hold',published:!!verdict?.ok,
  issue_count:issues.length,
  issue_counts:Object.fromEntries([...new Set(issues.map(x=>String(x?.id||x?.code||'unknown')))]
   .map(code=>[code,issues.filter(x=>String(x?.id||x?.code||'unknown')===code).length])),
  issue_codes:issues.slice(0,24).map(x=>String(x?.id||x?.code||'unknown'))};
}
export async function verifyForwardPublicationLedger(index,archiveRoot){
 if(index?.schema_version!==1||!Array.isArray(index.reports))
  throw Error('Invalid forward publication index');
 const seen=new Set();
 for(const row of index.reports){
  const week=Number(row.week);
  const expected='forward/2026/week-'+pad(week)+'.json';
  if(Number(row.season)!==2026||!Number.isInteger(week)||week<10||week>17||
     seen.has(week)||row.path!==expected||Number(row.team_count)!==32||
     !/^[a-f0-9]{64}$/.test(String(row.sha256||'')))
   throw Error('Invalid forward publication ledger entry for Week '+week);
  seen.add(week);
  let raw;
  try{raw=await fs.readFile(path.join(archiveRoot,expected))}
  catch(error){if(error.code==='ENOENT')throw Error('Forward published Week '+week+' missing despite index');throw error}
  if(digest(raw)!==row.sha256)
   throw Error('Forward published Week '+week+' failed SHA-256 integrity check');
  let edition;
  try{edition=JSON.parse(raw.toString('utf8'))}
  catch{throw Error('Forward published Week '+week+' is not valid JSON')}
  if(Number(edition.season)!==2026||Number(edition.week)!==week||
     edition.available!==true||edition.published_locked!==true||
     !Array.isArray(edition.teams)||edition.teams.length!==32||
     new Set(edition.teams.map(t=>String(t.roster_id))).size!==32||
     !edition.league_overview?.headline)
   throw Error('Forward published Week '+week+' fails edition contract');
 }
 const weeks=[...seen].sort((a,b)=>a-b);
 if(weeks.some((week,i)=>week!==i+10))
  throw Error('Forward publication index has missing or out-of-order weeks');
 return weeks.length;
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
 // A ledger entry does not prove a newspaper exists. Verify every published
 // forward issue before calculating the next week, or an orphaned index could
 // silently skip an issue forever.
 await verifyForwardPublicationLedger(index,archiveRoot);
 const recorded=new Set(index.reports.map(x=>Number(x.week)));
 let week=10;while(recorded.has(week))week++;
 if(week>finalWeek)return{state:'up-to-date',season,through_week:week-1};
 const previous=await read('2026/week-'+pad(week-1)+'.json').catch(async error=>{
  if(week>10&&error.code==='ENOENT')return read('forward/2026/week-'+pad(week-1)+'.json');
  throw error;
 });
 if(previous.available!==true||previous.published_locked!==true||Number(previous.week)!==week-1)
  throw Error('Previous immutable GitHub edition not verified for Week '+week);
 const previousEditorial=Number(previous.week)===9?correctWeekNineReaderEdition(previous):previous;
 console.info('github-inquirer-source',{season,week,completed_state_week:current,archive:'SHA-256 protected'});
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
 console.info('github-inquirer-finalized-matchups',{season,week,teams:matchups.length,stat_weeks:Object.keys(statHistory).length});
 const market=await archivedMarketForWeek(season,week,fetcher);
 const teams=buildSourceTeams({league,week,matchups,rosters,users,players,previousEdition:previousEditorial,
  history,nextMatchups,transactions,market});
 const rawInquirer=buildInquirerWeek({season,week,teams,players,weeklyStats:statHistory[week],
  weeklyStatHistory:statHistory,historicalSeasonStats:{},historicalSeasonYear:season-1,
  scoringSettings:league.scoring_settings||{},scoreFn:score,weekClassification:inquirerWeekClassification(week,season),playerValues:market.playerValues});
 const rawOverview=buildLeagueOverview({season,week,teams:rawInquirer.teams,players,
  transactions,canonicalTrades:canonicalCompletedTrades(transactions,teams,season,week),
  weekClassification:inquirerWeekClassification(week,season),
  valueHistoryMeta:{source:market.source,baseline:market.baseline,latest:market.latest,period:market.period}});
 const chosen=selectEditorialEdition({rawInquirer,rawOverview,season,week,previous:previousEditorial,historical});
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
