import {chromium} from 'playwright';
const sites=[
 {tag:'before',url:'https://6af7fbe6d07d04c449c46b9b--precious-dango-fb4633.netlify.app'},
 {tag:'after',url:'https://6af8a9e130ba44b178960866--precious-dango-fb4633.netlify.app'}
];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 const snapshots=[];
 for(const site of sites){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message||String(e)));
  const response=await page.goto(site.url,{waitUntil:'domcontentloaded',timeout:120000});
  if(!response?.ok())throw Error(site.tag+' HTTP '+response?.status());
  await page.waitForFunction(()=>{try{window.fllStateBridgeV141?.syncState?.()}catch{}return window.state?.sleeperHistory?.complete===true&&window.__fllConsensusRefresh?.ok===true&&window.__fllValueRefresh?.inFlight===false&&typeof window.ensureMaster==='function'},null,{timeout:240000});
  const data=await page.evaluate(()=>{
    try{window.fllStateBridgeV141?.syncState?.()}catch{}
    const s=window.state,arr=window.ensureMaster(),wr=arr.filter(z=>s.players?.[String(z.x.id)]?.position==='WR');
    const rows=arr.filter(z=>z.production?.offenseConsensusAnchorV50).map(z=>{
      const id=String(z.x.id),p=s.players?.[id]||{},a=z.production?.correctedAudit||{};
      return {id,name:p.full_name||id,pos:p.position,age:p.age,exp:p.years_exp,consensus:Number(s.consensusComposite?.byId?.[id])||0,
       overallRank:arr.findIndex(x=>String(x.x.id)===id)+1,wrRank:wr.findIndex(x=>String(x.x.id)===id)+1,
       modelValue:Number(z.value),precision:Number(z.marketPrecisionValueV386),qualified:a.qualifyingSeasons??0,
       games:a.samples?.[0]?.games??null,currentSample:a.samples?.[0]?.currentSeason??null,
       doubleDiscountAvoided:z.production.earlyCareerVerifiedScoringV50===true,
       scoreUsed:z.production.effectiveScoringValue,scoringPPG:a.ppg??null,
       sourceRank:s.consensusComposite?.detailsById?.[id]?.offenseRank??null};
    });
    const dom=[...document.querySelectorAll('[data-player-id]')].filter(x=>['13346','7526','11635','13298'].includes(x.dataset.playerId)).map(x=>({id:x.dataset.playerId,text:x.innerText.slice(0,180)}));
    return {completedWeek:s.sleeperHistory.completedWeek,refresh:window.__fllConsensusRefresh?.successful,rows,dom};
  });
  snapshots.push({site:site.tag,url:site.url,errors,...data});await page.close();
 }
 const [a,b]=snapshots,byId=new Map(a.rows.map(x=>[x.id,x]));
 const changes=b.rows.map(x=>{
  const prior=byId.get(x.id);
  return {...x,oldValue:prior?.modelValue??null,change:prior?x.modelValue-prior.modelValue:null,
   sourceSame:prior?.consensus===x.consensus,
   gamesSame:prior?.games===x.games,
   ppgSame:Math.abs((prior?.scoringPPG||0)-(x.scoringPPG||0))<1e-9};
 });
 const invalid=changes.filter(x=>x.oldValue==null||!x.sourceSame||!x.gamesSame||!x.ppgSame);
 const changed=changes.filter(x=>x.change!==0),controls=changes.filter(x=>['Denzel Boston','Jaylen Waddle','Ladd McConkey','KC Concepcion Jr.','Michael Wilson','Carnell Tate','Mike Evans'].includes(x.name));
 const byName=Object.fromEntries(controls.map(x=>[x.name,x]));
 const report={before:{count:a.rows.length,errors:a.errors,week:a.completedWeek,sourceCount:a.refresh},
  after:{count:b.rows.length,errors:b.errors,week:b.completedWeek,sourceCount:b.refresh},
  invalid:invalid.slice(0,15),changed:changed.length,up:changed.filter(x=>x.change>0).length,down:changed.filter(x=>x.change<0).length,
  largest:[...changed].sort((x,y)=>y.change-x.change).slice(0,12).map(x=>({name:x.name,change:x.change})),
  controls,rendered:b.dom};
 console.log('OFFENSE_NEW_PREVIEW_VALIDATION '+JSON.stringify(report,null,2));
 if(a.errors.length||b.errors.length||invalid.length)throw Error('Inputs changed or page errors');
 if(!(byName['Denzel Boston']?.modelValue>byName['Jaylen Waddle']?.modelValue))
  throw Error('Boston still behind Waddle in actual preview');
 if(!(byName['Ladd McConkey']?.modelValue>byName['Denzel Boston']?.modelValue))
  throw Error('Source-leading McConkey fell below Boston');
 if(changed.some(x=>!x.doubleDiscountAvoided))throw Error('Players outside protected verified cohort changed');
}finally{await browser.close()}
