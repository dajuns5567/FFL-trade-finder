import { chromium } from 'playwright';
const endpoints=[
 {name:'previous context',url:'https://6af7f4c73cb446f363104a86--precious-dango-fb4633.netlify.app'},
 {name:'all-role development',url:'https://6af7f9162b8d06b35b504254--precious-dango-fb4633.netlify.app'}];
const ids=['11667','11665','12574','13363','10892','3973','5991','5816','5041','8266','13375','4968','5726','12578','11687'];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const snapshots=[];
 for(const {name,url} of endpoints){
  const page=await browser.newPage();page.setDefaultTimeout(180000);
  const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:100000});
  if(!response?.ok())throw Error(name+' HTTP '+response?.status());
  await page.waitForFunction(()=>{
   try{window.fllStateBridgeV141?.syncState?.()}catch{}
   return window.__fllValueRefresh?.inFlight===false&&window.__fllConsensusRefresh?.ok===true&&
     window.state?.sleeperHistory?.complete===true&&typeof window.ensureMaster==='function'&&
     typeof window.playerRankValue==='function'&&Object.keys(window.state?.players||{}).length>800;
  },null,{timeout:210000});
  const result=await page.evaluate(ids=>{
   try{window.fllStateBridgeV141?.syncState?.()}catch{}
   const rows=window.ensureMaster(),byId=new Map(rows.map((r,i)=>[String(r.x?.id),{...r,modelOverallRank:i+1}]));
   return {generatedAt:new Date().toISOString(),week:window.state?.sleeperHistory?.completedWeek??null,
    consensusStatus:window.__fllConsensusRefresh?.successful,
    rows:ids.map(id=>{
     const z=byId.get(id),p=window.state.players?.[id]||{},cv=Number(window.state?.consensusComposite?.byId?.[id])||0,
       final=window.playerRankValue({type:'player',id});
     return {id,name:p.full_name||p.first_name+' '+p.last_name,
      cv,modelValue:z?.value??null,modelOverallRank:z?.modelOverallRank??null,
      finalValue:final?.value??null,finalOverallRank:final?.rank??null,
      scoringComponent:z?.production?.value??null,
      ppg:z?.production?.m?.ppg??null,
      confidence:z?.production?.m?.confidence??null,
      developmentIndex:z?.production?.leagueContext?.development?.index??null};
    })};
  },ids);
  snapshots.push({name,url,...result,errors});
  await page.close();
 }
 const [old,current]=snapshots;
 const rows=current.rows.map(x=>{
  const prior=old.rows.find(y=>y.id===x.id)||{};
  return {name:x.name,sourceConsensusSame:x.cv===prior.cv,
   scoringPpgSame:Math.abs((x.ppg||0)-(prior.ppg||0))<.000001,
   oldValue:prior.finalValue,currentValue:x.finalValue,
   valueChange:x.finalValue-prior.finalValue,
   oldRank:prior.finalOverallRank,newRank:x.finalOverallRank,
   rankImprovement:prior.finalOverallRank-x.finalOverallRank,
   oldModeled:prior.modelValue,newModeled:x.modelValue,
   developmentIndex:x.developmentIndex};
 });
 const mismatchedInputs=rows.filter(x=>!x.sourceConsensusSame||!x.scoringPpgSame);
 console.log('IDP_DEVELOPMENT_LIVE_RANKS '+JSON.stringify({inputsComparable:mismatchedInputs.length===0,mismatchedInputs,rows,old:{at:old.generatedAt,week:old.week,sourceStatus:old.consensusStatus,errors:old.errors},current:{at:current.generatedAt,week:current.week,sourceStatus:current.consensusStatus,errors:current.errors}},null,2));
 if(old.errors.length||current.errors.length)throw Error('Browser errors');
 if(mismatchedInputs.length)throw Error('Ranking observations used changed source/scoring inputs');
}finally{await browser.close()}
