import fs from 'node:fs';
import path from 'node:path';
import {leagueFantasyPoints} from '../netlify/functions/ppr-scoring.mjs';

// Audit exact Sleeper player IDs, not names: names alone cannot establish
// whether a roster ID denotes a duplicate, unrelated homonym, or alias.
const dir=path.resolve(process.argv[2]||'data/sleeper');
const read=f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
const players=read('players.json');
const manifest=read('manifest.json');
const stats=read(path.join(String(manifest.currentSeason),'season-stats.json'));
const requested=new Set(['chris jones','david bailey']);
const normalized=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
const results={source:'read-only-sleeper-id-audit',snapshotGeneratedAt:manifest.generatedAt,
 currentSeason:manifest.currentSeason,completedWeek:manifest.currentSeasonCompletedWeek,
 entries:[]};
for(const [id,p] of Object.entries(players)){
 const full=p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ');
 if(!requested.has(normalized(full)))continue;
 const row=stats[id];
 const gp=Number(row?.gp)||0;
 const leaguePoints=row?leagueFantasyPoints(row,manifest.currentLeagueScoringSettings||{}):null;
 results.entries.push({
  id,full_name:full,position:p.position||null,fantasy_positions:p.fantasy_positions||[],
  team:p.team||null,active:p.active??null,status:p.status||null,
  age:p.age??null,years_exp:p.years_exp??null,
  importedQualifyingGames:gp,
  importedLeaguePoints:leaguePoints,
  importedPpg:gp>0&&Number.isFinite(leaguePoints)?Number((leaguePoints/gp).toFixed(3)):null,
  hasSeasonRow:Boolean(row)
 });
}
results.entries.sort((a,b)=>a.full_name.localeCompare(b.full_name)||a.id.localeCompare(b.id));
results.collisions=Object.fromEntries([...requested].map(name=>
 [name,results.entries.filter(x=>normalized(x.full_name)===name).length]));
console.log(JSON.stringify(results,null,2));
if(!results.entries.length)process.exitCode=1;
