import { chromium } from 'playwright';
const endpoints=[
 {tag:'before',url:'https://6af891716fb055bedc867ef2--precious-dango-fb4633.netlify.app'},
 {tag:'after',url:'https://deploy-preview-464--precious-dango-fb4633.netlify.app'}
];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const samples=[];
 for(const site of endpoints){
  const page=await browser.newPage(),pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
  const res=await page.goto(site.url,{waitUntil:'domcontentloaded',timeout:110000});
  if(!res?.ok())throw Error(site.tag+' HTTP '+res?.status());
  await page.waitForFunction(()=>{try{window.fllStateBridgeV141?.syncState?.()}catch{}
   return window.__fllConsensusRefresh?.ok===true&&window.__fllValueRefresh?.inFlight===false&&
    window.state?.sleeperHistory?.complete===true&&typeof window.ensureMaster==='function';
  },null,{timeout:240000});
  const state=await page.evaluate(()=>{
   try{window.fllStateBridgeV141?.syncState?.()}catch{}
   const s=window.state,rows=window.ensureMaster();
   return {week:s.sleeperHistory.completedWeek,generated:s.sleeperHistory.generatedAt,
    sourceCount:window.__fllConsensusRefresh?.successful,
    players:rows.filter(x=>x.production?.idpOverallTradeCurveV72).map(z=>{
     const id=String(z.x.id),p=s.players?.[id]||{},d=s.consensusComposite?.detailsById?.[id]||{},a=z.production||{};
     const sources=(d.idpSources||[]).filter(x=>!String(x).endsWith(' (not listed)'));
     return{id,name:p.full_name||id,cv:Number(d.idpValue)||0,sourceNames:sources,
      confidence:Number(a.idpEvidenceV53)||0,
      beforeRetention:a.idpV72PreSourceRetention??null,retentionBonus:a.idpV72SourceRetentionBonus??null,
      value:Number(z.value),scoringPpg:Number(a.m?.ppg)||0};
    })};
  });
  samples.push({tag:site.tag,errors:pageErrors,...state});
  await page.close();
 }
 const [older,now]=samples;
 const previous=new Map(older.players.map(x=>[x.id,x]));
 const paired=now.players.map(x=>{
  const p=previous.get(x.id),sources=[...new Set(x.sourceNames||[])];
  const support=sources.length>=2?Math.min(1,(sources.length-1)/2):0;
  const expected=p?Math.round(Math.max(0,.72*x.cv-p.value)*.65*support*Math.max(0,Math.min(1,x.confidence))):null;
  return{...x,oldValue:p?.value??null,delta:p?x.value-p.value:null,expectedBonus:expected,
   differenceFromExpected:p?x.value-p.value-expected:null,
   cvUnchanged:!!p&&x.cv===p.cv,
   scoringUnchanged:!!p&&Math.abs(x.scoringPpg-p.scoringPpg)<1e-6};
 });
 const missing=paired.filter(x=>x.oldValue==null),unexpected=paired.filter(x=>
  x.oldValue!=null&&(x.differenceFromExpected!==0||!x.cvUnchanged||!x.scoringUnchanged));
 const unchangedSingles=paired.filter(x=>x.sourceNames.length<2&&x.oldValue!=null&&x.delta===0).length;
 const increased=paired.filter(x=>x.delta>0),abs=paired.map(x=>Math.abs(x.delta||0)/Math.max(1,x.oldValue||1)*100).sort((a,b)=>a-b);
 const target=['Dallas Turner','Will Anderson Jr.','Maxx Crosby','Myles Garrett','David Bailey','Jared Verse','Fred Warner','Carson Schwesinger','DeShon Elliott','Terrel Bernard'];
 const report={before:{week:older.week,count:older.players.length,errors:older.errors,generated:older.generated},
  after:{week:now.week,count:now.players.length,errors:now.errors,generated:now.generated},
  differences:{matched:paired.length-missing.length,newIds:missing.length,
   mismatched:unexpected.length,examples:unexpected.slice(0,12),
   increased:increased.length,decreased:paired.filter(x=>x.delta<0).length,
   over10pct:paired.filter(x=>x.delta>0&&x.delta/x.oldValue>.10).length,
   maxPct:abs.at(-1)||0,singleSourceUnaffected:unchangedSingles},
  controls:paired.filter(x=>target.includes(x.name)).map(x=>({name:x.name,old:x.oldValue,now:x.value,delta:x.delta,
   sourceCount:x.sourceNames.length,cv:x.cv,expectedBonus:x.expectedBonus,rankIndependent:true})),
  topIncreases:[...increased].sort((a,b)=>b.delta/Math.max(1,b.oldValue)-a.delta/Math.max(1,a.oldValue)).slice(0,15)
     .map(x=>({name:x.name,old:x.oldValue,now:x.value,delta:x.delta}))};
 console.log('V72_LIVE_FORMULA_REPLAY '+JSON.stringify(report,null,2));
 if(older.errors.length||now.errors.length||unexpected.length||missing.length)
  throw Error('Input or formula regression in live V72 preview');
}finally{await browser.close()}
