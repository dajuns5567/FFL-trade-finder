import {chromium} from 'playwright';
const sites=[{tag:'IDP preview 464',url:'https://deploy-preview-464--precious-dango-fb4633.netlify.app'}, {tag:'offense preview 463',url:'https://deploy-preview-463--precious-dango-fb4633.netlify.app'}];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
  const results=[];
  for(const site of sites){
    const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(String(e.message||e)));
    const response=await page.goto(site.url,{waitUntil:'domcontentloaded',timeout:115000});
    if(!response?.ok()) throw Error('HTTP '+response?.status());
    await page.waitForFunction(()=>{try{window.fllStateBridgeV141?.syncState?.()}catch{} return window.__fllConsensusRefresh?.ok===true && window.__fllValueRefresh?.inFlight===false && window.state?.sleeperHistory?.complete===true && typeof window.ensureMaster==='function' && Object.keys(window.state?.players||{}).length>800},null,{timeout:240000});
    const result=await page.evaluate(()=>{
      try{window.fllStateBridgeV141?.syncState?.()}catch{}
      const s=window.state,arr=window.ensureMaster(),names=['Denzel Boston','Jaylen Waddle','Ladd McConkey','KC Concepcion','Concepcion','Michael Wilson'];
      const wr=arr.filter(z=>String(s.players?.[String(z.x.id)]?.position||'').toUpperCase()==='WR');
      const matched=arr.filter(z=>names.some(n=>String(s.players?.[String(z.x.id)]?.full_name||'').toLowerCase().includes(n.toLowerCase())));
      const list=matched.map(z=>{
        const id=String(z.x.id),p=s.players?.[id]||{},prod=z.production||{},d=s.consensusComposite?.detailsById?.[id]||{},
          market=window.playerRankValue?.({type:'player',id})||{},posRank=wr.findIndex(x=>String(x.x.id)===id)+1;
        const seasons=[2023,2024,2025,2026].map(year=>{
          const row=s.stats?.[year]?.[id]||{};
          return {year,gp:row.gp??row.games??null,ppr:row.pts_ppr??null,rec:row.rec??null,recYds:row.rec_yd??null};
        });
        const snapshots=(prod.consensusSnapshotsV50||[]).map(x=>({source:x.source,publisherUpdatedAt:x.publisherUpdatedAt,
          contentLastChangedAt:x.contentLastChangedAt,contentChangeAgeDays:x.contentChangeAgeDays,
          fetchedAt:x.snapshotUpdatedAt}));
        return{name:p.full_name,id,position:p.position,age:p.age,yearsExp:p.years_exp,team:p.team,
          overallRank:market.rank,positionRank:posRank,modelValue:Number(z.value),
          canonicalValue:window.tradeValueNormalizationV139?.playerValue?.({type:'player',id})??null,
          consensus:Number(s.consensusComposite?.byId?.[id]),consensusRank:d.offenseRank,
          sourceEvidence:d.offenseSourceEvidence||[],sources:d.offenseSources,
          snaps:snapshots,
          scoring:prod.correctedAudit??null,scoringComponent:prod.effectiveScoringValue??null,
          ageFactor:prod.ageFactor,development:prod.dynastyDevelopmentV50??null,context:z.context,
          rawTerminal:prod.offenseTerminalRawV50,precision:prod.offenseTerminalExactV50,
          precisionRank: z.marketPrecisionValueV386,modelWeights:prod.modelWeights,
          coverageGate:z.coverageGate384??null,seasons};
      });
      const b=list.find(x=>x.name==='Denzel Boston');
      const ahead=b?wr.slice(0,wr.findIndex(z=>String(z.x.id)===b.id)).map(z=>{
        const p=s.players?.[String(z.x.id)]||{},d=s.consensusComposite?.detailsById?.[String(z.x.id)]||{};
        return {name:p.full_name,modelValue:z.value,consensus:z.consensus,age:p.age,consensusRank:d.offenseRank};
      }):[];
      const sourceKeys=Object.entries(s.rankings||{}).filter(([key,r])=>/IDP Show|FantasyPros|DraftSharks|KTC|FanRanked/.test(key))
        .map(([key,r])=>({key,kind:r.kind,format:r.format,updated:r.updated,updatedAt:r.updatedAt,
          freshness:r.freshness,provenance:r.source_provenance}));
      return {week:s.sleeperHistory?.completedWeek,sourceCount:window.__fllConsensusRefresh?.successful,
        n:wr.length,controls:list,bostonAhead:ahead.slice(-16),sourceKeys};
    });
    results.push({site:site.tag,...result,errors});await page.close();
  }
  console.log('BOSTON_WADDLE_MCCONKEY_AUDIT '+JSON.stringify(results,null,2));
  if(results.some(x=>x.errors.length))throw Error('browser errors');
}finally{await browser.close()}