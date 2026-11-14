import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage(),errs=[];page.on('pageerror',e=>errs.push(e.message));
 await page.goto('https://6af891716fb055bedc867ef2--precious-dango-fb4633.netlify.app',{waitUntil:'domcontentloaded',timeout:100000});
 await page.waitForFunction(()=>window.__fllConsensusRefresh?.ok===true&&window.__fllValueRefresh?.inFlight===false&&window.state?.sleeperHistory?.complete===true,null,{timeout:240000});
 const audit=await page.evaluate(()=>{
  const s=window.state||{},details=s.consensusComposite?.detailsById||{},ranks=s.rankings||{};
  const rawSources=Object.entries(ranks).map(([key,r])=>({key,n:(r?.rankings||r?.rows||[]).length,format:r?.format,source:r?.source,updated:r?.updated||r?.updatedAt,
   freshness:r?.freshness,source_provenance:r?.source_provenance||r?.provenance,status:r?.status})).filter(x=>/idp|combined|show/i.test(x.key+' '+x.source));
  const ids=['13298','13346','11667','3973','10892','11665','13363','12578'];
  const players=ids.map(id=>({id,name:s.players?.[id]?.full_name,cv:s.consensusComposite?.byId?.[id],
   rank:details[id]?.offenseRank??details[id]?.idpRank,
   details:details[id]}));
  return{sourceKeys:Object.keys(ranks),sources:rawSources,players,compositeKeys:Object.keys(s.consensusComposite||{}),
   refreshStatus:window.__fllConsensusRefresh,statsGeneratedAt:s.sleeperHistory?.generatedAt};
 });
 console.log('SOURCE_PROVENANCE_AND_COVERAGE '+JSON.stringify({audit,errs},null,2));
 if(errs.length)throw Error('Page errors');
}finally{await browser.close()}
