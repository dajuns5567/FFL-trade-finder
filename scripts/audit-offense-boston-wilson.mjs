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
  const nearby=Array.isArray(audit?.players)?audit.players.filter(r=>r.position==='WR'&&(r.observedSourceCount<=1||r.flags.includes('exact-coverage-fallback'))).slice(0,30).map(r=>({id:r.id,name:r.name,modelValue:r.modelValue,observedSourceCount:r.observedSourceCount,flags:r.flags})):[];
  return {at:new Date().toISOString(),sleeper:{generatedAt:s.sleeperHistory?.generatedAt,complete:s.sleeperHistory?.complete,week:s.sleeperHistory?.completedWeek},
   consensus:window.__fllConsensusRefresh||null,
   sourceNames:Object.entries(s.rankings||{}).map(([name,x])=>({name,kind:x.kind,players:Object.keys(x.data||{}).length})),
   allOffense:audit?.summary||null,candidates:output,missingOrSingleSourceWrExamples:nearby};
 });
 console.log('OFFENSE_EVIDENCE_REPORT '+JSON.stringify({url:target,report,pageErrors:errors},null,2));
 if(!report.candidates.some(x=>x.name.toLowerCase()==='denzel boston')||!report.candidates.some(x=>x.name.toLowerCase()==='michael wilson'))
   throw Error('Requested receivers not both found in loaded Sleeper player population');
 if(!report.allOffense)throw Error('Offense audit unavailable');
}finally{await browser.close()}
