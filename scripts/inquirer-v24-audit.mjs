import assert from 'node:assert/strict';
import fs from 'node:fs';
import edition from '../netlify/functions/inquirer-week1-2026-preload.mjs';
import {opponentPreview,playerImpact} from '../netlify/functions/inquirer-reporting-v24.mjs';
import {buildInquirerWeek} from '../netlify/functions/inquirer-reporters.mjs';
const words=s=>s.split(/\s+/).filter(Boolean).length;
const recap=edition.league_overview.sections.flatMap(s=>s.paragraphs).join(' ');
assert.ok(Number(edition.inquirer_version)>=24,'V24 audit requires Inquirer V24 or newer');
let maximum=0;
const repeated=new Map();
for(const t of edition.teams){
  const a=t.inquirer_article,body=a.paragraphs.join(' ');maximum=Math.max(maximum,words(body));
  assert.doesNotMatch(body,/\bMIDA\b|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}|generic approval|subtlety has been cancelled|redemption applications/i);
  if(t.mida_outlook)assert.equal(a.sources.mida.as_of,t.mida_outlook.source_date);
  if(Number(edition.inquirer_version)===24)assert.ok(recap.includes(t.team_name),'V24 exhaustive recap misses '+t.team_name);
  const o=t.next_opponent_roster,outlook=a.sections.find(s=>s.kind==='outlook').paragraphs.join(' ');
  if(o){
    const scored=o.players.filter(p=>p.season_games>0).sort((a,b)=>b.season_fantasy_points-a.season_fantasy_points)[0],valued=o.players.filter(p=>p.value!=null).sort((a,b)=>b.value-a.value)[0];
    if(scored)assert.ok(outlook.includes(scored.name));if(valued)assert.ok(outlook.includes(valued.name));
  }
  for(const sentence of body.split(/(?<=[.!?])\s+/)){if(words(sentence)<14)continue;const key=sentence.trim();repeated.set(key,(repeated.get(key)||0)+1)}
}
if(Number(edition.inquirer_version)>=25){
  const mentioned=edition.teams.filter(t=>recap.includes(String(t.team_name||'').trim()));
  assert.ok(mentioned.length<edition.teams.length,'V25+ Weekly Recap must select consequential stories rather than mention every team by contract');
}
assert.ok(words(recap)>maximum,'Weekly Recap must exceed the longest team article');
const ui=fs.readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
assert.match(ui,/.lh-hot-takes\{[^}]*background:transparent/);
assert.ok(ui.includes('a.sources?.mida'));
const t={team_name:'Test',points:100,opponent_points:99,opponent_name:'Other'},p={name:'Runner',points:20,projected:10,position:'RB',real_stats:{rush_att:20}};
assert.match(playerImpact(t,p),/20 carries/);assert.match(playerImpact(t,p),/exceeded the 1.0-point winning margin/);
assert.equal(opponentPreview({}),null);
const sample=structuredClone(edition.teams.slice(0,2));sample[0].next_opponent_roster_id=sample[1].roster_id;sample[1].roster_player_ids=['history-player'];
const history=Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,{'history-player':{points:i+1}}]));
const rebuilt=buildInquirerWeek({season:2026,week:8,teams:sample,players:{'history-player':{full_name:'History Player',position:'RB'}},weeklyStats:history[8],weeklyStatHistory:history,playerValues:{'history-player':5000},scoreFn:stats=>stats.points??null});
const opponent=rebuilt.teams[0].next_opponent_roster.players[0];assert.equal(opponent.season_fantasy_points,36);assert.equal(opponent.season_games,8);assert.equal(opponent.value,5000);
assert.deepEqual([...repeated].filter(([,n])=>n>4),[],'Repeated editorial filler survived across more than four articles');
console.log(JSON.stringify({ok:true,recap_words:words(recap),longest_team_words:maximum,repeated_long_sentences:[...repeated].filter(([,n])=>n>4)}));
