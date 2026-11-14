import { chromium } from 'playwright';
const endpoints=[
 {name:'prior V50',url:'https://deploy-preview-460--precious-dango-fb4633.netlify.app'},
 {name:'agreed development',url:'https://deploy-preview-463--precious-dango-fb4633.netlify.app'}];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const snapshots=[];
 for(const {name,url} of endpoints){
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.setDefaultTimeout(180000);
  const errors=[];page.on('pageerror',e=>errors.push(String(e?.message||e)));
  const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
  if(!r?.ok())throw Error(name+' HTTP '+r?.status());
  await page.waitForFunction(()=>{try{window.fllStateBridgeV141?.syncState?.()}catch{}
   return window.state?.sleeperHistory?.complete===true&&window.__fllConsensusRefresh?.ok===true&&
    window.__fllValueRefresh?.inFlight===false&&typeof window.ensureMaster==='function'&&
    Object.keys(window.state?.players||{}).length>800;
  },null,{timeout:240000});
  const data=await page.evaluate(()=>{
   try{window.fllStateBridgeV141?.syncState?.()}catch{}
   const s=window.state,all=window.ensureMaster();
   const records=all.filter(z=>z?.production?.offenseConsensusAnchorV50).map(z=>{
    const id=String(z.x.id),p=s.players?.[id]||{},prod=z.production||{},c=Number(s.consensusComposite?.byId?.[id])||0;
    return{id,name:p.full_name||p.first_name+' '+p.last_name,position:p.position,
     consensus:c,scoringPpg:prod.correctedAudit?.ppg??null,qualifyingSeasons:prod.correctedAudit?.qualifyingSeasons??null,
     scoringComponent:prod.effectiveScoringValue,value:Number(z.value),weights:prod.modelWeights,
     development:prod.dynastyDevelopmentV50||null};
   });
   return {week:s.sleeperHistory?.completedWeek??null,sourceCount:window.__fllConsensusRefresh?.successful??null,
    records,offense:f=>null};
  });
  snapshots.push({name,url,week:data.week,sourceCount:data.sourceCount,records:data.records,errors});
  await page.close();
 }
 const a=new Map(snapshots[0].records.map(x=>[x.id,x])),b=snapshots[1].records;
 const matched=b.filter(x=>a.has(x.id)).map(x=>{
  const before=a.get(x.id);
  return{...x,oldValue:before.value,delta:x.value-before.value,percent:100*(x.value-before.value)/Math.max(1,before.value),
   consensusSame:x.consensus===before.consensus,scoringSeasonSame:x.qualifyingSeasons===before.qualifyingSeasons,
   oldScoringComponent:before.scoringComponent};
 });
 const mismatches=matched.filter(x=>!x.consensusSame||!x.scoringSeasonSame);
 const abs=matched.map(x=>Math.abs(x.percent)).sort((a,b)=>a-b);
 const quant=q=>abs[Math.floor((abs.length-1)*q)]||0;
 const watched=['Denzel Boston','Michael Wilson','Carnell Tate','Jonah Coleman','Drake Maye','Patrick Mahomes','Mike Evans'];
 const result={urlA:snapshots[0].url,urlB:snapshots[1].url,
  weeks:snapshots.map(x=>x.week),sourceCounts:snapshots.map(x=>x.sourceCount),
  total:matched.length,mismatches:mismatches.slice(0,12),missingBefore:b.filter(x=>!a.has(x.id)).length,
  medianAbsChangePct:quant(.5),p95AbsChangePct:quant(.95),maxAbsChangePct:abs.at(-1)||0,
  overFivePct:matched.filter(x=>Math.abs(x.percent)>5).length,
  byPosition:Object.fromEntries(['QB','RB','WR','TE'].map(pos=>[pos,{n:matched.filter(x=>x.position===pos).length,over5:matched.filter(x=>x.position===pos&&Math.abs(x.percent)>5).length}])),
  watched:matched.filter(x=>watched.includes(x.name)).map(x=>({name:x.name,position:x.position,consensus:x.consensus,
   oldValue:x.oldValue,newValue:x.value,delta:x.delta,qualifyingSeasons:x.qualifyingSeasons,weights:x.weights,development:x.development})),
  oldErrors:snapshots[0].errors,newErrors:snapshots[1].errors};
 console.log('OFFENSE_LIVE_COMPARISON '+JSON.stringify(result,null,2));
 if(mismatches.length||snapshots[0].errors.length||snapshots[1].errors.length)throw Error('Different source/scoring inputs or browser errors');
 if(b.find(x=>x.name==='Denzel Boston')?.value<=b.find(x=>x.name==='Michael Wilson')?.value)
  throw Error('Consensus-leading young receiver still loses to veteran on actual model');
}finally{await browser.close()}
