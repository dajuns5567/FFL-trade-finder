import fs from 'node:fs/promises';
import path from 'node:path';
import {rows,qualifiesCurrentSeasonGame,aggregateWeeks} from '../netlify/functions/ppr-scoring.mjs';

const ROOT=path.resolve(process.env.SLEEPER_DATA_DIR||'data/sleeper');
const years=[2026,2025,2024,2023];
const normalizeTeamCode=v=>{const s=String(v||'').trim().toUpperCase();return({JAC:'JAX',WAS:'WSH',LA:'LAR',OAK:'LV',SD:'LAC',STL:'LAR'}[s]||s)};
const snapCount=(stats,phase)=>{for(const k of phase==='defense'?['def_snp','def_snaps','defensive_snaps','snaps_defense']:['off_snp','off_snaps','offensive_snaps','snaps_offense']){const n=Number(stats?.[k]);if(Number.isFinite(n)&&n>=0)return n}return null};
const playerPhase=meta=>[meta?.position,...(meta?.fantasy_positions||[])].filter(Boolean).map(x=>String(x).toUpperCase()).some(x=>['DL','DE','DT','NT','EDGE','LB','ILB','MLB','OLB','DB','CB','S','SS','FS','IDP'].includes(x))?'defense':'offense';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));

const manifest=await read(path.join(ROOT,'manifest.json'));
const scoring=manifest?.currentLeagueScoringSettings||{};
let players={};try{players=await read(path.join(ROOT,'players.json'))}catch{}
const report={summary:{playerGames:0,qualified:0,rejected:0,ruleMismatches:0,aggregateMismatches:0},years:{},ruleMismatches:[],aggregateMismatches:[]};

for(const year of years){
 let weekly;try{weekly=await read(path.join(ROOT,String(year),'weekly-stats.json'))}catch{continue}
 const qualified={};let playerGames=0,kept=0,rejected=0;
 for(let week=1;week<=18;week++){
  const parsed=rows(weekly?.[week]),teamMax=new Map();
  for(const [id,s] of parsed){const meta=players[id]||{},team=normalizeTeamCode(meta.team),phase=playerPhase(meta),n=snapCount(s,phase);if(!team||n==null)continue;const k=team+'|'+phase;teamMax.set(k,Math.max(Number(teamMax.get(k)||0),n))}
  const keep={};
  for(const [id,s] of parsed){playerGames++;const meta=players[id]||{},team=normalizeTeamCode(meta.team),phase=playerPhase(meta),q=qualifiesCurrentSeasonGame(s,{phase,teamSnapMax:Number(teamMax.get(team+'|'+phase)||0),scoringSettings:scoring});if(q.qualified){keep[id]=s;kept++}else rejected++}
  qualified[week]=keep;
 }
 const rebuilt=aggregateWeeks(qualified);let stored={};try{stored=await read(path.join(ROOT,String(year),'season-stats.json'))}catch{}
 for(const [id,row] of Object.entries(rebuilt)){const a=Number(row.gp)||0,b=Number(stored?.[id]?.gp)||0;if(a!==b){report.aggregateMismatches.push({year,id,rebuiltQualifyingGames:a,storedQualifyingGames:b});report.summary.aggregateMismatches++}}
 report.years[year]={playerGames,qualified:kept,rejected,rebuiltPlayers:Object.keys(rebuilt).length,storedPlayers:Object.keys(stored).length};report.summary.playerGames+=playerGames;report.summary.qualified+=kept;report.summary.rejected+=rejected;
}
console.log(JSON.stringify(report,null,2));
