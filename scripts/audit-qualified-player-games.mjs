import fs from 'node:fs/promises';
import path from 'node:path';
import {rows,qualifiesCurrentSeasonGame,aggregateWeeks,leagueFantasyPoints} from '../netlify/functions/ppr-scoring.mjs';
import {buildConsensusComposite} from '../netlify/functions/consensus-composite-v3.mjs';
import {refreshAllSources} from '../netlify/functions/consensus-source-overrides.mjs';

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
try{
 const refresh=await refreshAllSources();
 const cons=buildConsensusComposite(refresh.results,Object.entries(players).map(([id,p])=>({id,name:p?.full_name||'',position:p?.position,positions:p?.fantasy_positions||p?.positions})));
 const byId=cons?.detailsById||{};
 for(const p of Object.values(report.idpPopulationAudit.players)){
  const x=byId[p.id]||{};p.consensus={value:Number(x.consensusCompositeValue??0)||null,rank:Number(x.idpRank??0)||null,sources:x.idpSources||[]};
 }
}catch(e){report.idpPopulationAudit.consensusError=String(e?.message||e)}
const roleOf=p=>{const pos=String(p.position||'').toUpperCase();if(['LB','ILB','MLB','OLB'].includes(pos))return 'LB';if(['DL','DE','EDGE'].includes(pos))return 'EDGE';if(['DT','NT'].includes(pos))return 'INTERIOR';if(['DB','CB','S','SS','FS'].includes(pos))return 'DB';return 'OTHER'};
report.idpPopulationAudit.roles={};
for(const p of Object.values(report.idpPopulationAudit.players)){
 const role=roleOf(p),r=report.idpPopulationAudit.roles[role]||(report.idpPopulationAudit.roles[role]={players:0,allMeans:[],allMedians:[],ge70Means:[],ge70Medians:[],ge70GameCounts:[]});
 r.players++;if(p.distribution){r.allMeans.push(p.distribution.mean);r.allMedians.push(p.distribution.median)}
 if(p.opportunity?.pointsGe70){r.ge70Means.push(p.opportunity.pointsGe70.mean);r.ge70Medians.push(p.opportunity.pointsGe70.median);r.ge70GameCounts.push(p.opportunity.ge70)}
}
for(const r of Object.values(report.idpPopulationAudit.roles)){
 r.playerMeanDistribution=dist(r.allMeans);r.playerMedianDistribution=dist(r.allMedians);r.ge70PlayerMeanDistribution=dist(r.ge70Means);r.ge70PlayerMedianDistribution=dist(r.ge70Medians);r.ge70GameCountDistribution=dist(r.ge70GameCounts);
 r.ge70QualityTiers={meanP25:r.ge70PlayerMeanDistribution?.p25??null,meanMedian:r.ge70PlayerMeanDistribution?.median??null,meanP75:r.ge70PlayerMeanDistribution?.p75??null,meanP90:r.ge70PlayerMeanDistribution?.p90??null,medianP25:r.ge70PlayerMedianDistribution?.p25??null,medianMedian:r.ge70PlayerMedianDistribution?.median??null,medianP75:r.ge70PlayerMedianDistribution?.p75??null,medianP90:r.ge70PlayerMedianDistribution?.p90??null};
 delete r.allMeans;delete r.allMedians;delete r.ge70Means;delete r.ge70Medians;delete r.ge70GameCounts;
}
report.idpPopulationAudit.productionConsensusAlignment={};
for(const role of ['LB','EDGE']){
 const ps=Object.values(report.idpPopulationAudit.players).filter(p=>roleOf(p)===role&&p.opportunity?.pointsGe70&&p.consensus?.value);
 const sorted=[...ps].sort((a,b)=>a.opportunity.pointsGe70.mean-b.opportunity.pointsGe70.mean);
 const n=sorted.length;
 const buckets={P50:sorted.slice(Math.floor(n*.5)),P75:sorted.slice(Math.floor(n*.75)),P90:sorted.slice(Math.floor(n*.9))};
 report.idpPopulationAudit.productionConsensusAlignment[role]={players:n};
 for(const [k,a] of Object.entries(buckets))report.idpPopulationAudit.productionConsensusAlignment[role][k]={players:a.length,productionMean:dist(a.map(p=>p.opportunity.pointsGe70.mean)),consensusValue:dist(a.map(p=>p.consensus.value)),consensusRank:dist(a.map(p=>p.consensus.rank).filter(Number.isFinite))};
}
report.idpPopulationAudit.consensusScoringDisagreement={rows:[]};
for(const p of Object.values(report.idpPopulationAudit.players)){
 const cv=Number(p.consensus?.value),sd=p.opportunity?.pointsGe70||p.distribution;
 if(!Number.isFinite(cv)||!sd||!Number.isFinite(sd.mean))continue;
 const evidence=p.opportunity?.ge70||0,careerGames=p.distribution?.games||0;
 report.idpPopulationAudit.consensusScoringDisagreement.rows.push({id:p.id,name:p.name,position:p.position,age:p.age??null,consensusValue:cv,consensusRank:p.consensus?.rank??null,scoringMean:sd.mean,scoringMedian:sd.median,evidenceGe70:evidence,careerQualifyingGames:careerGames,meanMedianRatio:sd.meanMedianRatio??null});
}
const dr=report.idpPopulationAudit.consensusScoringDisagreement.rows;
const pctRanks=(a,key,asc=true)=>{const s=[...a].filter(x=>Number.isFinite(Number(x[key]))).sort((x,y)=>(Number(x[key])-Number(y[key]))*(asc?1:-1));const m=new Map();s.forEach((x,i)=>m.set(x.id,s.length>1?i/(s.length-1):.5));return m};
const consPct=pctRanks(dr,'consensusValue'),scorePct=pctRanks(dr,'scoringMean');
for(const x of dr){x.consensusPercentile=consPct.get(x.id)??null;x.scoringPercentile=scorePct.get(x.id)??null;x.consensusMinusScoringPercentile=(x.consensusPercentile??0)-(x.scoringPercentile??0);x.evidenceBand=x.evidenceGe70>=16?'high':x.evidenceGe70>=8?'medium':x.evidenceGe70>=1?'low':'none';x.ageBand=Number.isFinite(Number(x.age))?(x.age<=24?'young':x.age<=27?'prime-young':x.age<=30?'prime':'veteran'):'unknown'}
report.idpPopulationAudit.consensusScoringDisagreement.summary={players:dr.length,absoluteGap:dist(dr.map(x=>Math.abs(x.consensusMinusScoringPercentile))),byEvidence:{},byAge:{}};
for(const band of ['low','medium','high']){const a=dr.filter(x=>x.evidenceBand===band);report.idpPopulationAudit.consensusScoringDisagreement.summary.byEvidence[band]={players:a.length,gap:dist(a.map(x=>x.consensusMinusScoringPercentile)),absoluteGap:dist(a.map(x=>Math.abs(x.consensusMinusScoringPercentile)))}}
for(const band of ['young','prime-young','prime','veteran','unknown']){const a=dr.filter(x=>x.ageBand===band);report.idpPopulationAudit.consensusScoringDisagreement.summary.byAge[band]={players:a.length,gap:dist(a.map(x=>x.consensusMinusScoringPercentile)),absoluteGap:dist(a.map(x=>Math.abs(x.consensusMinusScoringPercentile)))}}
report.idpPopulationAudit.consensusScoringDisagreement.extremes=[...dr].sort((a,b)=>Math.abs(b.consensusMinusScoringPercentile)-Math.abs(a.consensusMinusScoringPercentile)).slice(0,50);
delete report.idpPopulationAudit.consensusScoringDisagreement.rows;
report.idpPopulationAudit.v25ScoringCalibration={note:'Exact V25 scoring transform reconstructed from historical qualifying-season PPG evidence; opportunity metrics remain diagnostic overlays.',controls:{},population:{}};
const clampV=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
const qV=(a,p)=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),i=(s.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return s[lo]+(s[hi]-s[lo])*(i-lo)};
const pctV=(a,x)=>{if(!a.length)return .5;let below=0,equal=0;for(const v of a){if(v<x)below++;else if(v===x)equal++}return clampV(.01,(below+.5*equal)/a.length,.99)};
const histRows=[];
for(const p of Object.values(report.idpPopulationAudit.players)){const seasons=Object.entries(p.bySeason||{}).filter(([y,s])=>Number(y)<2026&&s?.distribution?.games>=8).sort((a,b)=>Number(b[0])-Number(a[0])).slice(0,3),w=[.60,.30,.10];if(!seasons.length)continue;let ppg=0,cov=0;for(let i=0;i<seasons.length;i++){ppg+=seasons[i][1].distribution.mean*w[i];cov+=w[i]}histRows.push({p,ppg:ppg/cov,coverage:cov,seasons:seasons.length})}
const histPpg=histRows.map(x=>x.ppg),p50=qV(histPpg,.50),p99=Math.max((p50||0)+.01,qV(histPpg,.99)||0);
report.idpPopulationAudit.v25ScoringCalibration.population={players:histRows.length,p50,p99,ppgDistribution:dist(histPpg)};
const controlSet=new Set(['Maxx Crosby','Myles Garrett','Roquan Smith','Dallas Turner','Aidan Hutchinson','Will Anderson Jr.','Will Anderson','Carson Schwesinger','Jack Campbell','T.J. Watt']);
for(const x of histRows){const p=x.p,ppgPct=pctV(histPpg,x.ppg),relative=clampV(0,(x.ppg-p50)/(p99-p50),1.10),raw=.55*ppgPct+.45*relative;const conf=clampV(0,Math.min(1,x.coverage),1),strength=.45+conf*(raw-.45),value=clampV(180,180+1270*Math.pow(clampV(.08,strength,1),2.70),1500);if(controlSet.has(p.name))report.idpPopulationAudit.v25ScoringCalibration.controls[p.name]={weightedHistoricalPpg:x.ppg,historicalSeasons:x.seasons,coverage:x.coverage,ppgPercentile:ppgPct,relativeAboveP50:relative,rawStrength:raw,diagnosticConfidence:conf,postConfidenceStrength:strength,reconstructedScoringValue:value,currentOpportunity:p.opportunity};}
report.idpPopulationAudit.v25ExactScoringTrace={note:'Exact V21 realScore confidence/weight semantics feeding V25, with V25 historical benchmark transform.',controls:{},population:{}};
const wp=manifest?.weightPlan?.yearWeights||manifest?.weight_plan?.yearWeights||{};
const planned=Object.values(wp).reduce((s,v)=>s+(Number(v)>0?Number(v):0),0)||1;
const currentYear=Number(manifest?.currentSeason||manifest?.current_season||2026);
function exactInput(p){
 const ys=Object.entries(p.bySeason||{}).map(([y,s])=>[Number(y),s]).filter(([y,s])=>s?.distribution?.games>0&&((y===currentYear&&s.distribution.games>=1)||(y!==currentYear&&s.distribution.games>=8)));
 const historical=ys.filter(([y])=>y!==currentYear).sort((a,b)=>b[0]-a[0]),cur=ys.find(([y])=>y===currentYear);
 let samples=[];
 for(const [y,s] of ys){const assigned=Number(wp[y]||0);if(assigned>0)samples.push({season:y,ppg:s.distribution.mean,games:s.distribution.games,assignedWeight:assigned,currentSeason:y===currentYear})}
 const evidenceCoverage=samples.reduce((z,x)=>z+x.assignedWeight,0),currentAssigned=Number(cur?wp[currentYear]||0:0);
 let calc=samples.map(x=>({...x,calcWeight:x.assignedWeight}));
 if(cur){const ht=Math.max(0,planned-currentAssigned),ha=calc.filter(x=>!x.currentSeason).reduce((z,x)=>z+x.assignedWeight,0);calc=calc.map(x=>x.currentSeason?{...x,calcWeight:currentAssigned}:{...x,calcWeight:ha>0?x.assignedWeight*(ht/ha):0})}
 else{const fb=[.60,.30,.10];calc=historical.slice(0,3).map(([y,s],i)=>({season:y,ppg:s.distribution.mean,games:s.distribution.games,assignedWeight:Number(wp[y]||0),calcWeight:fb[i],currentSeason:false}))}
 const calcWeight=calc.reduce((z,x)=>z+x.calcWeight,0),den=cur?planned:calcWeight,ppg=den>0?calc.reduce((z,x)=>z+x.ppg*x.calcWeight,0)/den:0;
 const hc=historical.length>=3?1:historical.length===2?.74:historical.length===1?.42:.20,cc=Math.max(.20,Math.min(1,evidenceCoverage)),cgc=cur?Math.max(.15,Math.min(1,cur[1].distribution.games/14)):1,hb=.66+.34*hc,fill=cur?(1-hc)*.22*cgc:0,confidence=Math.max(.08,Math.min(1,cc*Math.min(1,hb+fill)));
 return{ppg,confidence,evidenceCoverage,historicalSeasons:historical.length,currentGames:cur?.[1]?.distribution?.games||0,samples:calc};
}
const exactRows=[];
for(const p of Object.values(report.idpPopulationAudit.players)){const e=exactInput(p);if(e.historicalSeasons){const hs=Object.entries(p.bySeason||{}).map(([y,s])=>[Number(y),s]).filter(([y,s])=>y!==currentYear&&s?.distribution?.games>=8).sort((a,b)=>b[0]-a[0]).slice(0,3),ww=[.60,.30,.10];let z=0,cov=0;for(let i=0;i<hs.length;i++){z+=hs[i][1].distribution.mean*ww[i];cov+=ww[i]}exactRows.push({p,e,benchmark:z/cov})}}
const bp=exactRows.map(x=>x.benchmark),b50=qV(bp,.50),b99=Math.max(b50+.01,qV(bp,.99)||0);report.idpPopulationAudit.v25ExactScoringTrace.population={players:exactRows.length,p50:b50,p99:b99,benchmarkPpg:dist(bp)};
const ctl=new Set(['Maxx Crosby','Myles Garrett','Roquan Smith','Dallas Turner','Aidan Hutchinson','Will Anderson Jr.','Will Anderson','Carson Schwesinger','Jack Campbell','T.J. Watt']);
for(const x of exactRows){const pct=pctV(bp,x.e.ppg),rel=clampV(0,(x.e.ppg-b50)/(b99-b50),1.10),raw=.55*pct+.45*rel,str=.45+x.e.confidence*(raw-.45),val=clampV(180,180+1270*Math.pow(clampV(.08,str,1),2.70),1500);if(ctl.has(x.p.name))report.idpPopulationAudit.v25ExactScoringTrace.controls[x.p.name]={...x.e,ppgPercentile:pct,relativeAboveP50:rel,rawStrength:raw,strength:str,reconstructedV25ScoringValue:val};}
report.idpPopulationAudit.eliteRoleComparison={};
for(const [role,r] of Object.entries(report.idpPopulationAudit.roles))report.idpPopulationAudit.eliteRoleComparison[role]=r.ge70QualityTiers;
report.distributionAudit.requestedNames=[...targetNames];
report.distributionAudit.foundNames=[...targetIds.values()];
console.log(JSON.stringify(report,null,2));
