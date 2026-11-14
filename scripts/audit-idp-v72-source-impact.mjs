import {chromium} from 'playwright';
const url='https://6af891716fb055bedc867ef2--precious-dango-fb4633.netlify.app';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e.message||e)));
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
 if(!response?.ok())throw Error('Preview HTTP '+response?.status());
 await page.waitForFunction(()=>{try{window.fllStateBridgeV141?.syncState?.()}catch{}
  return window.__fllConsensusRefresh?.ok===true&&window.__fllValueRefresh?.inFlight===false&&
   window.state?.sleeperHistory?.complete===true&&typeof window.idpV72ContinuousShieldCounterfactual==='function'&&
   typeof window.idpV72ActiveCurveAudit==='function'&&typeof window.idpV72ShieldReasonAudit==='function';
 },null,{timeout:240000});
 const data=await page.evaluate(()=>{
  const s=window.state,active=window.idpV72ActiveCurveAudit(),continuous=window.idpV72ContinuousShieldCounterfactual(),
   reasons=window.idpV72ShieldReasonAudit(),source=s.rankings?.['The IDP Show Combined']||{};
  const groups=Array.isArray(continuous.rows)?continuous.rows:[];
  const controlIds=['11667','13363','10892','8289','5991','3973','12578','11665','12574','13375'];
  const sourceRows=(s.consensusComposite?.detailsById)||{};
  const offense=Object.fromEntries(['13298','13346'].map(id=>[id,{name:s.players?.[id]?.full_name,
    rank:sourceRows[id]?.offenseRank,
    sources:sourceRows[id]?.offenseSourceEvidence||[] }]));
  return {time:new Date().toISOString(),sourceManifest:{
    keys:Object.keys(source),updated:source.updated,sourceUpdatedAt:source.updatedAt,
    freshness:source.freshness,rankingsCount:source.rankings?.length,
    provenance:source.source_provenance||source.provenance,
    status:source.status},
    offense,
    active:{coverage:active.coverage,distributions:active.distributions,mostCompressed:active.mostCompressed?.slice(0,10)},
    continuous:{criterion:continuous.criterion,formula:continuous.formula,summary:continuous.summary,
      byRole:continuous.byRole,distribution:continuous.distribution,controls:continuous.controls,
      largestUp:continuous.largestUp?.slice(0,18),largestDown:continuous.largestDown?.slice(0,10),
      rowCount:groups.length,turnerRow:groups.find(x=>String(x.id)==='11667')||null},
    reasons:{criterion:reasons.criterion,reasonCounts:reasons.reasonCounts,
      controls:reasons.controls?.filter(x=>controlIds.includes(String(x.id))),
      highestUnshielded:reasons.unshieldedHighestBaseline?.slice(0,8)}};
 });
 console.log('V72_AND_IDPSHOW_AUDIT '+JSON.stringify({url,data,errors},null,2));
 if(errors.length)throw Error('Page errors: '+errors.join('; '));
}finally{await browser.close()}
