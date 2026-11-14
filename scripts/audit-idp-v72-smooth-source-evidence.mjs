import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
 const response=await page.goto('https://6af891716fb055bedc867ef2--precious-dango-fb4633.netlify.app',{waitUntil:'domcontentloaded',timeout:120000});
 if(!response?.ok())throw Error('HTTP '+response?.status());
 await page.waitForFunction(()=>window.__fllConsensusRefresh?.ok===true&&window.__fllValueRefresh?.inFlight===false&&window.state?.sleeperHistory?.complete===true&&typeof window.ensureMaster==='function',null,{timeout:235000});
 const outcome=await page.evaluate(()=>{
  const all=window.ensureMaster(),s=window.state,cs=s.consensusComposite?.detailsById||{};
  const idps=all.filter(z=>z.production?.idpOverallTradeCurveV72).map(z=>{
   const id=String(z.x.id),d=cs[id]||{},p=s.players?.[id]||{},prod=z.production||{};
   const sourceCount=(d.idpSources||[]).filter(x=>!String(x).includes('(not listed)')).length;
   const cv=Number(d.idpValue)||0,ev=Number(prod.idpEvidenceV53)||0,base=Number(prod.idpOverallTradeCurveBaselineV72)||0,value=Number(z.value);
   return{id,name:p.full_name||id,pos:p.position,age:p.age,sourceCount,cv,ev,base,value,shield:Number(prod.idpOverallTradeCurveShieldV72)||0};
  });
  const allRanks=all.map(z=>({id:String(z.x.id),value:Number(z.value)}));
  const variants=[
   {name:'0.68-source-floor-65%-evidence',floor:.68,mix:.65},
   {name:'0.70-source-floor-65%-evidence',floor:.70,mix:.65},
   {name:'0.72-source-floor-65%-evidence',floor:.72,mix:.65},
   {name:'0.72-source-floor-80%-evidence',floor:.72,mix:.80},
   {name:'0.75-source-floor-65%-evidence',floor:.75,mix:.65}
  ].map(v=>{
   const rows=idps.map(z=>{
    // Entirely source-backed: do not trust single-source or unavailable
    // consensus. Existing weak evidence remains conservative.
    const support=z.sourceCount>=2?Math.min(1,(z.sourceCount-1)/2):0;
    const evidence=Math.max(0,Math.min(1,z.ev));
    const gap=Math.max(0,v.floor*z.cv-z.value);
    const lift=Math.round(gap*v.mix*support*evidence);
    return {...z,next:z.value+lift,delta:lift,percent:100*lift/Math.max(1,z.value),gap,support};
   });
   const override=new Map(rows.map(r=>[r.id,r.next]));
   const ordered=allRanks.map(x=>({...x,value:override.get(x.id)??x.value})).sort((a,b)=>b.value-a.value);
   const ranks=new Map(ordered.map((x,i)=>[x.id,i+1]));
   const changed=rows.filter(r=>r.delta>0),a=rows.map(r=>r.percent).sort((x,y)=>x-y);
   return {name:v.name,total:rows.length,changed:changed.length,overFivePercent:changed.filter(x=>x.percent>5).length,
    overTenPercent:changed.filter(x=>x.percent>10).length,medianPct:a[Math.floor(a.length*.5)]||0,
    p95Pct:a[Math.floor(a.length*.95)]||0,maxPct:a.at(-1)||0,
    byRole:Object.fromEntries(['LB','DL','DE','DT','DB','CB','S'].map(pos=>[pos,{changed:changed.filter(x=>x.pos===pos).length}])),
    controls:rows.filter(x=>['Dallas Turner','Myles Garrett','Will Anderson Jr.','Maxx Crosby','David Bailey','Carson Schwesinger','Jared Verse','Fred Warner','Abdul Carter','DeShon Elliott','Terrel Bernard'].includes(x.name)).map(x=>({...x,rank:ranks.get(x.id)})),
    largest:[...changed].sort((x,y)=>y.percent-x.percent).slice(0,22)};
  });
  return {sourcePopulation:idps.length,variants};
 });
 console.log('IDP_V72_SMOOTH_SOURCE_EVIDENCE_AUDIT '+JSON.stringify(outcome,null,2));
 if(errors.length)throw Error(errors.join('; '));
}finally{await browser.close()}
