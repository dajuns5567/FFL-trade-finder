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
  // Second counterfactual: keep the approved 70/18/8/4 model intact and
  // reduce only the established (3+ year) positive production premium ceiling from +28% to +20%.
  // Ignore rows whose current value has been overridden by downstream
  // no-consensus or eligibility safeguards; those must remain untouched.
  const productionCeiling=rows.filter(z=>z?.production?.offenseConsensusAnchorV50===true).map(z=>{
    const id=String(z.x.id),consensus=Number(s.consensusComposite?.byId?.[id]);
    const baseRaw=Number(z.production?.offenseTerminalRawV50);
    const baseline=Number(window.assetCurveAudit?.(baseRaw)?.curved??NaN);
    const downstreamOverride=!Number.isFinite(baseline)||Math.abs(baseline-Number(z.value))>2;
    const prod=window.offenseConsensusAnchorV50.production(consensus,z.production?.correctedAudit||{});
    const cap=prod.seasons>=3?Math.min(prod.value,1.20*consensus):prod.value;
    const ctx=clamp(.90*consensus,Number(z.context)||consensus,1.15*consensus);
    const age=clamp(.88,Number(z.production?.ageFactor)||1,1.10);
    let raw=clamp(.90*consensus,.70*consensus+.18*cap+.08*ctx+.04*consensus*age,1.12*consensus);
    const rank=Number(s.consensusComposite?.detailsById?.[id]?.offenseRank);
    if(Number.isFinite(rank)&&rank<=24)raw=Math.max(raw,.95*consensus);
    if(Number.isFinite(rank)&&rank>220)raw=Math.min(raw,1.08*consensus);
    const next=downstreamOverride?Number(z.value):Number(window.assetCurveAudit?.(raw)?.curved??Math.round(raw));
    return {id,name:s.players?.[id]?.full_name||id,position:s.players?.[id]?.position,sourceCount:(s.consensusComposite?.detailsById?.[id]?.offenseSources||[]).filter(x=>!x.includes('(not listed)')).length,
     old:Number(z.value),new:next,downstreamOverride,delta:next-Number(z.value),percent:100*(next-Number(z.value))/Math.max(1,Number(z.value))};
  });
  const impacted=productionCeiling.filter(x=>!x.downstreamOverride);
  const magnitudes=impacted.map(x=>Math.abs(x.percent)).sort((a,b)=>a-b);
  const productionPremiumCap={limit:'max +20% premium for 3+ qualifying seasons; unchanged +28% for 0-2 season players',
   total:productionCeiling.length,unaffectedDownstreamOverrides:productionCeiling.filter(x=>x.downstreamOverride).length,
   medianAbsoluteChangePct:magnitudes[Math.floor(magnitudes.length*.5)]||0,
   p95AbsoluteChangePct:magnitudes[Math.floor(magnitudes.length*.95)]||0,
   maxAbsoluteChangePct:magnitudes.at(-1)||0,
   increased:impacted.filter(x=>x.delta>0).length,decreased:impacted.filter(x=>x.delta<0).length,
   boston:productionCeiling.find(x=>x.name==='Denzel Boston'),
   wilson:productionCeiling.find(x=>x.name==='Michael Wilson'),
   largestDecreases:[...impacted].sort((a,b)=>a.percent-b.percent).slice(0,18),
   preservedOverrides:productionCeiling.filter(x=>x.downstreamOverride).slice(0,15)
  };
  // Audit the user-documented 60/23/12/5 offense formula separately from
  // the disproven 70/18/8/4 runtime, on identical canonical source inputs.
  const agreedRows=rows.filter(z=>z?.production?.offenseConsensusAnchorV50===true).map(z=>{
    const id=String(z.x.id),c=Number(s.consensusComposite?.byId?.[id]);
    const base=window.offenseConsensusAnchorV50.production(c,z.production?.correctedAudit||{});
    const p={...base,value:base.seasons>=3?Math.min(base.value,1.20*c):base.value};
    const player=s.players?.[id]||{},exp=Number(player.years_exp);
    const ageFactor=clamp(.88,Number(z.production?.ageFactor)||1,1.10);
    const stage=!Number.isFinite(exp)||player.years_exp==null?0:exp<=0?.45:exp<=2?1:exp<=4?.60:exp<=7?0:exp<=10?-.40:-.80;
    const evidence=p.seasons>0?.35+.65*Math.min(1,p.seasons/3):.15;
    const adjustment=stage>0?.025*stage*evidence:.025*stage;
    const development=clamp(.86,ageFactor+adjustment,1.12);
    const context=clamp(.90*c,Number(z.context)||c,1.15*c);
    let raw=clamp(.90*c,.60*c+.23*p.value+.12*context+.05*c*development,1.12*c);
    const rank=Number(s.consensusComposite?.detailsById?.[id]?.offenseRank);
    if(Number.isFinite(rank)&&rank<=24)raw=Math.max(raw,.95*c);
    if(Number.isFinite(rank)&&rank>220)raw=Math.min(raw,1.08*c);
    const newer=Number(window.assetCurveAudit?.(raw)?.curved??Math.round(raw));
    const old=Number(z.value);
    const baseRaw=Number(z.production.offenseTerminalRawV50);
    const baseline=Number(window.assetCurveAudit?.(baseRaw)?.curved??NaN);
    const downstreamOverride=!Number.isFinite(baseline)||Math.abs(baseline-old)>2;
    return{id,name:player.full_name||id,pos:player.position,age:player.age||null,
      yearsExp:player.years_exp??null,qualifyingSeasons:p.seasons,sourceCount:z.production.consensusSourceCountV50,
      consensus:c,old,new:newer,delta:newer-old,percent:100*(newer-old)/Math.max(1,old),
      downstreamOverride};
  });
  const meaningful=agreedRows.filter(x=>!x.downstreamOverride);
  const absAgree=meaningful.map(x=>Math.abs(x.percent)).sort((a,b)=>a-b);
  const qAgree=p=>absAgree[Math.min(absAgree.length-1,Math.floor(p*absAgree.length))]||0;
  const agreedModel={weights:{consensus:.60,scoringLookback:.23,context:.12,development:.05},establishedScoringCap:1.20,
    total:agreedRows.length,unaffectedDownstreamOverrides:agreedRows.filter(x=>x.downstreamOverride).length,
    medianAbsPct:qAgree(.5),p95AbsPct:qAgree(.95),maxAbsPct:absAgree.at(-1)||0,
    over5Pct:meaningful.filter(x=>Math.abs(x.percent)>5).length,
    over10Pct:meaningful.filter(x=>Math.abs(x.percent)>10).length,
    increased:meaningful.filter(x=>x.delta>0).length,decreased:meaningful.filter(x=>x.delta<0).length,
    byPosition:Object.fromEntries(['QB','RB','WR','TE'].map(pos=>[pos,{total:meaningful.filter(x=>x.pos===pos).length,
      over5Pct:meaningful.filter(x=>x.pos===pos&&Math.abs(x.percent)>5).length}])),
    controls:agreedRows.filter(x=>['Denzel Boston','Michael Wilson','Drake Maye','Patrick Mahomes','Jonah Coleman','Carnell Tate','Mike Evans'].includes(x.name)),
    largestIncrease:[...meaningful].sort((a,b)=>b.percent-a.percent).slice(0,12),
    largestDecrease:[...meaningful].sort((a,b)=>a.percent-b.percent).slice(0,12)};
  const nearby=Array.isArray(audit?.players)?audit.players.filter(r=>r.position==='WR'&&(r.observedSourceCount<=1||r.flags.includes('exact-coverage-fallback'))).slice(0,30).map(r=>({id:r.id,name:r.name,modelValue:r.modelValue,observedSourceCount:r.observedSourceCount,flags:r.flags})):[];
  return {at:new Date().toISOString(),sleeper:{generatedAt:s.sleeperHistory?.generatedAt,complete:s.sleeperHistory?.complete,week:s.sleeperHistory?.completedWeek},
   consensus:window.__fllConsensusRefresh||null,
   sourceNames:Object.entries(s.rankings||{}).map(([name,x])=>({name,kind:x.kind,players:Object.keys(x.data||{}).length})),
   allOffense:audit?.summary||null,candidates:output,counterfactual,productionPremiumCap,agreedModel,missingOrSingleSourceWrExamples:nearby};
 });
 console.log('OFFENSE_EVIDENCE_REPORT '+JSON.stringify({url:target,report,pageErrors:errors},null,2));
 if(!report.candidates.some(x=>x.name.toLowerCase()==='denzel boston')||!report.candidates.some(x=>x.name.toLowerCase()==='michael wilson'))
   throw Error('Requested receivers not both found in loaded Sleeper player population');
 if(!report.allOffense)throw Error('Offense audit unavailable');
}finally{await browser.close()}
