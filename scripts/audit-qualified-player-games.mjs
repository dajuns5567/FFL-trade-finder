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
const isPlayerRow=(id,players)=>Object.prototype.hasOwnProperty.call(players,id);

const manifest=await read(path.join(ROOT,'manifest.json'));
const scoring=manifest?.currentLeagueScoringSettings||{};
let players={};try{players=await read(path.join(ROOT,'players.json'))}catch{}
if(!Object.keys(players).length)throw new Error('players.json is required and must be non-empty for an independent qualification audit');

const report={
 summary:{playerGames:0,qualified:0,rejected:0,nonPlayerRowsIgnored:0,offense:{playerGames:0,qualified:0,rejected:0,aggregateMismatches:0},idp:{playerGames:0,qualified:0,rejected:0,aggregateMismatches:0},aggregateMismatches:0},
 years:{},aggregateMismatches:[],distributionAudit:{targets:{}},idpPopulationAudit:{players:{}}
};
const targetNames=new Set(['Maxx Crosby','Myles Garrett','Roquan Smith','Dallas Turner']);
const targetIds=new Map(Object.entries(players).filter(([,p])=>targetNames.has(String(p?.full_name||''))).map(([id,p])=>[id,p.full_name]));
for(const [id,name] of targetIds)report.distributionAudit.targets[id]={id,name,seasons:{},combinedGames:[]};
const percentile=(a,p)=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),i=(s.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return s[lo]+(s[hi]-s[lo])*(i-lo)};
const dist=a=>{const x=a.map(Number).filter(Number.isFinite),n=x.length;if(!n)return null;const s=[...x].sort((a,b)=>a-b),sum=s.reduce((a,b)=>a+b,0),mean=sum/n,median=percentile(s,.5),trim=Math.floor(n*.10),t=trim&&n>2*trim?s.slice(trim,n-trim):s,trimmedMean=t.reduce((a,b)=>a+b,0)/t.length,variance=s.reduce((z,v)=>z+(v-mean)**2,0)/n,best=[...s].sort((a,b)=>b-a);return{games:n,mean,median,trimmedMean,p25:percentile(s,.25),p75:percentile(s,.75),p90:percentile(s,.90),max:best[0],stdDev:Math.sqrt(variance),meanMinusMedian:mean-median,meanMedianRatio:median?mean/median:null,avgExcludingBest:n>1?(sum-best[0])/(n-1):null,avgExcludingBestTwo:n>2?(sum-best[0]-best[1])/(n-2):null,bestGameShare:sum?best[0]/sum:null,bestTwoShare:sum?(best[0]+(best[1]||0))/sum:null}};


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
   if(phase==='defense'&&q.qualified){
    const p=report.idpPopulationAudit.players[id]||(report.idpPopulationAudit.players[id]={id,name:meta?.full_name||null,position:meta?.position||null,age:meta?.age??null,games:[]});
    p.games.push({year,week,points:q.points,snapShare:q.snapShare});
   }
   if(targetIds.has(id)){
    const t=report.distributionAudit.targets[id],season=t.seasons[year]||(t.seasons[year]={rows:[]});
    season.rows.push({week,points:q.points,snapShare:q.snapShare,qualified:q.qualified});
    if(q.qualified)t.combinedGames.push({year,week,points:q.points,snapShare:q.snapShare});
   }
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
for(const t of Object.values(report.distributionAudit.targets)){
 for(const [year,s] of Object.entries(t.seasons)){
  const qualified=s.rows.filter(r=>r.qualified);
  s.qualifyingGames=qualified.length;s.distribution=dist(qualified.map(r=>r.points));
 }
 t.combinedDistribution=dist(t.combinedGames.map(r=>r.points));
}
for(const p of Object.values(report.idpPopulationAudit.players)){
 const g=p.games,pts=g.map(x=>x.points),snaps=g.map(x=>x.snapShare).filter(Number.isFinite);
 p.distribution=dist(pts);p.snapDistribution=dist(snaps);
 p.opportunity={games:g.length,ge50:g.filter(x=>Number(x.snapShare)>=.50).length,ge70:g.filter(x=>Number(x.snapShare)>=.70).length,ge80:g.filter(x=>Number(x.snapShare)>=.80).length,pointsGe50:dist(g.filter(x=>Number(x.snapShare)>=.50).map(x=>x.points)),pointsGe70:dist(g.filter(x=>Number(x.snapShare)>=.70).map(x=>x.points)),pointsGe80:dist(g.filter(x=>Number(x.snapShare)>=.80).map(x=>x.points))};
 p.bySeason={};
 for(const y of years){const yg=g.filter(x=>x.year===y);if(!yg.length)continue;const ys=yg.map(x=>x.snapShare).filter(Number.isFinite);p.bySeason[y]={games:yg.length,distribution:dist(yg.map(x=>x.points)),snapDistribution:dist(ys),ge50:yg.filter(x=>Number(x.snapShare)>=.50).length,ge70:yg.filter(x=>Number(x.snapShare)>=.70).length};}
 delete p.games;
}
report.idpPopulationAudit.playerCount=Object.keys(report.idpPopulationAudit.players).length;
const roleOf=p=>{const pos=String(p.position||'').toUpperCase();if(['LB','ILB','MLB','OLB'].includes(pos))return 'LB';if(['DL','DE','EDGE'].includes(pos))return 'EDGE';if(['DT','NT'].includes(pos))return 'INTERIOR';if(['DB','CB','S','SS','FS'].includes(pos))return 'DB';return 'OTHER'};
report.idpPopulationAudit.roles={};
for(const p of Object.values(report.idpPopulationAudit.players)){
 const role=roleOf(p),r=report.idpPopulationAudit.roles[role]||(report.idpPopulationAudit.roles[role]={players:0,allMeans:[],allMedians:[],ge70Means:[],ge70Medians:[],ge70GameCounts:[]});
 r.players++;if(p.distribution){r.allMeans.push(p.distribution.mean);r.allMedians.push(p.distribution.median)}
 if(p.opportunity?.pointsGe70){r.ge70Means.push(p.opportunity.pointsGe70.mean);r.ge70Medians.push(p.opportunity.pointsGe70.median);r.ge70GameCounts.push(p.opportunity.ge70)}
}
for(const r of Object.values(report.idpPopulationAudit.roles)){
 r.playerMeanDistribution=dist(r.allMeans);r.playerMedianDistribution=dist(r.allMedians);r.ge70PlayerMeanDistribution=dist(r.ge70Means);r.ge70PlayerMedianDistribution=dist(r.ge70Medians);r.ge70GameCountDistribution=dist(r.ge70GameCounts);
 delete r.allMeans;delete r.allMedians;delete r.ge70Means;delete r.ge70Medians;delete r.ge70GameCounts;
}
report.distributionAudit.requestedNames=[...targetNames];
report.distributionAudit.foundNames=[...targetIds.values()];
console.log(JSON.stringify(report,null,2));
