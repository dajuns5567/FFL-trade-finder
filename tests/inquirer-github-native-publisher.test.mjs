import test from 'node:test';
import assert from 'node:assert/strict';
import {completeMatchups,buildSourceTeams,selectValueHistoryWindow,buildArchivedMarketContext,completeVerifiedMarketDesk,verifyForwardPublicationLedger,inspectInquirerNewspaperVoice,inspectCompletedStandingsContract,restoreWeeklyPlayoffDesk,inspectMajorRecapArchitecture} from '../scripts/publish-inquirer-github-native.mjs';
import {githubPublishedInquirerIndex,githubPublishedInquirerEdition,githubInquirerArchiveBranch} from '../netlify/functions/lib/inquirer-github-published.mjs';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {teamFix} from '../netlify/functions/lib/inquirer-week09-editorial-correction.mjs';
import {INQUIRER_TEAM_DESKS,INQUIRER_RECAP_BEATS} from '../netlify/functions/inquirer-format-contract.mjs';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const rosters=Array.from({length:32},(_,i)=>({roster_id:i+1,owner_id:'u'+(i+1),
 settings:{wins:i%3,losses:i%2},players:['player_'+(i+1)]}));
const users=rosters.map(r=>({user_id:r.owner_id,display_name:'Manager '+r.roster_id,metadata:{team_name:'Fantasy Team '+r.roster_id}}));
const players=Object.fromEntries(rosters.map(r=>['player_'+r.roster_id,{full_name:'Player '+r.roster_id,position:'RB',team:'NYJ'}]));
const matchup=()=>rosters.map((r,i)=>({roster_id:r.roster_id,matchup_id:Math.floor(i/2)+1,
 points:105+i,players_points:{['player_'+r.roster_id]:105+i},players:['player_'+r.roster_id],starters:['player_'+r.roster_id]}));
test('GitHub publisher only accepts 16 completed paired Sleeper matchups',()=>{
 assert.equal(completeMatchups(matchup()),true);
 const incomplete=matchup();incomplete[0].players_points={};
 assert.equal(completeMatchups(incomplete),false);
 const wrong=matchup();wrong[0].roster_id=2;
 assert.equal(completeMatchups(wrong),false);
 const missing=matchup();missing[0].points=null;
 assert.equal(completeMatchups(missing),false);
});
test('completed Sleeper standings rank winning rosters ahead of winless rosters',()=>{
 const teams=buildSourceTeams({league:{roster_positions:['RB','BN']},week:10,
  matchups:matchup(),history:[[10,matchup()]],nextMatchups:matchup(),rosters,users,players,
  previousEdition:{teams:[]}});
 const byId=new Map(teams.map(t=>[Number(t.roster_id),t]));
 assert.equal(byId.get(32).league_context.standings_rank,1);
 assert.equal(byId.get(1).league_context.standings_rank,32);
 assert.deepEqual(byId.get(32).league_context.record,{wins:1,losses:0,ties:0});
 assert.deepEqual(byId.get(32).league_context.streak,{type:'W',length:1});
 assert.equal(byId.get(32).league_context.points_for,136);
 assert.equal(new Set(teams.map(t=>t.league_context.standings_rank)).size,32);
});
test('GitHub source team data are sourced from named Sleeper fantasy managers',()=>{
 const teams=buildSourceTeams({league:{roster_positions:['RB','BN']},week:10,
  matchups:matchup(),history:[[10,matchup()]],nextMatchups:matchup(),rosters,users,players,
  previousEdition:{teams:[]}});
 assert.equal(teams.length,32);
 assert.equal(teams[0].team_name,'Fantasy Team 1');
 assert.equal(teams[0].opponent_name,'Fantasy Team 2');
 assert.equal(teams[0].opponent_points,106);
 assert.equal(teams[0].starter_details[0].name,'Player 1');
 assert.equal(teams[0].starter_details[0].points,105);
 assert.equal(teams[0].projected,0);
 assert.equal(teams[0].projection_coverage,0);
 assert.equal(teams[0].trade_history.length,0);
 assert.equal(teams[0].best_lineup_miss,null,'No eligible bench candidate in single-starter fixture');
});
const mockFetch=files=>async url=>{
 const rel=url.split('/inquirer-archive/inquirer-archive/')[1];
 const body=files[rel];
 return{ok:body!==undefined,status:body===undefined?404:200,
  arrayBuffer:async()=>Buffer.from(typeof body==='string'?body:JSON.stringify(body))};
};
test('GitHub public index is sequential and does not trust orphaned Week 12',async()=>{
 const fetcher=mockFetch({'forward/index.json':{schema_version:1,reports:[
  {season:2026,week:12,path:'forward/2026/week-12.json',team_count:32,sha256:'a'.repeat(64)}
 ]}});
 await assert.rejects(githubPublishedInquirerIndex(fetcher),/Nonsequential/);
});
test('unpublished new week returns null without defaulting to Week 2',async()=>{
 const fetcher=mockFetch({});
 const index=await githubPublishedInquirerIndex(fetcher);
 assert.deepEqual(index.reports,[]);
 assert.equal(await githubPublishedInquirerEdition(2026,10,fetcher),null);
});
test('tampered Github issue is never visible',async()=>{
 const payload=JSON.stringify({season:2026,week:10,available:true,teams:[]});
 const fetcher=mockFetch({'forward/index.json':{schema_version:1,reports:[
  {season:2026,week:10,path:'forward/2026/week-10.json',team_count:32,
   sha256:createHash('sha256').update('different').digest('hex'),generated_at:'2026-11-20T00:00:00Z'}
 ]},'forward/2026/week-10.json':payload});
 await assert.rejects(githubPublishedInquirerEdition(2026,10,fetcher),/digest mismatch/);
});
test('missing prior edition is not silently replaced by a generated copy',async()=>{
 const fake=mockFetch({'forward/index.json':{schema_version:1,reports:[
  {season:2026,week:10,path:'forward/2026/week-10.json',team_count:32,sha256:'a'.repeat(64)}
 ]}});
 await assert.rejects(githubPublishedInquirerEdition(2026,10,fake),/digest mismatch/);
});

test('public weekly endpoint does not run the stateful old Netlify generation path',async()=>{
 const fs=await import('node:fs');
 const source=fs.readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 const route=source.slice(source.lastIndexOf("if(u.searchParams.get('weekly')==='1')"),source.lastIndexOf("if(u.searchParams.get('reporters')==='1')"));
 assert.match(route,/GitHub Actions owns Inquirer publication/);
 assert.match(route,/broadcastArchive\(\)/);
 assert.match(route,/broadcastStored\(latest.season,latest.week\)/);
 assert.match(route,/preview_editorial/);
});

test('historical dynasty snapshot window never includes future data',()=>{
 const index={league_id:'1316867686394769408',items:[
  {t:'2026-11-01T00:00:00Z',path:'value-history/snapshots/2026/11/a.json'},
  {t:'2026-11-09T00:00:00Z',path:'value-history/snapshots/2026/11/b.json'},
  {t:'2026-11-20T00:00:00Z',path:'value-history/snapshots/2026/11/c.json'}]};
 const pair=selectValueHistoryWindow(index,'2026-11-12T00:00:00Z');
 assert.equal(pair.latest.t,'2026-11-09T00:00:00Z');
 assert.equal(pair.baseline.t,'2026-11-01T00:00:00Z');
 assert.equal(selectValueHistoryWindow(index,'2026-11-01T00:00:00Z'),null);
});
test('real archived master values produce grounded team and player market movement',()=>{
 const make=(t,teamValue,playerValue)=>({t,valuation_contract:'same-canonical',valuation_model:'same-model',
  teams:[{id:'1',value:teamValue,player_count:1}],
  rows:[{id:'p1',value:playerValue,pos:'WR'}]});
 const a=buildArchivedMarketContext({baseline:make('2026-11-01T00:00:00Z',1200,1000),
  latest:make('2026-11-09T00:00:00Z',1300,1100)});
 assert.equal(a.teams[0].delta,100);
 assert.equal(a.player_deltas[0].delta,100);
 assert.equal(a.playerValues.p1,1100);
 const bad=make('2026-11-09T00:00:00Z',1300,1100);bad.valuation_model='other';
 assert.throws(()=>buildArchivedMarketContext({baseline:make('2026-11-01T00:00:00Z',1200,1000),latest:bad}),/Noncomparable/);
});

test('clipped value analysis gets factual detail without changing independent word minimum',()=>{
 const team={team_name:'Fantasy Tigers',opponent_name:'Fantasy Eagles',points:132.3,
  value_history_week:{value:51000,baseline_value:50000,delta:1000},
  value_history_player_movers:{risers:[{player_name:'Confirmed Player',delta:500}],fallers:[]},
  inquirer_article:{sections:[{kind:'value',paragraphs:['A measured movement.']}]}
 };
 const edition={teams:[team]};
 assert.equal(completeVerifiedMarketDesk(edition),1);
 const value=team.inquirer_article.sections[0].paragraphs.join(' ');
 assert.match(value,/50,000/);
 assert.match(value,/51,000/);
 assert.match(value,/Confirmed Player/);
 assert.match(value,/Fantasy Eagles/);
 assert(value.split(/\s+/).length>=25);
 assert.equal(completeVerifiedMarketDesk(edition),0);
 team.value_history_week=null;
 team.inquirer_article.sections[0].paragraphs=['Value unknown.'];
 assert.equal(completeVerifiedMarketDesk(edition),0);
});

test('Sleeper division peers and records replace stock division prose context',()=>{
 const groups=rosters.map((r,i)=>({...r,settings:{...r.settings,division:Math.floor(i/4)+1}}));
 const teams=buildSourceTeams({league:{roster_positions:['RB','BN'],metadata:{division_1:'AFC North'}},
  week:10,matchups:matchup(),history:[[10,matchup()]],nextMatchups:matchup(),
  rosters:groups,users,players,previousEdition:{teams:[]}});
 assert.equal(teams[0].division_name,'AFC North');
 assert.equal(teams[0].conference,'AFC');
 assert.equal(teams[0].division_context.division_size,4);
 assert.equal(teams[0].division_context.ahead_teams.length+teams[0].division_context.behind_teams.length,3);
 assert.equal(teams[0].division_context.snapshot_through_week,10);
 assert(teams[0].next_opponent_division_context);
});

test('forward publication ledger refuses missing, corrupted, and nonconsecutive editions',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'inquirer-ledger-'));
 try{
  const edition={season:2026,week:10,available:true,published_locked:true,
   teams:Array.from({length:32},(_,i)=>({roster_id:i+1})),
   league_overview:{headline:'Verified weekly report'}};
  const raw=JSON.stringify(edition);
  const sha256=createHash('sha256').update(raw).digest('hex');
  const index={schema_version:1,reports:[{season:2026,week:10,
   path:'forward/2026/week-10.json',sha256,team_count:32}]};
  await assert.rejects(verifyForwardPublicationLedger(index,root),/missing despite index/);
  await mkdir(path.join(root,'forward/2026'),{recursive:true});
  await writeFile(path.join(root,index.reports[0].path),'corrupted');
  await assert.rejects(verifyForwardPublicationLedger(index,root),/SHA-256 integrity/);
  await writeFile(path.join(root,index.reports[0].path),raw);
  assert.equal(await verifyForwardPublicationLedger(index,root),1);
  await assert.rejects(verifyForwardPublicationLedger({...index,reports:[...index.reports,index.reports[0]]},root),/Invalid forward publication ledger entry/);
  await assert.rejects(verifyForwardPublicationLedger({...index,reports:[{...index.reports[0],week:11,path:'forward/2026/week-11.json'}]},root),/missing despite index/);
  assert.equal(await verifyForwardPublicationLedger({schema_version:1,reports:[]},root),0);
 }finally{await rm(root,{recursive:true,force:true})}
});

test('only the PR 574 deploy preview reads the isolated publication archive',()=>{
 assert.equal(githubInquirerArchiveBranch({CONTEXT:'production',REVIEW_ID:'574'}),'inquirer-archive');
 assert.equal(githubInquirerArchiveBranch({CONTEXT:'deploy-preview',REVIEW_ID:'573'}),'inquirer-archive');
 assert.equal(githubInquirerArchiveBranch({CONTEXT:'branch-deploy',REVIEW_ID:'574'}),'inquirer-archive');
 assert.equal(githubInquirerArchiveBranch({CONTEXT:'deploy-preview',REVIEW_ID:'574'}),'inquirer-preview-574-r3');
});

test('approved newspaper architecture remains eight team desks and six recap beats',()=>{
 assert.deepEqual(INQUIRER_TEAM_DESKS,['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook']);
 assert.deepEqual(INQUIRER_RECAP_BEATS,['lead','standings','players','decisions','league','outlook']);
});
test('Week 9 attributed reader correction preserves four distinct reporter voices',()=>{
 const base={team_name:'New York Jets',opponent_name:'New England Patriots',
  next_opponent_name:'Jacksonville Jags',manager_name:'kevinfalkenstein',
  points:81.7,opponent_points:79.7,won:true,
  starter_details:[{name:'Tykee Smith',points:25.3}]};
 const reporters=['walter-mercer','tess-delaney','mack-hollis','nora-voss'];
 for(const kind of ['lede','management','cool-throne','sentiment','outlook']){
  const lines=reporters.map(reporter_id=>teamFix({...base,reporter_id},kind));
  assert.equal(new Set(lines).size,4,kind+' must keep four independent reporter constructions');
  for(const line of lines){
   assert.ok(line.includes(base.team_name)||line.includes(base.manager_name),kind+' must attribute the fantasy team or manager');
   assert.match(line,/\b(?:81\.7|79\.7|25\.3|Jacksonville Jags)\b/);
   assert.doesNotMatch(line,/not (?:the )?NFL|not a result between NFL franchises|not interchangeable/i);
  }
 }
});
test('Week 9 corrected newspaper keeps the original six-beat structure and removes explanatory anti-prose',()=>{
 const src=readFileSync(new URL('../netlify/functions/lib/inquirer-week09-editorial-correction.mjs',import.meta.url),'utf8');
 assert.match(src,/blocks\[0\]\.paragraphs=/);
 for(const kind of [0,1,2,3,4,5])assert.match(src,new RegExp('blocks\\['+kind+'\\]\\.paragraphs='));
 assert.doesNotMatch(src,/not a result between NFL franchises|not the NFL standings|not interchangeable NFL-team prose/);
 assert.match(src,/original_archive_unchanged:true/);
 assert.match(src,/hash\(original\)!==ORIGINAL_SHA/);
});

test('forward edition rejects explanatory non-newsroom prose but not ordinary named football copy',()=>{
 const build=paragraph=>({teams:[{roster_id:1,inquirer_article:{sections:[{kind:'lede',paragraphs:[paragraph]}]}}],
  league_overview:{sections:[{heading:'The back page',paragraphs:['The Jets beat New England in a close game.'],
   blocks:[{kind:'lead',paragraphs:['The Chargers beat the Raiders with Arvell Reese leading the defense.']}]}]}});
 assert.equal(inspectInquirerNewspaperVoice(build('The New York Jets beat New England 81.7–79.7.')).length,0);
 assert.equal(inspectInquirerNewspaperVoice(build('This is not a result between NFL franchises.')).length,1);
 assert.equal(inspectInquirerNewspaperVoice(build('The New York Jets faced New England. Not the NFL standings.')).length,1);
});

test('published newsroom can never promote a losing team to the top of the table',()=>{
 const teams=buildSourceTeams({league:{roster_positions:['RB','BN']},week:10,
  matchups:matchup(),history:[[10,matchup()]],nextMatchups:matchup(),rosters,users,players,
  previousEdition:{teams:[]}});
 assert.deepEqual(inspectCompletedStandingsContract({week:1,teams}),[]);
 const swapped=structuredClone(teams);
 swapped[0].league_context.standings_rank=1;
 assert(inspectCompletedStandingsContract({week:1,teams:swapped}).some(x=>x.id==='missing-or-incomplete-standings-rank'));
 const missing=structuredClone(teams);
 missing[0].league_context.standings_rank=null;
 assert(inspectCompletedStandingsContract({week:1,teams:missing}).length>0);
});

test('forward recap retains the five locked newsroom sections and verified playoff race',()=>{
 const teamSource=buildSourceTeams({league:{roster_positions:['RB','BN']},week:10,
  matchups:matchup(),history:[[10,matchup()]],nextMatchups:matchup(),rosters,users,players,
  previousEdition:{teams:[]}});
 const edition={season:2026,week:10,teams:teamSource,
  league_overview:{sections:[
   {heading:'Week 10: League-Wide Reckoning',paragraphs:['Lead story']},
   {heading:'Contender Line',paragraphs:['Contender story']},
   {heading:'Back Page',paragraphs:['Trades and moves']},
   {heading:'Next Week',paragraphs:['Next week preview']}
  ]}};
 assert.equal(inspectMajorRecapArchitecture(edition).length,2);
 assert.equal(restoreWeeklyPlayoffDesk(edition),true);
 assert.deepEqual(inspectMajorRecapArchitecture(edition),[]);
 assert.equal(edition.league_overview.sections.length,5);
 const race=edition.league_overview.sections[1].paragraphs.join(' ');
 assert.match(race,/first place/);
 assert.match(race,/Fourth place/);
 assert.match(race,/Week 14 wildcard round/);
 assert.equal(restoreWeeklyPlayoffDesk(edition),false,'do not double-insert race desk');
});

test('authorized initial production cutover is exact-site and exact-commit; regular weekly editions never deploy Netlify',()=>{
 const config=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
 const release='Release FFL Inquirer GitHub-native reader cutover 2026-11-22';
 assert.ok(config.includes(release),'authorized one-time Inquirer reader release must be permitted');
 assert.match(config,/SITE_ID==='a516be3b-6c65-4f54-a9fb-23c5361bf3d2'/);
 assert.match(config,/e\.CONTEXT==='production'&&e\.BRANCH==='main'/);
 assert.ok(!config.includes('[functions."inquirer-publish-scheduled"]'),
  'ongoing newspaper publication must not schedule a Netlify deployment');
 const workflow=readFileSync(new URL('../.github/workflows/inquirer-github-native-publisher.yml',import.meta.url),'utf8');
 assert.match(workflow,/ref: inquirer-archive/);
 assert.match(workflow,/git push origin HEAD:inquirer-archive/);
 assert.match(workflow,/github\.ref == 'refs\/heads\/main' && \(github\.event_name == 'schedule' \|\| github\.event_name == 'workflow_dispatch'\)/);
});

 test('a recent valuation transition uses genuine shorter same-model observations, never the prior model',async()=>{
 const {selectComparableMarketSnapshots}=await import('../scripts/publish-inquirer-github-native.mjs');
 const league='1316867686394769408';
 const make=(t,model,n)=>({league,t,fingerprint:'f'+n,valuation_model:model,valuation_contract:'contract-'+model,rows:Array.from({length:100},(_,i)=>({id:String(i+1),value:100+i})),teams:Array.from({length:32},(_,i)=>({id:String(i+1),value:1000+i}))});
 const snaps=[make('2026-11-14T00:00:00Z','old',1),make('2026-11-21T03:52:00Z','old',2),make('2026-11-21T04:35:00Z','new',3),make('2026-11-23T20:36:00Z','new',4),make('2026-11-25T00:00:00Z','new',5)];
 const items=snaps.map((s,i)=>({t:s.t,path:'value-history/snapshots/2026/11/'+i+'.json',fingerprint:s.fingerprint,valuation_model:s.valuation_model,valuation_contract:s.valuation_contract}));
 const read=async row=>snaps.find(s=>s.t===row.t);
 const result=await selectComparableMarketSnapshots({league_id:league,items},'2026-11-24T23:00:00Z',read);
 assert.equal(result.latest.t,snaps[3].t);assert.equal(result.baseline.t,snaps[2].t);assert.equal(result.period,'ERA');assert.ok(result.elapsedHours<168);
 const market=buildArchivedMarketContext(result);assert.equal(market.period,'ERA');assert.equal(market.teams.length,32);
 await assert.rejects(()=>selectComparableMarketSnapshots({league_id:league,items:items.filter((_,i)=>i!==2)},'2026-11-24T23:00:00Z',read),/No second comparable/);
 const old=await selectComparableMarketSnapshots({league_id:league,items},'2026-11-21T04:00:00Z',read);
 assert.equal(old.period,'7D');assert.equal(old.baseline.t,snaps[0].t);
 });

 test('source retries recover rate limits and server errors but not permanent access restrictions',async()=>{
 const {fetchInquirerJson}=await import('../scripts/publish-inquirer-github-native.mjs');
 let calls=0;const statuses=[429,503,200];
 const read=async()=>{const status=statuses[calls++];return{status,ok:status===200,json:async()=>({verified:true})}};
 assert.deepEqual(await fetchInquirerJson('https://fixture.invalid/data',read,async()=>{}),{verified:true});assert.equal(calls,3);
 calls=0;await assert.rejects(()=>fetchInquirerJson('https://fixture.invalid/data',async()=>{calls++;return{status:403,ok:false}},async()=>{}),/403/);assert.equal(calls,1);
 });
 test('a due but unavailable week is not a successful publication',()=>{
 const source=readFileSync(new URL('../scripts/publish-inquirer-github-native.mjs',import.meta.url),'utf8');
 assert.match(source,/result\.state==='not-ready'&&Number\.isInteger\(result\.week\)\)process\.exitCode=3/);
 assert.match(source,/published:false,admitted:/);
 });
