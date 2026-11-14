import { chromium } from 'playwright';

const target=process.env.OFFENSE_AUDIT_URL||'https://deploy-preview-460--precious-dango-fb4633.netlify.app';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 page.setDefaultTimeout(180000);
 const errors=[];
 page.on('pageerror',e=>{if(errors.length<12)errors.push(String(e?.message||e))});
 const navigation=await page.goto(target,{waitUntil:'domcontentloaded',timeout:100000});
 if(!navigation?.ok())throw Error('Preview HTTP '+navigation?.status());
 try{
  await page.waitForFunction(()=>{
   try{window.fllStateBridgeV141?.syncState?.()}catch{}
   const s=window.state||{};
   return Object.keys(s.players||{}).length>500&&
    Object.keys(s.rankings||{}).length>=3&&
    typeof window.fflOffenseSourceAuditV51?.build==='function'&&
    typeof window.ensureMaster==='function'&&
    window.__fllValueRefresh?.inFlight===false;
  },null,{timeout:180000});
 }catch(e){console.log('READINESS_WARNING',String(e?.message||e))}
 const report=await page.evaluate(()=>{
  try{window.fllStateBridgeV141?.syncState?.()}catch{}
  const s=window.state||{};
  const names=['denzel boston','michael wilson'];
  const norm=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const candidates=Object.entries(s.players||{}).filter(([id,p])=>names.includes(norm(p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' '))));
  const rows=typeof window.ensureMaster==='function'?window.ensureMaster():[];
  const audit=window.fflOffenseSourceAuditV51?.build?.({
   players:s.players,consensusComposite:s.consensusComposite,rankings:s.rankings,
   masterRows:rows,capturedAt:new Date().toISOString()
  });
  const output=candidates.map(([id,p])=>{
   const r=audit?.players?.find(x=>x.id===id)||null;
   const model=rows.find(x=>String(x?.x?.id)===id)||null;
   const h=(typeof window.offenseScoringAudit==='function')?window.offenseScoringAudit(id):null;
   return {id,name:p.full_name||[p.first_name,p.last_name].join(' '),age:p.age,team:p.team,position:p.position,
    sourceAudit:r,model:{value:model?.value??null,consensus:model?.consensus??null,
     coverageGate384:model?.coverageGate384||false,
     productionReason:model?.production?.productionHistoryReasonV50||null,
     sourceCount:model?.production?.consensusSourceCountV50??null,
     terminalRaw:model?.production?.offenseTerminalRawV50??null,
     terminalExact:model?.production?.offenseTerminalExactV50??null,
     productionReliability:model?.production?.productionReliabilityV50??null,
     effectiveScoringValue:model?.production?.effectiveScoringValue??null,
     terminalModelWeights:model?.production?.modelWeights??null,
     productionAudit:model?.production?.correctedAudit?{
       value:model.production.correctedAudit.value,
       qualifyingSeasons:model.production.correctedAudit.qualifyingSeasons
     }:null,
     ageFactor:model?.production?.ageFactor??null,
     context:model?.context??null},
    scoring:h?{qualifyingSeasons:h.qualifyingSeasons,ppg:h.ppg,confidence:h.confidence}:null};
  });
  // Read-only prospective model calculation: no writes to running state.
  // Compare existing 70/18/8/4 versus consensus-dominant 80/10/6/4.
  const clamp=(lo,x,hi)=>Math.max(lo,Math.min(x,hi));
  const projected=rows.filter(z=>z?.production?.offenseConsensusAnchorV50===true).map(z=>{
    const id=String(z.x.id),c=Number(s.consensusComposite?.byId?.[id]);
    const p=window.offenseConsensusAnchorV50.production(c,z.production?.correctedAudit||{});
    const ageFactor=clamp(.88,Number(z.production?.ageFactor)||1,1.10);
    const context=clamp(.90*c,Number(z.context)||c,1.15*c);
    const raw=.80*c+.10*p.value+.06*context+.04*c*ageFactor;
    const rank=Number(s.consensusComposite?.detailsById?.[id]?.offenseRank);
    let constrained=clamp(.90*c,raw,1.12*c);
    if(Number.isFinite(rank)&&rank<=24)constrained=Math.max(constrained,.95*c);
    if(Number.isFinite(rank)&&rank>220)constrained=Math.min(constrained,1.08*c);
    const curve=window.assetCurveAudit?.(constrained);
    const value=Number(curve?.curved??Math.round(constrained));
    const name=String(s.players?.[id]?.full_name||id);
    return {id,name,position:s.players?.[id]?.position||null,age:s.players?.[id]?.age||null,qualifyingSeasons:p.seasons,sourceCount:(s.consensusComposite?.detailsById?.[id]?.offenseSources||[]).filter(x=>!x.includes('(not listed)')).length,consensus:c,old:z.value,new:value,rawNew:constrained};
  });
  const byId=new Map(projected.map(x=>[x.id,x]));
  const orderedOld=[...projected].sort((a,b)=>b.old-a.old),orderedNew=[...projected].sort((a,b)=>b.new-a.new);
  const oldIndex=new Map(orderedOld.map((x,i)=>[x.id,i+1])),newIndex=new Map(orderedNew.map((x,i)=>[x.id,i+1]));
  const metrics=projected.map(x=>({...x,delta:x.new-x.old,percent:100*(x.new-x.old)/Math.max(1,x.old),rankDelta:oldIndex.get(x.id)-newIndex.get(x.id)}));
  const abs=metrics.map(x=>Math.abs(x.percent)).sort((a,b)=>a-b);
  const quantile=q=>abs.length?abs[Math.min(abs.length-1,Math.floor(abs.length*q))]:null;
  const boston=metrics.find(x=>x.name==='Denzel Boston'),wilson=metrics.find(x=>x.name==='Michael Wilson');
  const counterfactual={weights:{consensus:.80,scoringLookback:.10,scarcityAndOtherContext:.06,ageContext:.04},total:metrics.length,
    medianAbsoluteChangePct:quantile(.5),p95AbsoluteChangePct:quantile(.95),maxAbsoluteChangePct:abs.at(-1)||0,
    overFivePercent:metrics.filter(x=>Math.abs(x.percent)>5).length,
    overTenPercent:metrics.filter(x=>Math.abs(x.percent)>10).length,
    positiveMoves:metrics.filter(x=>x.delta>0).length,negativeMoves:metrics.filter(x=>x.delta<0).length,
    boston,wilson,
    largestIncreases:[...metrics].sort((a,b)=>b.percent-a.percent).slice(0,15),
    largestDecreases:[...metrics].sort((a,b)=>a.percent-b.percent).slice(0,15)};
  const nearby=Array.isArray(audit?.players)?audit.players.filter(r=>r.position==='WR'&&(r.observedSourceCount<=1||r.flags.includes('exact-coverage-fallback'))).slice(0,30).map(r=>({id:r.id,name:r.name,modelValue:r.modelValue,observedSourceCount:r.observedSourceCount,flags:r.flags})):[];
  return {at:new Date().toISOString(),sleeper:{generatedAt:s.sleeperHistory?.generatedAt,complete:s.sleeperHistory?.complete,week:s.sleeperHistory?.completedWeek},
   consensus:window.__fllConsensusRefresh||null,
   sourceNames:Object.entries(s.rankings||{}).map(([name,x])=>({name,kind:x.kind,players:Object.keys(x.data||{}).length})),
   allOffense:audit?.summary||null,candidates:output,counterfactual,missingOrSingleSourceWrExamples:nearby};
 });
 console.log('OFFENSE_EVIDENCE_REPORT '+JSON.stringify({url:target,report,pageErrors:errors},null,2));
 if(!report.candidates.some(x=>x.name.toLowerCase()==='denzel boston')||!report.candidates.some(x=>x.name.toLowerCase()==='michael wilson'))
   throw Error('Requested receivers not both found in loaded Sleeper player population');
 if(!report.allOffense)throw Error('Offense audit unavailable');
}finally{await browser.close()}
