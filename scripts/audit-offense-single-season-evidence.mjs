import { chromium } from 'playwright';
const url='https://deploy-preview-463--precious-dango-fb4633.netlify.app';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
const page=await browser.newPage(),errs=[];page.on('pageerror',e=>errs.push(e.message));
const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});if(!response?.ok())throw Error('HTTP '+response?.status());
await page.waitForFunction(()=>window.__fllConsensusRefresh?.ok===true&&window.__fllValueRefresh?.inFlight===false&&window.state?.sleeperHistory?.complete===true&&typeof window.ensureMaster==='function'&&typeof window.assetCurveAudit==='function',null,{timeout:240000});
const data=await page.evaluate(()=>{
 const s=window.state,all=window.ensureMaster(),clamp=(lo,n,hi)=>Math.max(lo,Math.min(hi,n));
 const rows=all.filter(z=>z?.production?.offenseConsensusAnchorV50).map(z=>{
 const id=String(z.x.id),p=s.players?.[id]||{},d=s.consensusComposite?.detailsById?.[id]||{},a=z.production.correctedAudit||{};
 const c=Number(s.consensusComposite?.byId?.[id]),seasons=Number(a.qualifyingSeasons)||0;
 const games=Number(a.samples?.[0]?.games)||0,raw=Number(a.rawValue),corrected=Number(a.value);
 const developed=z.production.dynastyDevelopmentV50?.factor??1;
 const previousP=Number(z.production.effectiveScoringValue);
 // Only compare a positive raw single-season production read with at least 8 verified games.
 const eligible=seasons===1&&games>=8&&Number.isFinite(raw)&&raw>0&&c>0;
 const reliability=raw<c?.12:.35;
 const proposedP=eligible?clamp(.72*c,c+reliability*(raw-c),1.28*c):previousP;
 const valueCtx=Number(z.context)||c;
 let rawTerminal=clamp(.90*c,.60*c+.23*proposedP+.12*valueCtx+.05*c*developed,1.12*c);
 const rank=Number(d.offenseRank);
 if(Number.isFinite(rank)&&rank<=24)rawTerminal=Math.max(rawTerminal,.95*c);
 if(Number.isFinite(rank)&&rank>220)rawTerminal=Math.min(rawTerminal,1.08*c);
 const audit=window.assetCurveAudit(rawTerminal);
 const newValue=Math.max(1,Math.round(audit.curved));
 const old=Number(z.value);
 return{id,name:p.full_name||id,pos:p.position,age:p.age,experience:p.years_exp,c,consensusRank:rank,
  games,seasons,corrected,raw,confidence:a.confidence,existingP:previousP,proposedP,old,newValue,
  delta:newValue-old,percent:100*(newValue-old)/Math.max(1,old),eligible};
 });
 const candidates=rows.filter(x=>x.eligible), changed=rows.filter(x=>x.delta!==0);
 const sorted=[...rows].sort((a,b)=>b.delta-a.delta),abs=changed.map(x=>Math.abs(x.percent)).sort((a,b)=>a-b);
 const q=t=>abs[Math.floor((abs.length-1)*t)]||0;
 return {week:s.sleeperHistory.completedWeek,offenseCount:rows.length,eligible:candidates.length,changed:changed.length,
  up:changed.filter(x=>x.delta>0).length,down:changed.filter(x=>x.delta<0).length,
  medianAbsPct:q(.5),p95AbsPct:q(.95),maxAbsPct:q(1),over5:changed.filter(x=>Math.abs(x.percent)>5).length,
  over10:changed.filter(x=>Math.abs(x.percent)>10).length,
  byPosition:Object.fromEntries(['QB','RB','WR','TE'].map(x=>[x,{eligible:candidates.filter(r=>r.pos===x).length,
    changed:changed.filter(r=>r.pos===x).length}])),
  cases:rows.filter(x=>['Denzel Boston','Jaylen Waddle','Ladd McConkey','KC Concepcion Jr.','Carnell Tate','Mike Evans','Malik Nabers','Ashton Jeanty'].includes(x.name)),
  largest:sorted.slice(0,22),biggestDeclines:sorted.slice(-10)};
});
console.log('SINGLE_SEASON_UNDOUBLE_PENALTY '+JSON.stringify({data,errs},null,2));
if(errs.length)throw Error(errs.join(';'));
}finally{await browser.close()}