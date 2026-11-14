import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message||String(e)));
 await page.goto('https://6af891716fb055bedc867ef2--precious-dango-fb4633.netlify.app',{waitUntil:'domcontentloaded',timeout:100000});
 await page.waitForFunction(()=>window.state?.sleeperHistory?.complete===true&&window.__fllConsensusRefresh?.ok===true&&window.__fllValueRefresh?.inFlight===false&&window.ensureMaster?.()?.length>800,null,{timeout:235000});
 const result=await page.evaluate(()=>{
  const s=window.state,all=window.ensureMaster(),cs=s.consensusComposite?.detailsById||{},toNumber=v=>Number.isFinite(Number(v))?Number(v):0;
  const entries=all.filter(z=>window.groupPos?.(z.x)==='IDP'&&z.production?.idpOverallTradeCurveV72).map(z=>{
   const id=String(z.x.id),p=s.players?.[id]||{},d=cs[id]||{},prod=z.production||{},
    listed=(d.idpSources||[]).filter(v=>!String(v).includes('(not listed)'));
   return{id,name:p.full_name||id,age:toNumber(p.age),position:p.position,
    sourceCount:listed.length,sourceNames:listed,consensus:toNumber(d.idpValue),confidence:toNumber(prod.m?.confidence),
    scoring:toNumber(prod.value),baseline:toNumber(prod.idpOverallTradeCurveBaselineV72),
    original:toNumber(z.value),factor:toNumber(prod.idpOverallTradeCurveFactorV72)};
  });
  const allRanks=all.map(z=>({id:String(z.x?.id),value:toNumber(z.value)}));
  const compare=(consensusFloor,baselineCap)=>{
    const rows=entries.map(x=>{
      const eligible=x.sourceCount>=2&&x.confidence>=.5&&x.consensus>0&&x.baseline>0;
      const target=eligible?Math.max(x.original,Math.round(Math.min(baselineCap*x.baseline,consensusFloor*x.consensus))):x.original;
      return {...x,eligible,newValue:target,delta:target-x.original,
        percent:100*(target-x.original)/Math.max(1,x.original)};
    });
    const overrides=new Map(rows.map(x=>[x.id,x.newValue]));
    const projected=allRanks.map(x=>({id:x.id,value:overrides.get(x.id)??x.value})).sort((a,b)=>b.value-a.value);
    const rank=new Map(projected.map((x,i)=>[x.id,i+1]));
    const q=(xs,t)=>{const a=xs.slice().sort((x,y)=>x-y);return a.length?a[Math.floor((a.length-1)*t)]:0};
    const eligible=rows.filter(x=>x.eligible),changed=rows.filter(x=>x.delta!==0);
    return{label:consensusFloor+'/'+baselineCap,eligible:eligible.length,changed:changed.length,
     upOver5pct:changed.filter(x=>x.percent>5).length,upOver10pct:changed.filter(x=>x.percent>10).length,
     medianPercentIncrease:q(eligible.map(x=>x.percent),.5),
     p95PercentIncrease:q(eligible.map(x=>x.percent),.95),
     maxPercentIncrease:q(eligible.map(x=>x.percent),1),
     changeByRole:Object.fromEntries(['DL','DE','LB','DB','DT','CB','S'].map(p=>[p,changed.filter(x=>x.position===p).length])),
     controls:rows.filter(x=>['Dallas Turner','Will Anderson Jr.','Myles Garrett','Maxx Crosby','David Bailey','Jared Verse','Carson Schwesinger','Nick Bosa','Fred Warner','Nakobe Dean'].includes(x.name)).map(x=>({...x,newRank:rank.get(x.id)})),
     largestChanges:[...changed].sort((a,b)=>b.percent-a.percent).slice(0,16)};
  };
  return {count:entries.length,currentTotal:all.length,
   sourceCoverage:{one:entries.filter(x=>x.sourceCount===1).length,two:entries.filter(x=>x.sourceCount===2).length,three:entries.filter(x=>x.sourceCount>=3).length},
   simulations:[[.65,.82],[.7,.82],[.75,.82],[.75,.86],[.8,.86]].map(([a,b])=>compare(a,b))};
 });
 console.log('IDP_MULTI_SOURCE_COMPRESSION_FLOOR_AUDIT '+JSON.stringify({result,errors},null,2));
 if(errors.length)throw Error('Browser errors');
}finally{await browser.close()}
