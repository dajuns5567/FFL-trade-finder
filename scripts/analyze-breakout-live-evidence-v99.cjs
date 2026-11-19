#!/usr/bin/env node
'use strict';
// V99 research-only: join the already-accepted baseline snapshot, live-scored
// dynasty evidence, and immutable Sleeper flags. No site or archive writes.
const fs=require('node:fs'),path=require('node:path');
const {scenario}=require('./lib/breakout-context-scenario-v99.cjs');
const snapshot=JSON.parse(fs.readFileSync(process.env.V99_V96_SNAPSHOT||'.tmp/v99-v96-snapshot.json','utf8'));
const live=JSON.parse(fs.readFileSync(process.env.V99_LIVE_EVIDENCE_FILE||'.tmp/v99-live-evidence.json','utf8'));
const compare=JSON.parse(fs.readFileSync(process.env.V99_COMPARISON_FILE||'.tmp/v99-v96-breakout-comparison.json','utf8'));
const accepted='4d276527c6e7a724de55e4a7fd2c167887fa3ea8';
if(snapshot?.provenance?.git_commit!==accepted||live.sourceCommit!==accepted||
  compare.valuationSource!==accepted||live.canonicalParity!=='exact'||
  snapshot?.provenance?.canonical_parity!=='exact'||compare.parity!=='exact')
  throw Error('V99 live and historical acceptance evidence diverged from V96');
if(live.valuationModel!==snapshot.valuation_model||live.consensusSources<7||
  !Array.isArray(live.rows)||live.rows.length<700)
  throw Error('Live model consensus, or scoring evidence incomplete');
const byId=new Map(live.rows.map(r=>[String(r.id),r]));
if(byId.size!==live.rows.length)throw Error('Duplicate live player IDs');
const ranked=snapshot.rows;
if(!Array.isArray(ranked)||ranked.length<700)throw Error('Incomplete V96 ranking baseline');
const byRank=new Map(ranked.map(r=>[String(r.id),r]));
const findings=[];
for(const c of compare.matchedCandidates||[]){
  const id=String(c.id),r=byId.get(id),base=byRank.get(id);
  if(!r||!base)throw Error('Missing evidence for candidate '+id);
  if(Number(r.baselineValue)!==Number(base.value)||
    Number(r.overall)!==Number(base.overall))
    throw Error('V99 valuation mismatch for '+id);
  const test=scenario(c,r);
  findings.push({id,name:c.name,position:c.position,overall:c.overall,
    baselineValue:c.canonicalValue,priority:c.reviewPriority?.priority,
    nativeEvidence:{games:c.currentGames,ppg:c.currentPpg,
      positionPercentile:c.positionPercentile,snapShareDelta:c.snapShareDelta},
    liveEvidence:{leaguePpg:r.leaguePpg,qualifyingSeasons:r.qualifyingSeasons,
      scoringConfidence:r.scoreConfidence,consensus:r.consensusValue,
      sources:r.sources,sourceCount:r.sourceCount},
    scenario:test});
}
if(findings.length!==compare.candidates)throw Error('Candidate population incomplete');
const included=findings.filter(f=>f.scenario.eligible);
const sensitivity=ranked.map(r=>{
  const found=findings.find(f=>String(f.id)===String(r.id));
  return{id:String(r.id),group:String(r.pos),value:Number(r.value)+(found?.scenario.delta||0),
    baseline:Number(r.value),baselineRank:Number(r.overall)};
}).sort((a,b)=>b.value-a.value||a.baselineRank-b.baselineRank);
const idpTop100=sensitivity.slice(0,100).filter(r=>r.group==='IDP').length;
const baselineTop100=ranked.slice(0,100).filter(r=>r.pos==='IDP').length;
const rank=new Map(sensitivity.map((r,i)=>[r.id,i+1]));
const shifts=findings.map(f=>({...f,
  sensitivityOverallRank:rank.get(f.id),
  sensitivityRankShift:Number(f.overall)-Number(rank.get(f.id))
}));
if(idpTop100<8||idpTop100>15||Math.abs(idpTop100-baselineTop100)>1)
  throw Error('Bounded sensitivity unexpectedly changes accepted IDP balance');
if(included.some(f=>f.scenario.family==='offense'&&f.scenario.delta>f.scenario.consensus*.015+1e-7))
  throw Error('Offense dynasty consensus anchor exceeded');
const report={contract:'v99-live-consensus-league-scoring-sensitivity-readonly',
  sourceCommit:accepted,leagueValuationModel:live.valuationModel,
  liveConsensusSources:live.consensusSources,
  players:ranked.length,candidates:findings.length,eligible:included.length,
  excluded:findings.length-included.length,
  idpTop100Baseline:baselineTop100,idpTop100Sensitivity:idpTop100,
  changesAppliedToSite:false,confirmedMarketMispricings:0,
  caveats:['Sensitivity only, not an approved market-price recommendation',
   'Native Sleeper season percentiles screen candidates, not league-specific scores',
   'No unknown dynasty consensus values generated','Role based only on season-level snap participation'],
  findings:shifts.sort((a,b)=>(a.priority==='high'?0:1)-(b.priority==='high'?0:1)||
    b.scenario.delta-a.scenario.delta)};
const out=process.env.V99_SENSITIVITY_REPORT||'.tmp/v99-breakout-context-sensitivity.json';
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({contract:report.contract,players:report.players,
  candidates:report.candidates,eligible:report.eligible,
  idpTop100Baseline:baselineTop100,idpTop100Sensitivity:idpTop100,
  highPriority:report.findings.filter(x=>x.priority==='high').map(x=>({
    name:x.name,baselineValue:x.baselineValue,overall:x.overall,
    leaguePpg:x.liveEvidence.leaguePpg,sourceCount:x.liveEvidence.sourceCount,
    scenario:x.scenario,sensitivityOverallRank:x.sensitivityOverallRank
  }))},null,2));
