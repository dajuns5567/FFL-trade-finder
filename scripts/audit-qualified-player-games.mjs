import fs from 'node:fs/promises';
import path from 'node:path';
import {rows,qualifiesCurrentSeasonGame,aggregateWeeks,leagueFantasyPoints} from '../netlify/functions/ppr-scoring.mjs';

const ROOT=path.resolve(process.env.SLEEPER_DATA_DIR||'data/sleeper');
const years=[2026,2025,2024,2023];
const IDP_POSITIONS=new Set(['DL','DE','DT','NT','EDGE','LB','ILB','MLB','OLB','DB','CB','S','SS','FS','IDP']);
const normalizeTeamCode=v=>{const s=String(v||'').trim().toUpperCase();return({JAC:'JAX',WAS:'WSH',LA:'LAR',OAK:'LV',SD:'LAC',STL:'LAR'}[s]||s)};
const snapCount=(stats,phase)=>{for(const k of phase==='defense'?['def_snp','def_snaps','defensive_snaps','snaps_defense']:['off_snp','off_snaps','offensive_snaps','snaps_offense']){const n=Number(stats?.[k]);if(Number.isFinite(n)&&n>=0)return n}return null};
const playerPhase=meta=>[meta?.position,...(meta?.fantasy_positions||[])].filter(Boolean).map(x=>String(x).toUpperCase()).some(x=>IDP_POSITIONS.has(x))?'defense':'offense';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const same=(a,b,tol=1e-6)=>Math.abs(num(a)-num(b))<=tol;
const add=(obj,key,n)=>obj[key]=num(obj[key])+num(n);
const isPlayerRow=(id,players)=>{if(!Object.prototype.hasOwnProperty.call(players,id))return false;const meta=players[id]||{},pos=String(meta.position||'').toUpperCase(),fps=(meta.fantasy_positions||[]).map(x=>String(x).toUpperCase());return !String(id).startsWith('TEAM_')&&!['DEF','DST'].includes(pos)&&!fps.some(x=>x==='DEF'||x==='DST')};

const manifest=await read(path.join(ROOT,'manifest.json'));
const scoring=manifest?.currentLeagueScoringSettings||{};
let players={};try{players=await read(path.join(ROOT,'players.json'))}catch{}
if(!Object.keys(players).length)throw new Error('players.json is required and must be non-empty for an independent qualification audit');

const report={
 summary:{playerGames:0,qualified:0,rejected:0,nonPlayerRowsIgnored:0,offense:{playerGames:0,qualified:0,rejected:0,aggregateMismatches:0},idp:{playerGames:0,qualified:0,rejected:0,aggregateMismatches:0},aggregateMismatches:0},
 years:{},aggregateMismatches:[]
};

for(const year of years){
 let weekly;try{weekly=await read(path.join(ROOT,String(year),'weekly-stats.json'))}catch{continue}
 let stored={};try{stored=await read(path.join(ROOT,String(year),'season-stats.json'))}catch{}
 const qualified={},rebuiltLeaguePoints={},phaseById={};
 const counts={offense:{playerGames:0,qualified:0,rejected:0},idp:{playerGames:0,qualified:0,rejected:0},nonPlayerRowsIgnored:0};

 for(let week=1;week<=18;week++){
  const parsed=rows(weekly?.[week]),teamMax=new Map();
  for(const [id,s] of parsed){
   if(!isPlayerRow(id,players)){counts.nonPlayerRowsIgnored++;continue}
   const meta=players[id],team=normalizeTeamCode(meta.team),phase=playerPhase(meta),n=snapCount(s,phase);
   phaseById[id]=phase;
   if(!team||n==null)continue;
   const k=team+'|'+phase;teamMax.set(k,Math.max(num(teamMax.get(k)),n));
  }
  const keep={};
  for(const [id,s] of parsed){
   if(!isPlayerRow(id,players))continue;
   const meta=players[id],team=normalizeTeamCode(meta.team),phase=phaseById[id]||playerPhase(meta);
   counts[phase==='defense'?'idp':'offense'].playerGames++;
   const q=qualifiesCurrentSeasonGame(s,{phase,teamSnapMax:num(teamMax.get(team+'|'+phase)),scoringSettings:scoring});
   if(q.qualified){
    keep[id]=s;
    counts[phase==='defense'?'idp':'offense'].qualified++;
    add(rebuiltLeaguePoints,id,leagueFantasyPoints(s,scoring));
   }else counts[phase==='defense'?'idp':'offense'].rejected++;
  }
  qualified[week]=keep;
 }

 const rebuiltAll=aggregateWeeks(qualified);
 // Historical stored season-stats intentionally omit players with <8 qualifying games.
 const rebuilt=year===Number(manifest?.currentSeason)?rebuiltAll:Object.fromEntries(Object.entries(rebuiltAll).filter(([,row])=>num(row?.gp)>=num(manifest?.qualifyingHistoricalSeasonMinimumGames||8)));
 const ids=new Set([...Object.keys(rebuilt),...Object.keys(stored)]);
 const mismatches=[];

 for(const id of ids){
  if(!isPlayerRow(id,players))continue;
  const phase=phaseById[id]||playerPhase(players[id]),bucket=phase==='defense'?'idp':'offense';
  const r=rebuilt[id],s=stored[id];
  const rebuiltGames=num(r?.gp),storedGames=num(s?.gp);
  // pts_ppr is canonical for offense aggregates. IDP canonical fantasy points are reconstructed
  // from league scoring because Sleeper season rows may not expose them as pts_ppr.
  const rebuiltPoints=bucket==='idp'?num(rebuiltLeaguePoints[id]):num(r?.pts_ppr);
  const storedPoints=bucket==='idp'?leagueFantasyPoints(s||{},scoring):num(s?.pts_ppr);
  const gamesMatch=rebuiltGames===storedGames,pointsMatch=same(rebuiltPoints,storedPoints);
  if(!gamesMatch||!pointsMatch){
   const item={year,id,name:players[id]?.full_name||null,phase,bucket,rebuiltQualifyingGames:rebuiltGames,storedQualifyingGames:storedGames,rebuiltQualifyingPoints:Number(rebuiltPoints.toFixed(4)),storedQualifyingPoints:Number(storedPoints.toFixed(4)),gamesMatch,pointsMatch};
   mismatches.push(item);report.aggregateMismatches.push(item);report.summary.aggregateMismatches++;report.summary[bucket].aggregateMismatches++;
  }
 }

 report.years[year]={...counts,rebuiltPlayers:Object.keys(rebuilt).length,storedPlayers:Object.keys(stored).length,aggregateMismatches:mismatches.length};
 report.summary.nonPlayerRowsIgnored+=counts.nonPlayerRowsIgnored;
 for(const bucket of ['offense','idp'])for(const key of ['playerGames','qualified','rejected']){report.summary[bucket][key]+=counts[bucket][key];report.summary[key]+=counts[bucket][key]}
}
console.log(JSON.stringify(report,null,2));
