import fs from 'node:fs';
import {REPORTERS,reporterForTeam,realStatLine,buildInquirerWeek} from '../netlify/functions/inquirer-reporters.mjs';

const assert=(x,m)=>{if(!x)throw new Error(m)};
assert(REPORTERS.length===4,'Fleeced Inquirer must have exactly four permanent reporters');

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
const built=buildInquirerWeek({season:2026,week:1,teams:sampleTeams,players,weeklyStats,scoringSettings:{},scoreFn:()=>20});
assert(built.reporters.length===4&&built.teams.length===32,'Inquirer weekly build must return four reporters and 32 team articles');
for(const t of built.teams){
 const a=t.inquirer_article;
 assert(a?.reporter?.id&&a?.headline&&a?.byline,'Each team article must preserve reporter identity, headline, and byline');
 assert((a.paragraphs||[]).some(p=>p.includes('fantasy pts')),'Each performance article must cite fantasy points');
 assert((a.paragraphs||[]).some(p=>/rec|solo|sacks|yds/.test(p)),'Each performance article must cite real-life Sleeper stats');
}

const backend=fs.readFileSync('netlify/functions/league-hub.mjs','utf8');
const ui=fs.readFileSync('league-hub-v451.js','utf8');
const helper=fs.readFileSync('netlify/functions/inquirer-reporters.mjs','utf8');
assert(backend.includes('/stats/nfl/regular/\${season}/\${week}'),'League Hub must fetch Sleeper raw weekly stats for Inquirer articles');
assert(backend.includes("inquirer/reporters/'+reporter.id+'/index.json"),'Each reporter must have a persistent article archive index');
assert(backend.includes("u.searchParams.get('reporter_archive')"),'Reporter archive API route missing');
assert(backend.includes('if(Array.isArray(prior?.teams))'),'Stored completed-week Inquirer articles must be reused across future Inquirer versions instead of silently rewritten');
assert(backend.includes("articleKey='inquirer/reporters/'+reporter.id+'/articles/'"),'Each reporter must store immutable standalone article files in addition to the archive index');
assert(backend.includes("if(!stored?.headline)await s.setJSON(articleKey"),'Existing archived reporter articles must never be silently overwritten');
assert(ui.includes('storedInquirerArticle(t)'),'League Hub must render preserved Inquirer article copy');
assert(ui.includes('reporterArchiveHTML(w)'),'League Hub must expose reporter archive UI');
assert(ui.includes('data-lh-reporter-archive'),'Reporter archive controls missing');
assert(helper.includes('dramatic without inventing facts'),'Reporter house style must preserve dramatic-but-factual constraint');
console.log('Fleeced Inquirer four-reporter rotation, real-stat, persistence, and archive smoke passed');
