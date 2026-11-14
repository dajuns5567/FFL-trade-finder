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
  const actualMismatch=points.filter(x=>x.observedV25!==x.new);
  const byRole={};for(const r of ['EDGE','LB','INTERIOR','DB','OTHER'])byRole[r]=summary(points.filter(x=>x.role===r));
  const top=[...points].sort((a,b)=>b.old-a.old).slice(0,60);
  const watched=['David Bailey','Chris Jones','Nick Bosa','Will Anderson Jr.','Maxx Crosby','Quay Walker','Robert Spillane','Myles Garrett'];
  return {at:new Date().toISOString(),offenseWeightsObserved:window.offenseConsensusAnchorV50?.version||null,
   currentSourceCount:window.__fllConsensusRefresh?.successful||0,
   sourceSeason:window.state?.sleeperHistory?.completedWeek||null,
   total:summary(points),runtimeV25Mismatches:actualMismatch.length,mismatchExamples:actualMismatch.slice(0,12),withConsensus:summary(points.filter(x=>x.withConsensus)),
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
