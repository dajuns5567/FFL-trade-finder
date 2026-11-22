import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {completedLeagueWeekView} from '../netlify/functions/lib/league-completed-week.mjs';

const rosters=Array.from({length:32},(_,i)=>({roster_id:i+1,owner_id:'u'+(i+1)}));
const users=rosters.map(r=>({user_id:r.owner_id,display_name:'Manager '+r.roster_id,metadata:{team_name:'Team '+r.roster_id}}));
const matchups=()=>rosters.map((r,i)=>({matchup_id:Math.floor(i/2)+1,roster_id:r.roster_id,points:101+i,
 players_points:{player_id:10+i}}));

test('Fleeced Daily can show finalized Week 10 with no published Inquirer Week 10',()=>{
 const view=completedLeagueWeekView({season:2026,week:10,matchups:matchups(),rosters,users});
 assert.equal(view.available,true);
 assert.equal(view.week,10);
 assert.equal(view.teams.length,32);
 assert.equal(view.teams[0].team_name,'Team 1');
 assert.equal(view.teams[0].opponent_points,102);
 assert.equal(view.teams[0].won,false);
 assert.equal(view.teams[1].won,true);
 assert.equal('newspaper' in view,false);
 assert.equal('editorial' in view,false);
});
test('incomplete player scoring cannot claim a finalized week',()=>{
 const rows=matchups();rows[0].players_points={};
 assert.equal(completedLeagueWeekView({season:2026,week:10,matchups:rows,rosters,users}),null);
});
test('duplicate roster or orphaned matchup cannot create a fabricated scoreboard',()=>{
 const rows=matchups();rows[31].roster_id=1;
 assert.equal(completedLeagueWeekView({season:2026,week:10,matchups:rows,rosters,users}),null);
 const orphan=matchups();orphan[31].matchup_id=17;
 assert.equal(completedLeagueWeekView({season:2026,week:10,matchups:orphan,rosters,users}),null);
});
test('completed weeks never infer numeric results from absent scores',()=>{
 const rows=matchups();delete rows[0].points;
 assert.equal(completedLeagueWeekView({season:2026,week:10,matchups:rows,rosters,users}),null);
});
test('the independent feed is not gated on news archive, awards or status',()=>{
 const backend=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 const frontend=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
 const handler=backend.slice(backend.indexOf('async function latestCompletedLeagueWeek()'),backend.indexOf('async function draftAwards()'));
 assert.match(handler,/completedPublicationWeek\(week\)/);
 assert.match(handler,/completedLeagueWeekView/);
 assert.doesNotMatch(handler,/broadcastArchive|weeklyReport|inquirer\/publication-status|editorialApproval|weeklyAwards/);
 assert.match(backend,/searchParams\.get\('league_latest'\)==='1'/);
 assert.match(frontend,/liveLeagueWeek\(\)\.catch/);
 assert.match(frontend,/dailyHTML\(all,stats,w,md,spotlightW\|\|w,leagueWeek\)/);
 assert.match(frontend,/liveScoreboard\+report/);
});
