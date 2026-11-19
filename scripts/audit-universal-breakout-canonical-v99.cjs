#!/usr/bin/env node
'use strict';
// V99 READ-ONLY canonical Sleeper evidence census.
// Reads source files verbatim; never creates consensus prices or changes player rankings.
// The native pts_ppr/pts_idp columns are *screening proxies*, NOT the league's final
// weighted scoring or a replacement for the approved live V96 valuation engine.
const fs=require('node:fs');
const path=require('node:path');
const {classifyBreakout,auditBreakoutPopulation}=require('./lib/dynasty-breakout-evidence-v99.cjs');
const root=process.env.V99_SLEEPER_DIR||'.tmp/v99-sleeper';
const reportFile=process.env.V99_REPORT_FILE||'.tmp/v99-breakout-report.json';
const parse=(relative)=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const manifest=parse('manifest.json');
const players=parse('players.json');
const current=parse('2026/season-stats.json');
const previous=parse('2025/season-stats.json');
if(manifest?.ok!==true||Number(manifest.currentSeason)!==2026||
  Number(manifest.currentSeasonCompletedWeek)<10)
  throw Error('Reject missing or unfinalized canonical 2026 Week 10 evidence');
if(!manifest.generatedAt||!Number.isFinite(Date.parse(manifest.generatedAt)))
  throw Error('Reject missing canonical generation timestamp');
const roles=new Set(['QB','RB','WR','TE','DE','EDGE','DL','DT','NT','LB','ILB','MLB','OLB','S','SS','FS','CB','DB']);
const offense=new Set(['QB','RB','WR','TE']);
function roleOf(p){
  const v=String(p?.position||'').toUpperCase();
  if(!roles.has(v))return null;
  if(offense.has(v))return v;
  if(['DE','EDGE','DL'].includes(v))return 'EDGE';
  if(['DT','NT'].includes(v))return 'INTERIOR';
  if(['LB','ILB','MLB','OLB'].includes(v))return 'LB';
  return 'DB';
}
const num=x=>x==null||x===''||!Number.isFinite(Number(x))?null:Number(x);
function season(s,role) {
  if(!s)return null;
  const games=num(s.gp),points=num(offense.has(role)?s.pts_ppr:s.pts_idp);
  const snap=num(offense.has(role)?s.off_snp:s.def_snp);
  const teamSnap=num(offense.has(role)?s.tm_off_snp:s.tm_def_snp);
  const share=snap!=null&&teamSnap!=null&&teamSnap>0?Math.min(1,snap/teamSnap):null;
  return {games,points,ppg:games>0&&points!=null?points/games:null,
    snapShare:share,starts:num(s.gs),
    // Aggregate season GP and snaps are participation evidence, not proof
    // of per-week league scoring qualification or positional starting status.
    scoreMethod:offense.has(role)?'Sleeper-native-PPR-proxy':'Sleeper-native-IDP-proxy'};
}
function percentile(values,x){
  if(!values.length||x==null)return null;
  let count=0;for(const n of values)if(n<=x)count++;
  return Math.min(1,Math.max(0,(count-.5)/values.length));
}
const raw=[];
for(const [id,p] of Object.entries(players)){
  const role=roleOf(p);if(!role)continue;
  const a=season(current[id],role),b=season(previous[id],role);
  if(!a?.games||a.games<1||a.ppg==null)continue;
  raw.push({id,name:p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ')||id,
    position:role,nflPosition:p.position,age:num(p.age),yearsExp:num(p.years_exp),
    current:a,previous:b});
}
const distributions={};
for(const row of raw){
  const a=row.current;
  if(a.games>=6&&a.ppg!=null&&a.snapShare!=null&&a.snapShare>=.18)
    (distributions[row.position]??=[]).push(a.ppg);
}
const rows=raw.map(r=>({...r,current:{...r.current,
  positionPpgPercentile:(distributions[r.position]||[]).length>=15?
    percentile(distributions[r.position],r.current.ppg):null},
  // Scoring confidence comes from live V96, not a season-score proxy.
  // Mark absent rather than fabricate a derived confidence score.
  scoringConfidence:null,consensusValue:null,consensusSourceCount:null
}));
const population=auditBreakoutPopulation(rows);
const highlights=rows.filter(r=>['12978'].includes(r.id)).map(r=>({
  ...classifyBreakout(r),name:r.name,
  currentProxyPoints:r.current.points,previousProxyPoints:r.previous?.points,
  currentStarts:r.current.starts,distributionSize:(distributions[r.position]||[]).length
}));
const summary={
  contract:'V99 canonical Sleeper evidence screening; NO valuation or market consensus',
  generatedAt:manifest.generatedAt,completedWeek:manifest.currentSeasonCompletedWeek,
  scoredUniverse:rows.length,roles:Object.fromEntries(Object.entries(distributions).map(([k,v])=>[k,v.length])),
  candidates:population.candidates,byFamily:population.byFamily,
  consensusCoverage:'not available from Sleeper alone; cannot infer absence of dynasty coverage',
  leagueScoring:'not applied; native season PPR/IDP points are an audit-only proxy',
  snapMeaning:'season cumulative participation share, not weekly role or depth chart verification',
  highlights,
  // Include all candidate IDs for reproducibility without publishing invented values.
  candidatesList:population.rows.map(a=>({
    id:a.id,name:raw.find(r=>r.id===a.id)?.name||a.id,position:a.position,
    level:a.level,currentGames:a.currentGames,currentPpg:a.currentPpg,
    previousPpg:a.previousPpg,positionPercentile:a.positionPpgPercentile,
    snapShareDelta:a.snapShareDelta,roleOpportunity:a.roleOpportunity,
    evidenceStrength:a.evidenceStrength,proposedValueAdjustment:0
  }))
};
if(rows.length<500)throw Error('Incomplete Sleeper player evidence universe');
if(Object.keys(distributions).length<7)throw Error('Incomplete positional distributions');
if(!highlights.length||highlights[0].currentGames<8)throw Error('Missing 2026 Ponder evidence: fail closed');
fs.mkdirSync(path.dirname(reportFile),{recursive:true});
fs.writeFileSync(reportFile,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({contract:summary.contract,
  generatedAt:summary.generatedAt,scoredUniverse:summary.scoredUniverse,
  candidates:summary.candidates,byFamily:summary.byFamily,
  roles:summary.roles,highlights:summary.highlights,
  candidateSample:summary.candidatesList.slice(0,18)},null,2));
