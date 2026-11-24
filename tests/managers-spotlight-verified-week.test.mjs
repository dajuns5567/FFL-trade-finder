import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const ui=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const backend=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
const start=ui.indexOf('function spotlightBlock(md,w){');
const end=ui.indexOf('function graveyardScoringHTML(',start);
assert.ok(start>=0&&end>start,'Use the real Spotlight rendering code');
const source=ui.slice(start,end);
const render=(md,w)=>vm.runInNewContext(source+';spotlightBlock(md,w)',{md,w,esc:x=>String(x)},{timeout:2000});
const baseManager={current:[{roster_id:'1',sleeper_id:'Manager One'},{roster_id:'3',sleeper_id:'Manager Three'}],
 career:[{user_id:'1',sleeper_id:'Manager One',wins:8,losses:2,championships:1},
 {user_id:'3',sleeper_id:'Manager Three',wins:5,losses:5,championships:0}],
 scoring_history:{through_season:2026,through_week:10,season_extremes:[],all_time:{}}};
const teams=Array.from({length:32},(_,i)=>({roster_id:String(i+1),
 won:i%2===1,points:i%2===0?90:110,opponent_points:i%2===0?110:90,
 projected:null,opponent_projected:null,projection_coverage:0}));
function week(entries={}){const rows=teams.map(t=>({...t,...entries[t.roster_id]}));return{available:true,season:2026,week:11,teams:rows}}
const section=(html,heading)=>{
 const pos=html.indexOf('<small>'+heading+'</small>');
 assert.ok(pos>=0,'Missing Spotlight card '+heading);
 return html.slice(pos,html.indexOf('</div>',pos));
};

test('Manager Spotlight uses the latest completed Sleeper week rather than an Inquirer archive',()=>{
 const html=render(baseManager,week());
 assert.match(html,/Manager Spotlight • 2026 Week 11/);
 assert.match(html,/verified Sleeper matchups/);
 assert.match(html,/Hot Seat requires complete Sleeper starter projections/);
 assert.match(html,/Highest Scorer of the Year/);
 assert.match(html,/All-Time Lowest Scorer/);
 const managers=ui.slice(ui.indexOf("if(view==='managers'||view==='career')"),ui.indexOf("if(view==='hall')"));
 assert.match(managers,/liveLeagueWeek\(\)\.catch\(\(\)=>liveLeagueWeekCache\)/);
 assert.match(managers,/managersHTML\(stats,md,leagueWeek\)/);
 assert.doesNotMatch(managers,/spotlightWeek\(wk\)/);
 assert.match(ui,/spotlightBlock\(md,leagueWeek\)/);
});

test('Hot Seat requires actual pregame projections and a genuine projected upset',()=>{
 const valid=week({'1':{won:false,points:95,opponent_points:110,projected:125,opponent_projected:105,projection_coverage:1},
  '3':{won:false,points:100,opponent_points:110,projected:null,opponent_projected:80,projection_coverage:0}});
 const good=render(baseManager,valid);
 assert.match(section(good,'Hot Seat'),/<b>Manager One<\/b>/);
 assert.match(section(good,'Hot Seat'),/Projected \+20\.0/);
 const unverified=render(baseManager,week({'1':{won:false,points:90,opponent_points:110,projected:null,opponent_projected:100,projection_coverage:0}}));
 assert.match(section(unverified,'Hot Seat'),/<b>n\/a<\/b>/);
 assert.match(section(unverified,'Hot Seat'),/No verified projected upset for this completed week/);
 assert.doesNotMatch(section(unverified,'Hot Seat'),/Manager One/);
});

test('Cool Throne is based on final margin and never invents a missing projection',()=>{
 const html=render(baseManager,week({'1':{won:true,points:141,opponent_points:91,projected:null,opponent_projected:null,projection_coverage:0}}));
 const cool=section(html,'Cool Throne');
 assert.match(cool,/<b>Manager One<\/b>/);
 assert.match(cool,/Projected unavailable/);
 assert.match(cool,/won by 50\.0/);
 assert.doesNotMatch(cool,/Projected \+0\.0/);
});

test('incomplete or absent week leaves weekly awards unassigned rather than recycling newspaper results',()=>{
 const incomplete=render(baseManager,{available:true,season:2026,week:11,teams:teams.slice(0,31)});
 assert.match(section(incomplete,'Hot Seat'),/<b>n\/a<\/b>/);
 assert.match(section(incomplete,'Cool Throne'),/<b>n\/a<\/b>/);
 const missing=render(baseManager,null);
 assert.match(section(missing,'Hot Seat'),/<b>n\/a<\/b>/);
 assert.doesNotMatch(missing,/Manager Spotlight • 2026 Week 11/);
});

test('independent backend week feed uses real Sleeper projections, not final-score substitutions',()=>{
 const begin=backend.indexOf('async function latestCompletedLeagueWeek(requestedWeek=null){');
 const end=backend.indexOf('async function draftAwards(){',begin);
 assert.ok(begin>=0&&end>begin);
 const body=backend.slice(begin,end);
 assert.match(body,/const scoredProjections=await projections\(season,week,league\?\.scoring_settings\|\|\{\}\)/);
 assert.match(body,/playerProjections:scoredProjections/);
 assert.doesNotMatch(body,/playerProjections:finalized\.rows/);
 assert.match(body,/if\(!finalized\.complete\)continue/);
});

 test('actual Managers listing passes verified Sleeper week to Spotlight, never newspaper cache',()=>{
 const begin=ui.indexOf('function managersHTML('),end=ui.indexOf('\nfunction ',begin+1);
 assert.ok(begin>=0&&end>begin);
 const source=ui.slice(begin,end);
 const ctx={esc:String,teamName:String,graveyardScoringHTML:()=>'',spotlightBlock:(md,w)=>'SPOTLIGHT-'+w?.season+'-'+w?.week,liveLeagueWeekCache:{season:2026,week:11},spotlightWeeklyCache:{season:2026,week:10},weeklyCache:{season:2026,week:9}};
 const render=vm.runInNewContext(source+';managersHTML',ctx);
 assert.match(render([], {current:[],graveyard:[]},{season:2026,week:12}),/SPOTLIGHT-2026-12/);
 assert.match(render([], {current:[],graveyard:[]},null),/SPOTLIGHT-2026-11/);
 ctx.liveLeagueWeekCache=null;
 assert.match(render([], {current:[],graveyard:[]},null),/SPOTLIGHT-undefined-undefined/);
 });
