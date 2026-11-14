import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();
 const response=await page.goto('https://deploy-preview-464--precious-dango-fb4633.netlify.app',{waitUntil:'domcontentloaded',timeout:90000});
 if(!response?.ok())throw Error('preview HTTP '+response?.status());
 await page.waitForFunction(()=>{try{window.fllStateBridgeV141?.syncState?.()}catch{}
  return window.__fllConsensusRefresh?.ok===true&&window.__fllValueRefresh?.inFlight===false&&
   window.state?.sleeperHistory?.complete===true&&typeof window.ensureMaster==='function'
 },null,{timeout:240000});
 const report=await page.evaluate(()=>{
  const s=window.state||{},ids=new Set(window.ensureMaster().map(z=>String(z.x?.id))),
   roster=new Set((s.allAssets||[]).filter(x=>x.type==='player').map(x=>String(x.id))),source=new Set(Object.keys(s.consensusComposite?.byId||{}));
  const years=Object.keys(s.stats||{}).sort(),list=Object.entries(s.players||{}).filter(([id,p])=>
   Array.isArray(p?.fantasy_positions)&&p.fantasy_positions.length&&window.groupPos?.({type:'player',id})==='IDP');
  const scored=list.map(([id,p])=>{
   const samples=years.map(y=>({year:y,stats:s.stats?.[y]?.[id]||null})).filter(y=>y.stats);
   const current=s.stats?.[2026]?.[id]||{};
   return{id,name:p.full_name||id,position:p.position,team:p.team,active:p.active,rostered:roster.has(id),consensus:source.has(id),modeled:ids.has(id),
    currentGames:Number(current.gp??current.games??0),currentIdpPoints:Number(current.pts_idp??current.idp_points??0),
    years:samples.map(x=>({year:x.year,games:Number(x.stats.gp??x.stats.games??0)}))};
  });
  const lost=scored.filter(x=>!x.modeled&&x.currentGames>=8),eligible=lost.filter(x=>x.active!==false);
  return{at:new Date().toISOString(),statYears:years,statsShape:Object.keys(s.stats?.[2026]?.['13363']||{}).slice(0,30),
   playerCount:list.length,modeledCount:scored.filter(x=>x.modeled).length,
   missingCurrent8Games:lost.length,missingCurrent8ActiveOrUnknown:eligible.length,
   missingCurrent8Examples:lost.sort((a,b)=>b.currentIdpPoints-a.currentIdpPoints).slice(0,35),
   namedControls:scored.filter(x=>['Byron Murphy II','Byron Young','Chris Jones','David Bailey','Sonny Styles'].includes(x.name)).slice(0,25)};
 });
 console.log('IDP_UNIVERSE_FALLBACK_AUDIT '+JSON.stringify(report,null,2));
}finally{await browser.close()}
