import { chromium } from 'playwright';
const url=process.env.IDP_AUDIT_URL||'https://deploy-preview-460--precious-dango-fb4633.netlify.app';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
 const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});if(!r?.ok())throw Error('Preview HTTP '+r?.status());
 await page.waitForFunction(()=>{try{window.fllStateBridgeV141?.syncState?.()}catch{}
  return window.__fllValueRefresh?.inFlight===false&&window.__fllConsensusRefresh?.ok===true&&
    window.state?.sleeperHistory?.complete===true&&typeof window.idpV25PropagationAudit==='function'&&
    typeof window.ensureMaster==='function'&&Object.keys(window.state?.players||{}).length>800;
 },null,{timeout:240000});
 const result=await page.evaluate(()=>{
  try{window.fllStateBridgeV141?.syncState?.()}catch{}
  const audit=window.idpV25PropagationAudit(),all=audit.rows||[];
  const clamp=(lo,x,hi)=>Math.max(lo,Math.min(x,hi));
  const role=p=>{const v=[p.position,...(p.fantasy_positions||[])].map(x=>String(x||'').toUpperCase());
   if(v.some(x=>['DT','NT'].includes(x))&&!v.some(x=>['EDGE','DE'].includes(x)))return 'INTERIOR';
   if(v.some(x=>['EDGE','DE','DL'].includes(x)))return 'EDGE';
   if(v.some(x=>['LB','ILB','MLB','OLB'].includes(x)))return 'LB';
   if(v.some(x=>['CB','DB','SS','FS','S'].includes(x)))return 'DB';return 'OTHER'};
  const points=all.map(x=>{
   const id=String(x.id),c=Number(x.consensus),sc=Number(x.scoring),ctx=Number(x.context);
   const has=c>0&&Number.isFinite(c);
   const old=has?Math.max(1,Math.round(clamp(c*.45,.4*c+.4*sc+.2*ctx,Math.max(c*2.15,c+760)))):Math.max(25,Math.min(700,Math.round(.4*sc+.2*ctx)));
   const raw=has?.20*c+.45*sc+.35*ctx-80.15:.4*sc+.2*ctx;
   const revised=has?Math.max(1,Math.round(clamp(c*.45,raw,Math.max(c*2.15,c+760)))):old;
   const player=window.state?.players?.[id]||{};
   return{id,name:x.name,pos:player.position,role:role(player),consensus:has?c:null,scoring:sc,context:ctx,ppg:x.weightedPpg??null,confidence:x.confidence??null,old,new:revised,observedV25:Number(x.v25),delta:revised-old,percent:(revised-old)/Math.max(1,old)*100,withConsensus:has};
  });
  const pct=(arr,q)=>{if(!arr.length)return null;const sorted=[...arr].sort((a,b)=>a-b);return sorted[Math.floor((sorted.length-1)*q)]};
  const summary=arr=>({n:arr.length,medianChange:pct(arr.map(x=>x.delta),.5),
    medianAbsolutePercent:pct(arr.map(x=>Math.abs(x.percent)),.5),
    p95AbsolutePercent:pct(arr.map(x=>Math.abs(x.percent)),.95),
    up:arr.filter(x=>x.delta>0).length,down:arr.filter(x=>x.delta<0).length,
    over10pct:arr.filter(x=>Math.abs(x.percent)>=10).length,
    oldMedian:pct(arr.map(x=>x.old),.5),newMedian:pct(arr.map(x=>x.new),.5)});
  const actualMismatch=points.filter(x=>Math.abs(x.observedV25-x.new)>1);
  const roundedInputDifferences=points.filter(x=>x.observedV25!==x.new).length;
  // Replay the previous context composition against the SAME source/scoring
  // inputs. The active 20/45/35 blend and all downstream model layers remain
  // untouched. This isolates the effect of universal development signals.
  const master=window.ensureMaster();
  const developmentRows=master.filter(z=>z?.x?.type==='player'&&z.production?.leagueContext?.development).map(z=>{
   const id=String(z.x.id),p=window.state?.players?.[id]||{},ctx=z.production.leagueContext;
   const score=z.production,conf=Number(score.m?.confidence)||0;
   const tackle=.5+conf*((Number(ctx.tacklePct)||.5)-.5);
   const spike=.5+conf*((Number(ctx.spikePct)||.5)-.5);
   const oldIndex=.35*tackle+.45*spike+.20*Number(ctx.age);
   const prevContext=430+420*clamp(.05,oldIndex,.95);
   const c=Number(window.state?.consensusComposite?.byId?.[id]);
   const positive=Number.isFinite(c)&&c>0;
   const oldRaw=positive?.20*c+.45*Number(score.value)+.35*prevContext-80.15:.40*Number(score.value)+.20*prevContext;
   const old=positive?Math.max(1,Math.round(clamp(c*.45,oldRaw,Math.max(c*2.15,c+760)))):Math.max(25,Math.min(700,Math.round(oldRaw)));
   const nowRaw=positive?.20*c+.45*Number(score.value)+.35*Number(ctx.value)-80.15:.40*Number(score.value)+.20*Number(ctx.value);
   const now=positive?Math.max(1,Math.round(clamp(c*.45,nowRaw,Math.max(c*2.15,c+760)))):Math.max(25,Math.min(700,Math.round(nowRaw)));
   return {id,name:p.full_name||p.first_name+' '+p.last_name,role:role(p),pos:p.position,
    age:p.age??null,yearsExp:ctx.yearsExp,qualifyingSeasons:score.a?.qualifyingSeasons??0,confidence:conf,
    consensus:positive?c:null,scoring:Number(score.value),
    developmentIndex:ctx.development.index,oldCtx:Math.round(prevContext),newCtx:Math.round(ctx.value),
    oldV25:old,newV25:now,delta:now-old,percent:100*(now-old)/Math.max(1,old)};
  });
  const summarizeDevelopment=arr=>({n:arr.length,medianDelta:pct(arr.map(x=>x.delta),.5),
   medianAbsPct:pct(arr.map(x=>Math.abs(x.percent)),.5),p95AbsPct:pct(arr.map(x=>Math.abs(x.percent)),.95),
   increases:arr.filter(x=>x.delta>0).length,decreases:arr.filter(x=>x.delta<0).length,
   above10Pct:arr.filter(x=>Math.abs(x.percent)>=10).length});
  const developmentImpact={total:summarizeDevelopment(developmentRows),
   withConsensus:summarizeDevelopment(developmentRows.filter(x=>x.consensus)),
   noConsensus:summarizeDevelopment(developmentRows.filter(x=>!x.consensus)),
   zeroEvidence:summarizeDevelopment(developmentRows.filter(x=>!x.qualifyingSeasons)),
   roles:Object.fromEntries(['EDGE','LB','INTERIOR','DB'].map(r=>[r,summarizeDevelopment(developmentRows.filter(x=>x.role===r))])),
   controls:developmentRows.filter(x=>['Dallas Turner','Jared Verse','David Bailey','Abdul Carter','Will Anderson Jr.','Myles Garrett','Maxx Crosby','Nick Bosa','Fred Warner','Quay Walker','Tremaine Edmunds','Sonny Styles','Chris Jones'].includes(x.name)),
   largestIncreases:[...developmentRows].sort((a,b)=>b.percent-a.percent).slice(0,18),
   largestDecreases:[...developmentRows].sort((a,b)=>a.percent-b.percent).slice(0,18)};
  const byRole={};for(const r of ['EDGE','LB','INTERIOR','DB','OTHER'])byRole[r]=summary(points.filter(x=>x.role===r));
  const top=[...points].sort((a,b)=>b.old-a.old).slice(0,60);
  const watched=['David Bailey','Chris Jones','Nick Bosa','Will Anderson Jr.','Maxx Crosby','Quay Walker','Robert Spillane','Myles Garrett'];
  return {at:new Date().toISOString(),offenseWeightsObserved:window.offenseConsensusAnchorV50?.version||null,
   currentSourceCount:window.__fllConsensusRefresh?.successful||0,
   sourceSeason:window.state?.sleeperHistory?.completedWeek||null,
   total:summary(points),developmentImpact,roundedInputDifferences,runtimeV25Mismatches:actualMismatch.length,mismatchExamples:actualMismatch.slice(0,12),withConsensus:summary(points.filter(x=>x.withConsensus)),
   noConsensus:summary(points.filter(x=>!x.withConsensus)),
   byRole,topTier:summary(top),watched:points.filter(x=>watched.some(t=>x.name?.toLowerCase()===t.toLowerCase())),
   biggestRelativeUp:[...points].sort((a,b)=>b.percent-a.percent).slice(0,20),
   biggestRelativeDown:[...points].sort((a,b)=>a.percent-b.percent).slice(0,20)};
 });
 console.log('IDP_POPULATION_AUDIT '+JSON.stringify({url,result,pageErrors},null,2));
 if(result.total.n<150)throw Error('IDP population insufficient');
 if(result.runtimeV25Mismatches)throw Error('Live IDP V25 values diverge from audited formula: '+result.runtimeV25Mismatches);
 if(pageErrors.length)throw Error('Browser errors '+pageErrors.join(','));
}finally{await browser.close()}
