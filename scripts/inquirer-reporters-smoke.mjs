import fs from 'node:fs';
import {REPORTERS,reporterForTeam,realStatLine,buildInquirerWeek,buildLeagueOverview,inquirerWeekClassification,INQUIRER_PLAYOFF_START_WEEK,INQUIRER_FINAL_WEEK} from '../netlify/functions/inquirer-reporters.mjs';
import week1Preload from '../netlify/functions/inquirer-week1-2026-preload.mjs';

const assert=(x,m)=>{if(!x)throw new Error(m)};
assert(REPORTERS.length===4,'Fleeced Inquirer must have exactly four permanent reporters');
assert(REPORTERS.map(r=>r.name).join('|')==='Nick Swindell|Bartholomew Roycington III|Tilly Fleecer|Jefferson Filch','Fleeced Inquirer public reporter names must remain the approved names');
assert(INQUIRER_PLAYOFF_START_WEEK===14&&INQUIRER_FINAL_WEEK===17,'Inquirer season must classify Weeks 14-17 as playoffs and stop at Week 17');
assert(week1Preload?.inquirer_version===26&&Number(week1Preload?.editorial_revision)===6&&Number(week1Preload?.season)===2026&&Number(week1Preload?.week)===1,'Committed Week 1 preload must be the generated 2026 V26 editorial-revision-6 edition');
assert(week1Preload?.published_locked===true,'Committed Week 1 preload must be immutable after publication');
assert(Number(week1Preload?.context_snapshot_through_week)===1,'Committed Week 1 preload must remain scoped to the Week 1 reporting snapshot');
assert(Array.isArray(week1Preload?.teams)&&week1Preload.teams.length===32,'Committed Week 1 preload must contain all 32 team articles');
assert(week1Preload.teams.every(t=>t?.inquirer_article?.headline&&Array.isArray(t?.inquirer_article?.sections)&&t.inquirer_article.sections.length>=8&&t.inquirer_article.sections.length<=9&&Array.isArray(t?.inquirer_article?.paragraphs)&&t.inquirer_article.paragraphs.length>=8),'Every preloaded Week 1 team must preserve the eight core V26 beats, with an optional ninth trade-commentary beat');
const preloadReporterCounts=new Map(REPORTERS.map(r=>[r.name,0]));
for(const t of week1Preload.teams){const n=t?.inquirer_article?.reporter?.name;preloadReporterCounts.set(n,(preloadReporterCounts.get(n)||0)+1)}
for(const r of REPORTERS)assert(preloadReporterCounts.get(r.name)===8,'Week 1 preload must preserve exactly eight team stories for '+r.name);
const preloadTeamById=new Map((week1Preload?.teams||[]).map(t=>[String(t.roster_id),t]));
const preloadHasFrozenNextProjectionMatchup=(week1Preload?.teams||[]).some(t=>{const o=preloadTeamById.get(String(t?.next_opponent_roster_id||'')),tp=t?.next_projected,op=o?.next_projected;return tp!=null&&op!=null&&Number.isFinite(Number(tp))&&Number.isFinite(Number(op))&&Number(tp)!==Number(op)});
const preloadTakes=week1Preload?.league_overview?.hot_takes||[];
assert(week1Preload?.league_overview?.sections?.length===4,'Week 1 preload must include the four-desk Weekly Recap');
assert(preloadTakes.length>=(preloadHasFrozenNextProjectionMatchup?5:4),'Week 1 preload must preserve every evidence-backed prediction Hot Take');
if(preloadHasFrozenNextProjectionMatchup)assert(preloadTakes.some(x=>x?.kind==='upset'),'Week 1 preload with frozen next-week projections must include the projected-underdog upset pick');
else assert(!preloadTakes.some(x=>x?.kind==='upset'),'Week 1 preload must not reconstruct a projected-underdog upset pick without frozen next-week projections');
assert(week1Preload?.week_classification?.label==='Week 1 • Regular Season','Week 1 preload must preserve the canonical Week 1 classification');
assert(week1Preload.teams.every(t=>t?.value_history_week==null),'Week 1 preload must not invent team Value History movement when no valid 7D comparison exists');
assert(inquirerWeekClassification(14,2026,'AFC').label==='Week 14 • AFC Wildcard Round','Week 14 AFC teams must be in the AFC Wildcard Round');
assert(inquirerWeekClassification(14,2026,'NFC').label==='Week 14 • NFC Wildcard Round','Week 14 NFC teams must be in the NFC Wildcard Round');
assert(inquirerWeekClassification(15,2026,'AFC').round==='AFC Divisional Round','Week 15 must be the conference Divisional Round');
assert(inquirerWeekClassification(16,2026,'NFC').round==='NFC Championship','Week 16 must be the conference Championship');
assert(inquirerWeekClassification(17,2026,'AFC').round==='Super Bowl','Week 17 must be the Super Bowl regardless of conference');
assert(inquirerWeekClassification(14,2026).round==='NFC/AFC Wildcard Round','League-wide Week 14 classification must represent both conferences');

const teams=Array.from({length:32},(_,i)=>String(i+1));
for(let week=1;week<=4;week++){
 const counts=new Map(REPORTERS.map(r=>[r.id,0]));
 for(const id of teams){const r=reporterForTeam(id,week,teams);counts.set(r.id,(counts.get(r.id)||0)+1)}
 for(const r of REPORTERS)assert(counts.get(r.id)===8,'Week '+week+' must assign exactly eight teams to '+r.name);
}
for(const id of teams){
 const covered=new Set(Array.from({length:4},(_,i)=>reporterForTeam(id,i+1,teams).id));
 assert(covered.size===4,'Every team must rotate through all four reporters in four weeks: roster '+id);
}

const qb=realStatLine('QB',{pass_cmp:24,pass_att:35,pass_yd:287,pass_td:3,pass_int:1,rush_att:5,rush_yd:31});
assert(qb.includes('24/35 passing')&&qb.includes('287 pass yds')&&qb.includes('3 pass TD'),'QB real-life stat line missing Sleeper passing production');
const idp=realStatLine('LB',{tkl_solo:7,tkl_ast:4,sack:1,tkl_loss:2,qb_hit:2,pass_def:1});
assert(idp.includes('7 solo')&&idp.includes('1 sack')&&idp.includes('2 TFL'),'IDP real-life stat line missing Sleeper defensive production');

const sampleTeams=teams.map((id,i)=>({
 roster_id:id,manager_user_id:'u'+id,manager_name:'GM '+id,manager_career:{user_id:'u'+id,wins:20,losses:10,playoff_wins:2,championships:0,regular_season_titles:0},team_name:'Team '+id,conference:i<16?'AFC':'NFC',division_name:(i<16?'AFC':'NFC')+' TEST',points:100+i,opponent_points:90+i,won:true,projected:98,next_projected:90+i,recent_trade_count:i%3,current_week_trade_count:i%2,previous_fan_sentiment:null,current_season_champion:false,
 starter_details:[{id:'p'+id,name:'Player '+id,position:i%2?'WR':'LB',points:20,projected:15}],
 transactions:[],division_results:[],next_opponent_roster_id:String(i%2===0?i+2:i),next_opponent_name:'Team '+String(i%2===0?i+2:i)
}));
const players=Object.fromEntries(teams.map((id,i)=>['p'+id,{full_name:'Player '+id,position:i%2?'WR':'LB',team:'NFL'}]));
const weeklyStats=Object.fromEntries(teams.map((id,i)=>['p'+id,i%2?{rec:6,rec_tgt:9,rec_yd:101,rec_td:1}:{tkl_solo:8,tkl_ast:3,sack:1}]));
const weeklyStatHistory={
  1:weeklyStats,
  2:Object.fromEntries(teams.map((id,i)=>['p'+id,i%2?{rec:5,rec_tgt:8,rec_yd:82}:{tkl_solo:6,tkl_ast:2}])),
  3:Object.fromEntries(teams.map((id,i)=>['p'+id,i%2?{rec:7,rec_tgt:10,rec_yd:115,rec_td:1}:{tkl_solo:9,tkl_ast:4,sack:1}])),
  4:Object.fromEntries(teams.map((id,i)=>['p'+id,i%2?{rec:8,rec_tgt:11,rec_yd:128,rec_td:1}:{tkl_solo:10,tkl_ast:3,sack:1}])),
  5:Object.fromEntries(teams.map((id,i)=>['p'+id,i%2?{rec:9,rec_tgt:12,rec_yd:140,rec_td:2}:{tkl_solo:11,tkl_ast:4,sack:2}])),
  6:Object.fromEntries(teams.map((id,i)=>['p'+id,i%2?{rec:10,rec_tgt:13,rec_yd:155,rec_td:2}:{tkl_solo:12,tkl_ast:5,sack:2}]))
};
for(const [i,t] of sampleTeams.entries()){
 t.league_context={season_context_available:true,record:{wins:Math.max(0,10-Math.floor(i/3)),losses:Math.floor(i/3),ties:0},standings_rank:i+1,league_size:32,playoff_teams:16,playoff_week_start:14,games_until_playoffs:5,inside_playoff_line:i<16,spots_from_playoff_line:(i+1)-16,streak:{type:i%3===0?'W':'L',length:(i%4)+2},recent_games:[{week:2,points:120,opponent_points:110,result:'W',opponent_name:'Opp A'},{week:3,points:125,opponent_points:115,result:'W',opponent_name:'Opp B'},{week:4,points:130,opponent_points:118,result:'W',opponent_name:'Opp C'},{week:5,points:135,opponent_points:120,result:'W',opponent_name:'Opp D'},{week:6,points:140,opponent_points:121,result:'W',opponent_name:'Opp E'}],recent_avg_points:130-i,prior_five_avg_points:110-i};
 t.value_history_week={team_id:t.roster_id,value:20000+i*100,baseline_value:19800+i*100,delta:200,pct:1.01,baseline_t:'2026-09-12T22:01:38.323Z',latest_t:'2026-09-19T22:01:38.323Z',period:'7D'};
 t.next_week_availability={schedule_verified:true,schedule_source:'ESPN NFL scoreboard schedule',next_nfl_week:7,bye_players:i===0?[{id:'p'+t.roster_id,name:'Player '+t.roster_id,position:'WR',nfl_team:'NFL',current_starter:true}]:[],bye_current_starters:i===0?[{id:'p'+t.roster_id,name:'Player '+t.roster_id,position:'WR',nfl_team:'NFL',current_starter:true}]:[],injury_players:i===1?[{id:'p'+t.roster_id,name:'Player '+t.roster_id,position:'LB',nfl_team:'NFL',designation:'Questionable',current_starter:true}]:[],injury_current_starters:i===1?[{id:'p'+t.roster_id,name:'Player '+t.roster_id,position:'LB',nfl_team:'NFL',designation:'Questionable',current_starter:true}]:[]};
}
const weekClassification={week:6,season:2026,phase:'Regular Season',playoffs:false,label:'Week 6 • Regular Season',playoff_start_week:14,final_week:17};
const built=buildInquirerWeek({season:2026,week:6,teams:sampleTeams,players,weeklyStats:weeklyStatHistory[6],weeklyStatHistory,scoringSettings:{},scoreFn:(stats)=>Number(stats?.rec_yd||stats?.tkl_solo||20),weekClassification});
assert(built.reporters.length===4&&built.teams.length===32,'Inquirer weekly build must return four reporters and 32 team articles');
for(const t of built.teams){
 const a=t.inquirer_article;
 assert(a?.reporter?.id&&a?.headline&&a?.byline,'Each team article must preserve reporter identity, headline, and byline');
 assert((a.paragraphs||[]).some(p=>/fantasy points/i.test(p)),'Each performance article must cite fantasy points in prose');
 assert((a.paragraphs||[]).some(p=>/rec|solo|sacks|yds/.test(p)),'Each performance article must cite real-life Sleeper stats');
 assert(a.facts?.league_context?.standings_rank===t.league_context.standings_rank&&a.facts?.league_context?.record?.wins===t.league_context.record.wins,'Each article must preserve verified season/standings/streak/playoff context in its facts');
 assert((a.paragraphs||[]).some(p=>p.includes(String(t.league_context.record.wins)+'-'+String(t.league_context.record.losses))||/streak|Week 14|playoff/i.test(p)),'Each article must weave verified season context into narrative prose');
 assert((a.facts?.starter_details||[]).every(p=>p.recent_form!=null),'Player coverage must preserve multi-game performance context for the writer when history exists');
 const hasTrade=(t.transactions||[]).some(m=>String(m?.type||'').toLowerCase()==='trade'),expectedSections=hasTrade?9:8,tradeSection=(a.sections||[]).find(s=>s.kind==='trade-commentary');
 assert((a.sections||[]).length===expectedSections&&(a.paragraphs||[]).length>=8,'Each V26 Inquirer story must preserve eight core reporting beats plus a dynamic trade-commentary beat when applicable');
 if(hasTrade)assert(tradeSection&&(tradeSection.paragraphs||[]).length>=1,'A team with an applicable trade must receive dedicated trade commentary');
 else assert(!tradeSection,'A team without an applicable trade must not receive synthetic trade commentary');
 const articleWords=(a.paragraphs||[]).join(' ').trim().split(/\s+/).filter(Boolean).length;
 assert(articleWords>=200,'Each V25 Inquirer story must contain a complete human-readable beat column rather than a checklist summary; got '+articleWords+' words');
 assert((a.sections||[]).some(s=>s.kind==='players'&&(s.paragraphs||[]).length>=Math.min(2,t.starter_details.length)),'Each article must connect available leading and supporting player performances to the result');
 const managementSection=(a.sections||[]).find(s=>s.kind==='management');
 assert(managementSection&&(managementSection.paragraphs||[]).length>=1&&managementSection.paragraphs.length<=2,'Each article must contain a complete management/lineup section with transaction-quality judgment');
 assert(a.facts?.opponent_context!==undefined,'Each article must preserve opponent context for narrative reporting');
 const valueSection=(a.sections||[]).find(s=>s.kind==='value');
 assert(valueSection&&(valueSection.paragraphs||[]).length>=1,'Each article must include a complete team-specific Value History reporting beat regardless of the reporter’s chosen section headline');
 assert((a.sections||[]).some(s=>s.kind==='outlook')&&a.facts?.next_week_availability!==undefined,'Each article must include a complete next-week section backed by availability data');
 assert(a.week_classification?.label==='Week 6 • Regular Season','Team article must persist the canonical week classification');
 assert(a.fan_sentiment&&Number.isFinite(Number(a.fan_sentiment.score)),'Each team article must persist a numeric rolling fan sentiment');
 assert((a.sections||[]).some(s=>s.kind==='sentiment'),'Each team article must include a dedicated rolling fan-sentiment section');
}

const championTeam={...sampleTeams[0],
 manager_user_id:'champ-owner',manager_name:'Dynasty GM',manager_career:{user_id:'champ-owner',wins:55,losses:20,playoff_wins:11,championships:3,regular_season_titles:2},
 points:71,opponent_points:132,won:false,projected:108,recent_trade_count:1,previous_fan_sentiment:{score:88,manager_user_id:'champ-owner'},
 league_context:{...sampleTeams[0].league_context,record:{wins:9,losses:2,ties:0},standings_rank:2,streak:{type:'L',length:1},recent_games:[
  {week:7,points:139,opponent_points:110,result:'W',opponent_name:'A'},
  {week:8,points:145,opponent_points:120,result:'W',opponent_name:'B'},
  {week:9,points:131,opponent_points:118,result:'W',opponent_name:'C'},
  {week:10,points:142,opponent_points:121,result:'W',opponent_name:'D'},
  {week:11,points:71,opponent_points:132,result:'L',opponent_name:'E'}
 ],recent_avg_points:125.6,prior_five_avg_points:119},
 value_history_week:{team_id:'1',value:24500,baseline_value:24350,delta:150,pct:.62,baseline_t:'2026-11-01T00:00:00Z',latest_t:'2026-11-08T00:00:00Z',period:'7D'}
};
const championBuild=buildInquirerWeek({season:2026,week:11,teams:[championTeam],players,weeklyStats:weeklyStatHistory[6],weeklyStatHistory,scoringSettings:{},scoreFn:(stats)=>Number(stats?.rec_yd||stats?.tkl_solo||20),weekClassification:inquirerWeekClassification(11,2026)});
const champSentiment=championBuild.teams[0].inquirer_article.fan_sentiment;
assert(champSentiment.score>=70,'One bad week must not cause a proven repeated champion to collapse into negative fan sentiment');
const champSentimentSection=championBuild.teams[0].inquirer_article.sections.find(s=>s.kind==='sentiment');
assert(/Hall of Fame|Build the Statue|Parade|Standing Ovation/.test([champSentiment.title,...(champSentimentSection?.paragraphs||[])].join(' ')),'Strong championship management must retain strongly positive fan language after one bad week');

const collapseTeam={...sampleTeams[31],
 manager_user_id:'collapse-owner',manager_name:'Basement GM',manager_career:{user_id:'collapse-owner',wins:5,losses:30,playoff_wins:0,championships:0,regular_season_titles:0},
 points:54,opponent_points:141,won:false,projected:105,recent_trade_count:2,previous_fan_sentiment:{score:-76,manager_user_id:'collapse-owner'},
 league_context:{...sampleTeams[31].league_context,record:{wins:1,losses:10,ties:0},standings_rank:32,streak:{type:'L',length:6},recent_games:[
  {week:7,points:69,opponent_points:120,result:'L',opponent_name:'A'},
  {week:8,points:62,opponent_points:118,result:'L',opponent_name:'B'},
  {week:9,points:75,opponent_points:130,result:'L',opponent_name:'C'},
  {week:10,points:58,opponent_points:129,result:'L',opponent_name:'D'},
  {week:11,points:54,opponent_points:141,result:'L',opponent_name:'E'}
 ],recent_avg_points:63.6,prior_five_avg_points:96},
 value_history_week:{team_id:'32',value:13100,baseline_value:14700,delta:-1600,pct:-10.88,baseline_t:'2026-11-01T00:00:00Z',latest_t:'2026-11-08T00:00:00Z',period:'7D'}
};
const collapseBuild=buildInquirerWeek({season:2026,week:11,teams:[collapseTeam],players,weeklyStats:weeklyStatHistory[6],weeklyStatHistory,scoringSettings:{},scoreFn:(stats)=>Number(stats?.rec_yd||stats?.tkl_solo||20),weekClassification:inquirerWeekClassification(11,2026)});
const collapseSentiment=collapseBuild.teams[0].inquirer_article.fan_sentiment;
assert(collapseSentiment.score<=-55,'Sustained losing, falling values and poor management must be able to drive strongly negative fan sentiment');
assert(/Fire-the-GM|Ban Him From the City|Torches|Mansion Is Under Siege/i.test(collapseSentiment.title+' '+collapseSentiment.scene),'Extreme sustained negative performance must have a creative negative sentiment range');

const crossPositionTeam={...sampleTeams[2],roster_id:'cross',team_name:'Cross Position Test',manager_name:'Eligibility GM',
 starter_details:[{id:'rb-test',name:'Starting Runner',position:'RB',lineup_slot:'RB',points:3,projected:10},{id:'wr-test',name:'Starting Wideout',position:'WR',lineup_slot:'WR',points:12,projected:12}],
 best_bench:{id:'lb-test',name:'Bench Linebacker',position:'LB',points:31,projected:12},
 worst_starter:{id:'rb-test',name:'Starting Runner',position:'RB',lineup_slot:'RB',points:3,projected:10},
 best_lineup_miss:null,
 league_context:{...sampleTeams[2].league_context,record:{wins:3,losses:3,ties:0},standings_rank:18},
 next_week_availability:{schedule_verified:true,bye_players:[],bye_current_starters:[],injury_players:[],injury_current_starters:[]}
};
const crossPlayers={...players,'rb-test':{full_name:'Starting Runner',position:'RB',team:'NFL'},'wr-test':{full_name:'Starting Wideout',position:'WR',team:'NFL'},'lb-test':{full_name:'Bench Linebacker',position:'LB',team:'NFL'}};
const crossStats={'rb-test':{rush_att:8,rush_yd:24},'wr-test':{rec:5,rec_tgt:7,rec_yd:70},'lb-test':{tkl_solo:10,tkl_ast:5,sack:1}};
const crossBuild=buildInquirerWeek({season:2026,week:6,teams:[crossPositionTeam],players:crossPlayers,weeklyStats:crossStats,weeklyStatHistory:{6:crossStats},scoringSettings:{},scoreFn:()=>10,weekClassification});
const crossManagement=crossBuild.teams[0].inquirer_article.sections.find(s=>s.kind==='management')?.paragraphs?.join(' ')||'';
assert(!/Bench Linebacker.*Starting Runner|Starting Runner.*Bench Linebacker/.test(crossManagement),'IDP bench scorer must never be framed as a legal replacement for an RB starter');
assert(crossBuild.teams[0].best_lineup_miss==null,'Cross-position test must produce no legal lineup miss when the only higher bench scorer is an LB and the weak starter is an RB');

const overview=buildLeagueOverview({
 season:2026,week:14,teams:built.teams,players,
 transactions:[{type:'free_agent',status:'complete',adds:{p1:'1'},drops:{p2:'2'}},{type:'trade',status:'complete',roster_ids:['1','2'],adds:{p1:'2',p2:'1'},drops:{}}],
 canonicalTrades:[{season:2026,week:14,team_names:{'1':'Team 1','2':'Team 2'},sides:[{roster_id:'1',player_ids:['p2'],picks:[]},{roster_id:'2',player_ids:['p1'],picks:[{season:2027,round:1}]}]}],
 weekClassification:inquirerWeekClassification(14,2026),
 valueHistoryMeta:{period:'7D',baseline:'2026-09-12T22:01:38.323Z',latest:'2026-09-19T22:01:38.323Z',source:'github-archive+netlify-live'}
});
assert(overview.week_classification?.phase==='Playoffs'&&overview.week_classification?.round==='NFC/AFC Wildcard Round','League Overview must remember Week 14 as the NFC/AFC Wildcard Round');
assert((overview.sections||[]).length===4,'League Overview must contain one substantive desk section from each reporter');
assert((overview.hot_takes||[]).length>=5,'League Overview Hot Takes must contain championship, fraud, division, player and upset predictions');
assert(['championship','fraud','division','player','upset'].every(k=>(overview.hot_takes||[]).some(x=>x.kind===k)),'Hot Takes must be actual prediction categories, not statistical-analysis blurbs');
assert((overview.sections||[]).some(s=>(s.paragraphs||[]).some(p=>/trade|transaction/i.test(p))),'Weekly Recap must react naturally to meaningful weekly transactions when present');
assert((overview.bottom_five||[]).length===5,'Weekly Recap data must preserve the bottom-five context even when the prose chooses a different lead');

const backend=fs.readFileSync('netlify/functions/league-hub.mjs','utf8');
const ui=fs.readFileSync('league-hub-v451.js','utf8');
const helper=fs.readFileSync('netlify/functions/inquirer-reporters.mjs','utf8');
const narrative=fs.readFileSync('netlify/functions/inquirer-narrative-v17.mjs','utf8');
const human=fs.readFileSync('netlify/functions/inquirer-human-v19.mjs','utf8');
const newsroom=fs.readFileSync('netlify/functions/inquirer-human-v20.mjs','utf8');
const overviewWriter=fs.readFileSync('netlify/functions/inquirer-overview-v19.mjs','utf8');
const reporting=fs.readFileSync('netlify/functions/inquirer-reporting-v25.mjs','utf8');
assert(backend.includes('/stats/nfl/regular/\${season}/\${week}'),'League Hub must fetch Sleeper raw weekly stats for Inquirer articles');
assert(backend.includes("inquirer/reporters/'+reporter.id+'/index.json"),'Each reporter must have a persistent article archive index');
assert(backend.includes("u.searchParams.get('reporter_archive')"),'Reporter archive API route missing');
assert(backend.includes("if(published?.available&&Array.isArray(published?.teams)&&published.teams.length)return published"),'Published completed-week broadcasts must return unchanged instead of regenerating');
assert(backend.includes("const preloadedBroadcast=(season,week)=>PRELOADED_BROADCASTS.get")&&backend.includes("preloaded:true"),'Bundled Week 1 must stay available even if a future editorial revision changes');
assert(ui.includes("Open Full Inquirer ▾")&&ui.includes("Weekly Recap →")&&ui.includes("data-lh-archive-season"),'Held Inquirer state must keep both Open Full Inquirer and Weekly Recap controls when a published edition exists');
assert(backend.includes('published_locked:true'),'Newly published Inquirer broadcasts and archive articles must be marked immutable');
assert(!backend.includes('migration_reason:'),'Published Inquirer articles must not be silently rewritten by later editorial revisions');
assert(backend.includes("articleKey='inquirer/reporters/'+reporter.id+'/articles/'"),'Each reporter must store standalone article files in addition to the archive index');
assert(backend.includes("if(!stored?.headline)await s.setJSON(articleKey")&&backend.includes("if(!seen.has(k)){rows.push(entry);seen.set(k,rows.length-1)}"),'Reporter article files and archive index rows must be write-once after publication');
assert(backend.includes('leagueSeasonContext(')&&backend.includes('if(Number.isFinite(sourceWeek)&&sourceWeek>snapshotWeek)continue'),'Inquirer backend must derive standings only through the report week and ignore future matchup rows');
assert(backend.includes('weeklyStatHistory'),'Inquirer backend must provide multi-week Sleeper stat history for player trend context');
assert(ui.includes('storedInquirerArticle(t,teams)')&&ui.includes('headline=render(a.headline||t.team_name)'),'League Hub must render preserved Inquirer article copy through the record-aware headline-first renderer');
assert(ui.includes('reporterArchiveHTML(w)'),'League Hub must expose reporter archive UI');
assert(ui.includes('data-lh-reporter-archive'),'Reporter archive controls missing');
assert(ui.includes('leagueOverviewArticle(o)')&&ui.includes('Weekly Recap • All 4 Reporters'),'Weekly Recap must be a first-class archived Inquirer article in the UI');
assert(ui.includes('lh-fan-sentiment'),'Fan Sentiment must render as a dedicated visual section in the team article');
assert(backend.includes("internalHistory(origin,'team_net_all=1')"),'Inquirer must reuse the canonical Value History team-movement endpoint');
assert(backend.includes("internalHistory(origin,'trades=1')"),'Inquirer must reuse canonical Trade History for weekly trade reactions');
assert(backend.includes('nflWeekSchedule(season,nextNflWeek)'),'Inquirer must verify next-week NFL schedule before calling bye situations');
assert(backend.includes('injury_status'),'Inquirer must use Sleeper injury designations for roster-pressure analysis');
assert(backend.includes("league?.metadata?.['division_'+d]"),'Conference must be derived from Sleeper division metadata rather than hardcoded roster IDs');
assert(backend.includes("name.startsWith('AFC')")&&backend.includes("name.startsWith('NFC')"),'Sleeper AFC/NFC division labels must drive conference assignment');
assert(backend.includes("managers/history-cache.json"),'Fan sentiment must consume persistent manager career history');
assert(backend.includes("import week1Preload2026 from './inquirer-week1-2026-preload.mjs'"),'League Hub must import the generated Week 1 V25 preload');
assert(backend.includes('preloadedBroadcast(season,week)'), 'League Hub weekly/archive paths must recognize preloaded completed editions');
assert(backend.includes('preloadedReporterEntries(reporter.id)'), 'Reporter archives must merge each reporter’s Week 1 preload stories');
assert(backend.includes("key:'preloaded:2026:1'"), 'Weekly archive index must expose preloaded Week 1');
assert(backend.includes('previous_fan_sentiment:previousSentiment'),'Fan sentiment must carry forward from the prior archived week for the same team/manager');
assert(backend.includes('current_season_champion'),'Week 17 sentiment must be able to recognize the current Sleeper championship winner');
assert(/not a data presenter/i.test(helper)&&/smooth narrative delivery/i.test(helper),'Reporter house style must require conversational newsroom prose instead of data presentation');
assert(helper.includes('Old-school hometown beat writer')&&helper.includes('Overeducated, theatrical hometown columnist')&&helper.includes('Hometown tabloid lifer')&&helper.includes('Hometown investigative columnist'),'All four reporters must preserve distinct but entertaining hometown personalities');
assert(/Winning is vulgar, addictive and highly recommended/.test(helper),'Bartholomew must remain a theatrical columnist rather than a numbers-desk presenter');
assert(/parking|complaint|clipping/i.test(human+newsroom)&&/good china|waistcoat|theatrical|vulgar|hotel-lobby/i.test(human+newsroom)&&/angry font|confetti|back page/i.test(human+newsroom)&&/fingerprints|docket|cross-examination|evidence/i.test(human+newsroom),'Every V21 desk must preserve distinct sarcasm/humor vocabulary without relying on photo-size metaphors');
assert(helper.includes('buildNarrativeArticle')&&narrative.includes('humanSectionsV25')&&fs.readFileSync('netlify/functions/inquirer-human-v21.mjs','utf8').includes('humanSectionsV19')&&human.includes("kind:'lede'")&&human.includes("kind:'players'")&&human.includes("kind:'management'")&&human.includes("kind:'value'")&&human.includes("kind:'sentiment'")&&human.includes("kind:'outlook'"),'V25 must compose the six reporting beats plus matchup impact sections through the depth layer');
assert(reporting.includes('function nickExpansion')&&reporting.includes('function bartholomewExpansion')&&reporting.includes('function tillyExpansion')&&reporting.includes('function filchExpansion')&&reporting.includes('reporterStructureV26'),'Recovered Work-state requires four structurally distinct reporter expansion paths, not one shared commentary template');
assert(!reporting.includes('function sectionCommentary'),'Generic shared sectionCommentary must not return; it regresses the four reporters toward one article template');
assert(reporting.includes('valueSectionV26')&&reporting.includes('acquisitionCallback'),'Active team articles must preserve reporter-specific Value History prose and ongoing trade-acquisition memory');
assert(reporting.includes('tradeCommentaryV32')&&reporting.includes("kind:\"trade-commentary\""),'Active team articles must consume read-only Trade History in a dedicated dynamic trade-commentary section');
assert(reporting.includes('focusedPlayerStatsV32')&&reporting.includes('playerEditorialReadV32'),'Active player reporting must preserve complete highlighted-player stats and add a substantive editorial read');
assert(/section-order shuffling alone is not enough/i.test(helper),'House style must state that reporter differences require more than reordered sections');
assert(overviewWriter.includes("kind:'championship'")&&overviewWriter.includes("kind:'fraud'")&&overviewWriter.includes("kind:'division'")&&overviewWriter.includes("kind:'player'")&&overviewWriter.includes("kind:'upset'"),'Hot Takes must remain explicit prediction types');
assert(helper.includes('Hall of Fame Petition')&&helper.includes('Metaphorical Torches & Pitchforks')&&helper.includes('The Imaginary Mansion Is Under Siege'),'V16 fan sentiment must preserve the full creative positive-to-negative spectrum');
assert(helper.includes("previous.score)*.65+raw*.35"),'V16 fan sentiment must preserve prior-week inertia so one result cannot dominate management reputation');
assert(helper.includes('buildLeagueOverview')&&helper.includes('buildHumanLeagueOverviewV19'),'The co-authored Weekly Recap must remain routed through the passionate newsroom engine');
assert(backend.includes('slotAcceptsPosition(slot,position)')&&backend.includes('bestEligibleLineupMiss(starters,bench)'),'Lineup hindsight must use Sleeper slot eligibility instead of raw best-bench versus worst-starter scoring');
assert(backend.includes("if(s==='FLEX')return ['RB','WR','TE'].includes(p)")&&backend.includes("if(s==='IDP_FLEX'||s==='IDP')return IDP_POSITIONS.has(p)"),'Offensive FLEX and IDP FLEX eligibility must remain separate');
assert(helper.includes('best_lineup_miss')&&human.includes('best_lineup_miss')&&newsroom.includes('best_lineup_miss'),'V21 writer must consume only the position-eligible lineup miss for management criticism');
assert(ui.includes('data-lh-archive-year')&&ui.includes('data-lh-archive-week')&&ui.includes('data-lh-archive-team'),'Inquirer archive must expose year, week, and team filters');
assert(ui.includes('It opens on the current completed week'),'Inquirer archive must default its filter view to the current completed week');
assert(ui.includes('linkedNotebookText(value,teams,seenRecords,seenLinks)')&&ui.includes('class="lh-inline-team" data-lh-inquirer-team'),'Inquirer team references must use the Inquirer-only team-link action');
assert(ui.includes('data-lh-inquirer-value')&&ui.includes('Team Value History')&&ui.includes('data-lh-inquirer-report')&&ui.includes('Weekly Team Report'),'Selecting an Inquirer team name must offer Value History or the matching Weekly Team Report');
assert(ui.includes('if(seenLinks&&seenLinks.has(id))')&&ui.includes('map(s=>{const render=renderScope(new Set())'),'Each team may be underline-linked only once per Inquirer section');
assert(ui.includes('data-lh-broadcast-article')&&ui.indexOf("nav+body+archive")>=0,'The clean team/manager article selector must render above the selected article');
assert(ui.includes('.lh-article-picker span{font-size:16px')&&ui.includes('.lh-article-picker{display:grid')&&ui.includes('background:transparent'),'Choose an article must be prominent without a gold container');
assert(ui.includes('.lh-reporter-byline{margin:8px 0 12px;padding:2px 0;border:0;background:transparent}'),'Author bylines must render without the gold box treatment');
assert(ui.includes('scrollToInquirerArticle')&&ui.includes('showWeeklyArticle(weeklyCache,true)'),'Selecting an Inquirer article must scroll the reader to the top of that article');
assert(ui.includes("const preserveY=view==='daily'&&previousView==='daily'?window.scrollY:null")&&ui.includes("window.scrollTo({top:preserveY,behavior:'auto'})"),'Reporter desk rerenders must preserve the reader’s scroll position');
assert(ui.includes('data-lh-reporter-close'),'Reporter Desks must provide an explicit Close control');
assert(ui.includes("String(p).trim().toLowerCase()!=='n/a'"),'League Hub must suppress empty/n-a article sections instead of rendering their headings');
assert(ui.includes('Weekly Recap • All 4 Reporters')&&ui.includes('const recapLink=w.league_overview?')&&ui.includes('data-lh-broadcast-team="__league__"'),'Weekly Recap must remain the user-facing league article with an always-visible headline link that opens the recap');
assert(!ui.includes('League Notebook'),'League Notebook must not regress into user-facing League Hub copy after the Weekly Recap rename');
assert(ui.includes('data-lh-archive-year')&&ui.includes('data-lh-archive-week')&&ui.includes('data-lh-archive-team')&&ui.includes('data-lh-reporter-article-season'),'Article Archive must retain Year/Week/Team filters and clickable reporter-story archive controls');
assert(backend.includes("team_name:'Weekly Recap'")&&!backend.includes("team_name:'League Overview'"),'Stored archive metadata must call the league-wide article Weekly Recap');
assert(backend.includes('nextProj')&&overviewWriter.includes('underdog_projected')&&overviewWriter.includes('favorite_projected'),'Upset picks must be backed by next-week projections and preserve both projected scores');
assert(week1Preload.teams.every(t=>['hot-seat','cool-throne'].every(k=>t.inquirer_article.sections.some(s=>s.kind===k))),'Every preloaded V26 article must include Hot Seat and Cool Throne sections');
assert(!ui.includes("esc(r?.voice||'')"),'Published archive UI must never print internal reporter voice prompts');
console.log('Fleeced Inquirer V26 recovered Work-state, reporter structure, persistence, and archive smoke passed');
