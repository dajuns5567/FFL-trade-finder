// V322 broad, deterministic trade-fairness safety audit.
// V321 reconstructed from the exact canonical V322 adjustment by removing
// ONLY the appended peer-quality attenuation; all other code and valuations match.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const current=fs.readFileSync('trade-runtime-v256-compiled.js','utf8');
const suffix='const base=Math.min(Math.max(scarcityPremium,packageGapFloor),depthCap);const peerStrength=clamp(0,(rel-.80)/.20,1);const peerFactor=1-.75*peerStrength;const qualityStrength=(otherAssets||[]).filter(x=>x?.type===\'player\').reduce((sum,x)=>sum+clamp(0,(75-rankOf(x))/15,1)*clamp(0,(av(x)-5200)/300,1),0);const multiStarterFactor=1-.30*clamp(0,qualityStrength-1,1);return base*peerFactor*multiStarterFactor';
const original='return Math.min(Math.max(scarcityPremium,packageGapFloor),depthCap)';
assert.equal(current.split(suffix).length,2,'V322 must preserve exactly one identifiable adjustment delta; review changed source before testing');
const prior=current.replace(suffix,original);
function engine(src){
 const document={__v131sel:false,addEventListener(){},querySelectorAll(){return []},getElementById(){return null}};
 const ctx={document,console,setTimeout(){},setInterval(){},MutationObserver:function(){}};
 ctx.window=ctx;ctx.state={players:{},teams:[],allAssets:[],assetsA:[],assetsB:[]};
 ctx.tradeValueNormalizationV130={canonicalValue:a=>a.v,install(){}};
 ctx.playerRankValue=a=>({rank:a.rank||9999});
 ctx.playerName=a=>a.id;ctx.groupPos=a=>a.pos||'WR';
 vm.createContext(ctx);vm.runInContext(src,ctx);
 assert.equal(typeof ctx.section1V130?.fair,'function');
 return ctx.section1V130.fair;
}
const oldFair=engine(prior),newFair=engine(current);
const P=(id,v,rank,pos)=>({id,type:'player',v,rank,pos});
const K=(id,v,round=1,season=2028)=>({id,type:'pick',v,season,round});
const tiers=[
 ['ELITE',9500,3],['PREMIUM',8700,12],['HIGH',7800,27],['STRONG',6800,50],
 ['STARTER',5700,75],['MID',4500,115],['FLEX',3400,175],['DEPTH',2300,250],['BENCH',1100,400]
];
const positions=['QB','RB','WR','TE','IDP'];
const players=tiers.flatMap(([t,v,r],i)=>positions.map((pos,j)=>P(t+'-'+pos,v-j*53,r+j,pos)));
const picks=[K('2027-R1-EARLY',5800),K('2028-R1-MID',4300),K('2029-R1-LATE',2500),
 K('2028-R2',1750,2),K('2029-R3',550,3)];
const pick=(tier,pos)=>players[tiers.findIndex(x=>x[0]===tier)*positions.length+positions.indexOf(pos)];
const packages=[],uniq=new Set();
function add(a,b,shape,category){
 if(!a.length||!b.length)return;
 if([...a,...b].some(x=>!x))throw Error('Fixture missing');
 const names=xs=>xs.map(x=>x.id).sort().join(',');
 const id=names(a)+'~'+names(b);
 if(uniq.has(id))return;uniq.add(id);
 packages.push({a,b,shape,category});
}
// Cover value ladder across ALL positions, both directions, plus mixed tiers.
for(const x of players)for(const y of players){
 if(x.id===y.id)continue;
 const diff=players.filter(z=>z.id!==x.id&&z.id!==y.id);
 const own=diff.filter(z=>z.pos===y.pos);
 add([x],[y],'1v1','player-peers');
 for(const z of [own[0],own[Math.floor(own.length/2)],own.at(-1)]){
  if(z)add([x],[y,z],'1v2','same-position');
 }
 for(const z of [diff[4],diff[17],diff[30]]){
  if(z)add([x],[y,z],'1v2','mixed-positions');
 }
 for(const extra of [picks[0],picks[2],picks[4]])add([x],[y,extra],'1v2','pick-addon');
 for(const z of [diff[8],diff[24]]){
  const w=diff.find(k=>k.id!==z.id&&k.pos!==y.pos);
  if(z&&w)add([x],[y,z,w],'1v3','three-player-depth');
 }
 const a2=diff.find(z=>z.pos!==x.pos);
 const b2=diff.find(z=>z.id!==a2?.id&&z.pos!==y.pos);
 if(a2&&b2)add([x,a2],[y,b2],'2v2','two-premium-sides');
}
// Explicit additional shapes, picks and IDP inclusions not covered by 1vX.
for(const p of positions)for(const tier of ['ELITE','HIGH','STARTER','MID','DEPTH']){
 const a=pick(tier,p),q=pick('MID',p),r=pick('DEPTH',p),s=pick('FLEX',p);
 const otherPos=positions[(positions.indexOf(p)+1)%positions.length];
 add([a,q],[pick('HIGH',otherPos),pick('MID',otherPos),picks[2]],'2v3','mixed-picks');
 add([a],[q,r,s,picks[4]],'1v4','four-assets');
 add([a,q,picks[3]],[pick('HIGH',otherPos),pick('STARTER',otherPos),picks[0]],'3v3','mixed-3v3');
 add([a,picks[1]],[q,picks[0]],'2v2','picks-both-sides');
 add([a],[picks[0],picks[1]],'1v2','all-pick-counter');
 add([picks[0],picks[1]],[a],'2v1','all-pick-premium');
}
// Separate same-currency nearby raw totals, ratio boundaries and elite depth.
for(const tier of ['ELITE','PREMIUM','HIGH','STARTER','MID']){
 for(const p of positions){
  const x=pick(tier,p);
  for(const otherTier of ['PREMIUM','HIGH','STARTER','MID','FLEX','DEPTH']){
   const y=pick(otherTier,positions[(positions.indexOf(p)+2)%positions.length]);
   for(const z of [picks[0],picks[1],picks[2],picks[3],picks[4]]){
    add([x],[y,z],'1v2','premium-versus-pick');
   }
  }
 }
}
let invariants=0,violations=[],outcomes=[],byShape={},byGroup={};
const inc=(obj,key,v)=>{const x=obj[key]||(obj[key]={count:0,changed:0,up:0,down:0,nearOld:0,nearNew:0,intoFair:0,outOfFair:0,maxMove:0});x.count++;
 if(v.delta){x.changed++;if(v.delta>0)x.up++;else x.down++;}
 if(v.oldGap<=100)x.nearOld++;if(v.newGap<=100)x.nearNew++;
 if(v.oldScore<82&&v.newScore>=82)x.intoFair++;
 if(v.oldScore>=82&&v.newScore<82)x.outOfFair++;
 x.maxMove=Math.max(x.maxMove,Math.abs(v.delta));
};
for(const x of packages){
 let old=oldFair(x.a,x.b),now=newFair(x.a,x.b),swap=newFair(x.b,x.a);
 const oldGap=Math.abs(old.aEffective-old.bEffective),newGap=Math.abs(now.aEffective-now.bEffective);
 const rawA=x.a.reduce((s,a)=>s+a.v,0),rawB=x.b.reduce((s,a)=>s+a.v,0);
 const error=message=>violations.push({shape:x.shape,category:x.category,assetsA:x.a.map(a=>a.id),assetsB:x.b.map(a=>a.id),message});
 if(old.aRaw!==rawA||old.bRaw!==rawB||now.aRaw!==rawA||now.bRaw!==rawB)error('canonical raw totals changed');
 if(now.score!==swap.score||Math.abs(now.aAdj-swap.bAdj)>1e-8||Math.abs(now.bAdj-swap.aAdj)>1e-8)error('side-swap asymmetry');
 if(!Number.isFinite(now.score)||![now.aAdj,now.bAdj,now.aEffective,now.bEffective].every(Number.isFinite))error('non-finite output');
 if(now.aAdj<0||now.bAdj<0||(now.aAdj>0&&now.bAdj>0))error('invalid adjustment allocation');
 if(x.a.length===1&&x.b.length===1&&(now.aAdj||now.bAdj))error('one for one consolidation bonus');
 if(now.aAdj>0&&Math.max(...x.a.map(a=>a.v))<=Math.max(...x.b.map(a=>a.v)))error('wrong adjustment side A');
 if(now.bAdj>0&&Math.max(...x.b.map(a=>a.v))<=Math.max(...x.a.map(a=>a.v)))error('wrong adjustment side B');
 const counter=now.aAdj>0?x.b:now.bAdj>0?x.a:null;
 if(counter){
  const depth=counter.reduce((s,a)=>s+a.v,0)-Math.max(...counter.map(a=>a.v));
  if(Math.max(now.aAdj,now.bAdj)>depth+1e-6)error('adjustment greater than depth');
 }
 const result={delta:now.score-old.score,oldScore:old.score,newScore:now.score,
  oldGap,newGap,oldAdj:old.aAdj+old.bAdj,newAdj:now.aAdj+now.bAdj,
  shape:x.shape,category:x.category,A:x.a.map(a=>a.id),B:x.b.map(a=>a.id)};
 outcomes.push(result);inc(byShape,x.shape,result);inc(byGroup,x.category,result);
 invariants++;
}
const sorted=[...outcomes].sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
const danger=outcomes.filter(x=>Math.abs(x.delta)>=25);
const originalNear=outcomes.filter(x=>x.oldGap<=100);
const currentNear=outcomes.filter(x=>x.newGap<=100);
const nearReclassified=outcomes.filter(x=>(x.oldGap<=100)!==(x.newGap<=100));
const bigMoves=sorted.slice(0,35);
const results={version:'V322-wide-safety-audit',builtFrom:'deterministic player/pick value tiers; no invented consensus data',
 sources:'site canonical compiled fair() and exact V321 baseline delta',total:packages.length,
 invariantsTested:invariants,hardViolations:violations.length,
 nearEqual:{old:originalNear.length,new:currentNear.length,reclassified:nearReclassified.length},
 scoreMoves:{changed:outcomes.filter(x=>x.delta).length,
 large25:danger.length,negative:outcomes.filter(x=>x.delta<0).length,
 positive:outcomes.filter(x=>x.delta>0).length},
 byShape,byGroup,biggestChanges:bigMoves,
 examples:nearReclassified.slice(0,60)};
console.log('WIDE VALUE ADJUSTMENT SAFETY AUDIT:\n'+JSON.stringify(results,null,2));
if(violations.length){console.error('HARD INVARIANT FAILURES',JSON.stringify(violations.slice(0,25),null,2));process.exitCode=1;}
if(danger.length)console.warn('REVIEW REQUIRED: '+danger.length+' score swings >=25; evaluate quality independently rather than optimizing counts.');
if(packages.length<10000)throw Error('Expected broad audit to cover 10,000+ distinct combinations, got '+packages.length);
console.log('Wide matrix exercised '+packages.length+' combinations; '+violations.length+' mathematical safety violations.');

// Discontinuity guard: a one-rank or one-value-point change must not cause
// an abrupt >300-point effective consolidation jump. The V322 current
// The former binary qualityStarters >= 2 branch violated this at rank 60/61 and value 5500; guard the continuous replacement.
const premium=[P('boundary-elite',9500,3,'QB')];
const first=P('boundary-peer',7500,30,'WR');
const atRank60=newFair(premium,[first,P('boundary-second',5500,60,'RB')]);
const atRank61=newFair(premium,[first,P('boundary-second',5500,61,'RB')]);
const atValue5500=newFair(premium,[first,P('boundary-second',5500,60,'RB')]);
const atValue5499=newFair(premium,[first,P('boundary-second',5499,60,'RB')]);
const rankCliff=Math.abs(atRank60.aAdj-atRank61.aAdj);
const valueCliff=Math.abs(atValue5500.aAdj-atValue5499.aAdj);
console.log('Threshold continuity audit:',JSON.stringify({
 rank60Adjustment:atRank60.aAdj,rank61Adjustment:atRank61.aAdj,
 rankCliff,value5500Adjustment:atValue5500.aAdj,
 value5499Adjustment:atValue5499.aAdj,valueCliff
}));
assert.ok(rankCliff<=300,
 'RELEASE BLOCKER: one rank (60=>61) changes Value Adjustment by '+Math.round(rankCliff)+', violating smooth calibration');
assert.ok(valueCliff<=300,
 'RELEASE BLOCKER: one canonical value point (5500=>5499) changes Value Adjustment by '+Math.round(valueCliff)+', violating smooth calibration');

