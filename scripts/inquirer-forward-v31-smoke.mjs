import assert from 'node:assert/strict';
import fs from 'node:fs';
import week2 from '../netlify/functions/inquirer-week2-2026-preload.mjs';
import {applyInquirerEditorialV32,evaluateInquirerEditionQuality,FORWARD_INQUIRER_VERSION,FORWARD_EDITORIAL_REVISION} from '../netlify/functions/inquirer-editorial-v32.mjs';
import {inquirerWeekClassification} from '../netlify/functions/inquirer-reporters.mjs';

const clone=x=>JSON.parse(JSON.stringify(x));
const rawForWeek=(week)=>{
  const teams=clone(week2.teams).map((t,i)=>{
    const bump=((i%5)-2)*1.7+(week-2)*0.9;
    t.week=week;
    t.points=Number((Number(t.points)+bump).toFixed(1));
    t.opponent_points=Number((Number(t.opponent_points)-bump/2).toFixed(1));
    t.won=t.points>t.opponent_points;
    t.week_classification=inquirerWeekClassification(week,2026,t.conference);
    t.league_context=t.league_context||{};
    t.league_context.snapshot_through_week=week;
    t.league_context.games_until_playoffs=Math.max(0,14-week);
    t.league_context.playoff_teams=16;
    t.league_context.playoff_teams_per_conference=8;
    t.league_context.playoff_seed=(i%16)+1;
    t.league_context.inside_playoff_line=t.league_context.playoff_seed<=8;
    t.league_context.division_leader=i%4===0;
    t.starter_details=(t.starter_details||[]).map((p,j)=>({...p,points:Number((Number(p.points)+(j===0?(week-2)*1.1:0)).toFixed(1))}));
    return t;
  });
  const overview=clone(week2.league_overview);
  overview.week=week;
  overview.week_classification=inquirerWeekClassification(week,2026);
  return{rawInquirer:{reporters:clone(week2.reporters),teams},rawOverview:overview};
};

const week3raw=rawForWeek(3),w3class=inquirerWeekClassification(3,2026);
// Deliberately create one humiliating team total so forward voice coverage proves
// that reporters interpret a disaster instead of merely labeling it below average.
week3raw.rawInquirer.teams[0].points=44.4;
week3raw.rawInquirer.teams[0].opponent_points=Math.max(120,Number(week3raw.rawInquirer.teams[0].opponent_points)||0);
week3raw.rawInquirer.teams[0].won=false;
let week3=null,quality=null,lastQuality=null;
for(let salt=0;salt<8;salt++){
  const edited=applyInquirerEditorialV32({season:2026,week:3,...week3raw,previousEdition:week2,weekClassification:w3class,variationSalt:salt});
  const candidate={available:true,season:2026,week:3,inquirer_version:FORWARD_INQUIRER_VERSION,editorial_revision:FORWARD_EDITORIAL_REVISION,teams:edited.inquirer.teams,league_overview:edited.leagueOverview,editorial_generation:{variation_salt:salt}};
  const q=evaluateInquirerEditionQuality(candidate,week2);lastQuality=q;
  if(q.ok){week3=candidate;quality=q;break}
}
assert.ok(week3,'Forward engine must find a non-copying Week 3 variant within the live retry budget; last quality='+JSON.stringify(lastQuality));
assert.equal(week3.teams.length,32);
assert.equal(week3.inquirer_version,32);
assert.equal(week3.editorial_revision,1);
assert.match(week3.league_overview.headline,/Week 3/);
assert.ok(week3.teams.every(t=>Number(t.inquirer_article?.week)===3),'Every Week 3 team article must carry the current week');
const w3copy=[...week3.teams.flatMap(t=>t.inquirer_article?.paragraphs||[]),...(week3.league_overview?.sections||[]).flatMap(s=>s.paragraphs||[])].join(' ');
assert.doesNotMatch(w3copy,/\bWeek 2 gets its own newspaper\b/i,'Forward edition must not retain Week 2 publication framing');
assert.doesNotMatch(w3copy,/enough of a jump to make that old baseline worth reopening|real departure from the established level|baseline worth reopening/i,'Forward player history should be interpreted, not narrated as a dry baseline delta');

const brutal=week3.teams.find(t=>String(t.roster_id)===String(week3raw.rawInquirer.teams[0].roster_id));
const brutalCopy=(brutal?.inquirer_article?.paragraphs||[]).join(' ');
assert.match(brutalCopy,/how .*possible|embarrass|collapse|crater|smoking crater|dreadful|sabotage|apology with decimal places|lineup-wide failure|group project|coordinated/i,'A catastrophic team score must receive blunt, emotionally engaged commentary');

const breakout=(week3.league_overview?.hot_takes||[]).find(x=>/breakout player to watch/i.test(String(x?.title||'')));
assert.ok(breakout,'Forward recap must retain Breakout Player to Watch');
assert.doesNotMatch(String(breakout.take||''),/\b(?:section|article|watch list|classification|evidence|file|copy desk|headline|newsroom|editorial)\b/i,'Breakout commentary must not expose newsroom/process/meta language');
assert.match(String(breakout.take||''),/fantasy|lineup|opponent|league|Sunday|production|weapon|rival/i,'Breakout commentary must interpret fantasy consequence rather than just state a statistical delta');

fs.writeFileSync('/tmp/inquirer-forward-v32-week3.json',JSON.stringify(week3,null,2)+'\n');

const week9raw=rawForWeek(9),week9=applyInquirerEditorialV32({season:2026,week:9,...week9raw,previousEdition:week3,weekClassification:inquirerWeekClassification(9,2026),variationSalt:2});
assert.ok((week9.leagueOverview.sections||[]).some(s=>s.heading==='The Playoff Race Is No Longer Background Noise'),'Late regular-season edition must introduce explicit playoff-race coverage');

const week14raw=rawForWeek(14);
week14raw.rawInquirer.teams=week14raw.rawInquirer.teams.map((t,i)=>({...t,playoff_context:{
  made_playoffs:i<16,
  alive:i<8,
  eliminated:i>=8&&i<16,
  eliminated_week:i>=8&&i<16?14:null,
  eliminated_this_week:i>=8&&i<16,
  advanced_this_week:i<8,
  champion:false,
  runner_up:false,
  current_round:(t.conference?t.conference+' ':'')+'Wildcard Round',
  next_round:(t.conference?t.conference+' ':'')+'Divisional Round'
}}));
const week14=applyInquirerEditorialV32({season:2026,week:14,...week14raw,previousEdition:week3,weekClassification:inquirerWeekClassification(14,2026),variationSalt:3});
const playoffCopy=[...week14.inquirer.teams.flatMap(t=>t.inquirer_article?.paragraphs||[]),...(week14.leagueOverview.sections||[]).flatMap(s=>s.paragraphs||[])].join(' ');
assert.match(playoffCopy,/eliminated from championship contention/i,'Wildcard edition must identify eliminated playoff teams');
assert.match(playoffCopy,/advances to .*Divisional Round/i,'Wildcard edition must identify teams advancing to the Divisional Round');
assert.ok((week14.leagueOverview.sections||[]).some(s=>/Wildcard Round: Who Advanced and Who Went Home/.test(String(s.heading||''))),'Wildcard recap must include explicit round advancement/elimination section');

console.log(JSON.stringify({ok:true,version:FORWARD_INQUIRER_VERSION,revision:FORWARD_EDITORIAL_REVISION,week3_quality:quality?.metrics||{},week3_headline:week3.league_overview.headline,brutality:true,breakout_meta_free:true,week9_playoff_race:true,week14_round:true},null,2));
