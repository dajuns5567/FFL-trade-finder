import fs from 'node:fs';
import {REPORTERS,reporterForTeam,realStatLine,buildInquirerWeek} from '../netlify/functions/inquirer-reporters.mjs';

const assert=(x,m)=>{if(!x)throw new Error(m)};
assert(REPORTERS.length===4,'Fleeced Inquirer must have exactly four permanent reporters');
assert(REPORTERS.map(r=>r.name).join('|')==='Nick Swindell|Bartholomew Roycington III|Tilly Fleecer|Jefferson Filch','Fleeced Inquirer public reporter names must remain the approved V11 names');

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
assert(idp.includes('7 solo')&&idp.includes('1 sacks')&&idp.includes('2 TFL'),'IDP real-life stat line missing Sleeper defensive production');

const sampleTeams=teams.map((id,i)=>({
 roster_id:id,manager_name:'GM '+id,team_name:'Team '+id,points:100+i,opponent_points:90+i,won:true,projected:98,
 starter_details:[{id:'p'+id,name:'Player '+id,position:i%2?'WR':'LB',points:20,projected:15}],
 transactions:[],division_results:[],next_opponent_roster_id:null,next_opponent_name:''
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
for(const t of sampleTeams)t.league_context={season_context_available:true,record:{wins:5,losses:1,ties:0},standings_rank:3,league_size:32,playoff_teams:16,playoff_week_start:14,games_until_playoffs:5,inside_playoff_line:true,spots_from_playoff_line:-13,streak:{type:'W',length:4},recent_games:[{week:2,points:120},{week:3,points:125},{week:4,points:130},{week:5,points:135},{week:6,points:140}],recent_avg_points:130,prior_five_avg_points:110};
const built=buildInquirerWeek({season:2026,week:6,teams:sampleTeams,players,weeklyStats:weeklyStatHistory[6],weeklyStatHistory,scoringSettings:{},scoreFn:(stats)=>Number(stats?.rec_yd||stats?.tkl_solo||20)});
assert(built.reporters.length===4&&built.teams.length===32,'Inquirer weekly build must return four reporters and 32 team articles');
for(const t of built.teams){
 const a=t.inquirer_article;
 assert(a?.reporter?.id&&a?.headline&&a?.byline,'Each team article must preserve reporter identity, headline, and byline');
 assert((a.paragraphs||[]).some(p=>p.includes('fantasy pts')),'Each performance article must cite fantasy points');
 assert((a.paragraphs||[]).some(p=>/rec|solo|sacks|yds/.test(p)),'Each performance article must cite real-life Sleeper stats');
 assert((a.paragraphs||[]).some(p=>/5-1|winning streak|playoff push|league rank/i.test(p)),'Each article must include verified season/standings/streak/playoff context when available');
 assert((a.paragraphs||[]).some(p=>/last three|prior three|stretch/i.test(p)),'Player coverage must support multi-game performance context when enough Sleeper history exists');
 assert((a.paragraphs||[]).length>=9,'Each Inquirer story must be a full multi-paragraph article, not a short recap');
 const articleWords=(a.paragraphs||[]).join(' ').trim().split(/\s+/).filter(Boolean).length;
 assert(articleWords>=400,'Each Inquirer story must contain substantial long-form analysis rather than a checklist summary; got '+articleWords+' words');
 assert((a.paragraphs||[]).some(p=>/top three starters|anatomy|forensic accounting|AUTOPSY/i.test(p)),'Each article must analyze how the team score was constructed');
 assert((a.paragraphs||[]).some(p=>/bench|lineup card|front office|manager/i.test(p)),'Each article must analyze management or lineup decisions');
 assert((a.paragraphs||[]).some(p=>/opponent|other sideline|Cross-examination|people we just/i.test(p)),'Each article must contextualize the quality of the opponent');
}

const backend=fs.readFileSync('netlify/functions/league-hub.mjs','utf8');
const ui=fs.readFileSync('league-hub-v451.js','utf8');
const helper=fs.readFileSync('netlify/functions/inquirer-reporters.mjs','utf8');
assert(backend.includes('/stats/nfl/regular/\${season}/\${week}'),'League Hub must fetch Sleeper raw weekly stats for Inquirer articles');
assert(backend.includes("inquirer/reporters/'+reporter.id+'/index.json"),'Each reporter must have a persistent article archive index');
assert(backend.includes("u.searchParams.get('reporter_archive')"),'Reporter archive API route missing');
assert(backend.includes("Number(prior?.inquirer_version||0)>=INQUIRER_VERSION"),'Current-version completed-week articles must be reused without rewriting');
assert(backend.includes("explicit V14 long-form article upgrade"),'The requested V11 reporter rename must explicitly migrate older reporter articles exactly once');
assert(backend.includes("articleKey='inquirer/reporters/'+reporter.id+'/articles/'"),'Each reporter must store standalone article files in addition to the archive index');
assert(backend.includes("Number(stored?.inquirer_version||0)<INQUIRER_VERSION"),'Only older-version archived reporter articles may be migrated; current-version articles stay preserved');
assert(backend.includes('leagueSeasonContext('),'Inquirer backend must derive season standings/streak context from completed Sleeper matchups');
assert(backend.includes('weeklyStatHistory'),'Inquirer backend must provide multi-week Sleeper stat history for player trend context');
assert(ui.includes('storedInquirerArticle(t)'),'League Hub must render preserved Inquirer article copy');
assert(ui.includes('reporterArchiveHTML(w)'),'League Hub must expose reporter archive UI');
assert(ui.includes('data-lh-reporter-archive'),'Reporter archive controls missing');
assert(/dramatic without inventing facts/i.test(helper),'Reporter house style must preserve dramatic-but-factual constraint');
assert(helper.includes('Hometown old-school beat writer and obvious fan')&&helper.includes('Hometown analytics beat writer and fan')&&helper.includes('Hometown tabloid beat writer and unapologetic fan')&&helper.includes('Hometown investigative beat writer and fan'),'All four reporters must explicitly write as hometown beat reporters/fans');
assert(/rival group chat/i.test(helper)&&/dental procedures/i.test(helper)&&/spreadsheets cannot be angry/i.test(helper)&&/subpoena immunity/i.test(helper),'V14 prose engine must preserve frequent sarcasm and embedded humor rather than generic recap copy');
assert(helper.includes('recentHistoryParagraph')&&helper.includes('gameAnatomyParagraph')&&helper.includes('supportingCastParagraph')&&helper.includes('managerParagraph')&&helper.includes('opponentContextParagraph')&&helper.includes('nextWeekParagraph')&&helper.includes('closingParagraph'),'V14 must retain the full long-form beat-column structure');
console.log('Fleeced Inquirer four-reporter rotation, real-stat, persistence, and archive smoke passed');
