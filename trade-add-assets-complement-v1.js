(()=>{
'use strict';
// Finder-only, deterministic complementary outgoing-piece search.
// The selected assets are never replaced, values are read from the canonical
// valuation callback, and no eligibility/fairness rule is changed.
const id=x=>String(x?.type||'')+':'+String(x?.id??'');
const key=xs=>(xs||[]).map(id).sort().join('|');
const defaultPos=x=>x?.type==='pick'?'PICK':String(x?.position||'OTHER').toUpperCase();
const spread=(xs,limit)=>{
 if(xs.length<=limit)return xs.slice();
 const out=[],seen=new Set();
 for(let i=0;i<limit;i++){const at=Math.round(i*(xs.length-1)/Math.max(1,limit-1));if(!seen.has(at)){seen.add(at);out.push(xs[at])}}
 return out;
};
function sampleExtras(owned,chosen,valueOf,positionOf=defaultPos,maxExtras=18){
 const reserved=new Set((chosen||[]).map(id)),values=new Map();
 const pool=[];
 for(const x of owned||[]){
  if(!x||reserved.has(id(x))||values.has(id(x)))continue;
  const value=Math.max(0,Number(valueOf(x))||0);
  if(value<=0)continue;
  values.set(id(x),value);pool.push(x);
 }
 pool.sort((a,b)=>values.get(id(b))-values.get(id(a))||id(a).localeCompare(id(b)));
 if(pool.length<=maxExtras)return pool;
 const categories=new Map();
 for(const x of pool){
  const cat=x.type==='pick'?'PICK':String(positionOf(x)||'OTHER').toUpperCase();
  if(!categories.has(cat))categories.set(cat,[]);
  categories.get(cat).push(x);
 }
 const selected=[],seen=new Set(),take=x=>{if(x&&!seen.has(id(x))&&selected.length<maxExtras){seen.add(id(x));selected.push(x)}};
 // Allocate slots to each positional family, with higher, middle and lower
 // values represented so useful complements aren't just the top 8 stars.
 for(const stage of [0,.5,1])for(const group of categories.values())
  take(group[Math.round((group.length-1)*stage)]);
 for(const x of spread(pool,Math.min(pool.length,Math.max(maxExtras*2,24))))take(x);
 for(const x of pool)take(x);
 return selected;
}
function choosePairs(extras,valueOf,positionOf=defaultPos,maxPairs=64){
 const rows=[];
 for(let i=0;i<extras.length;i++)for(let j=i+1;j<extras.length;j++){
  const a=extras[i],b=extras[j],v=Math.max(0,Number(valueOf(a))||0)+Math.max(0,Number(valueOf(b))||0);
  const aPos=a.type==='pick'?'PICK':String(positionOf(a)||'OTHER').toUpperCase();
  const bPos=b.type==='pick'?'PICK':String(positionOf(b)||'OTHER').toUpperCase();
  rows.push({assets:[a,b],value:v,shape:[aPos,bPos].sort().join('+'),ids:[id(a),id(b)]});
 }
 if(rows.length<=maxPairs)return rows.map(r=>r.assets);
 const values=rows.map(r=>r.value).sort((a,b)=>a-b),vmin=values[0],vmax=values.at(-1),use=new Map(),shapeUse=new Map(),bandUse=new Map(),selected=[];
 // Greedy finite-size sampling discourages repeatedly adding the same
 // superstar and includes player+pick, cross-position and balanced packages.
 while(rows.length&&selected.length<maxPairs){
  let best=-1,bestScore=Infinity;
  for(let i=0;i<rows.length;i++){
   const r=rows[i],u=r.ids.map(k=>use.get(k)||0),
    band=Math.min(4,Math.floor(5*(r.value-vmin)/Math.max(1,vmax-vmin+1))),
    score=Math.max(...u)*10000+(u[0]+u[1])*1000+
      (shapeUse.get(r.shape)||0)*120+(bandUse.get(band)||0)*65+i*.001;
   if(score<bestScore){bestScore=score;best=i}
  }
  const r=rows.splice(best,1)[0];
  selected.push(r.assets);
  for(const k of r.ids)use.set(k,(use.get(k)||0)+1);
  shapeUse.set(r.shape,(shapeUse.get(r.shape)||0)+1);
  const band=Math.min(4,Math.floor(5*(r.value-vmin)/Math.max(1,vmax-vmin+1)));
  bandUse.set(band,(bandUse.get(band)||0)+1);
 }
 return selected;
}
function build(chosen,owned,valueOf,positionOf=defaultPos,{maxExtras=18,maxPairs=64,maxAssets=3}={}){
 if(!Array.isArray(chosen)||!chosen.length||chosen.length>maxAssets)return[];
 const result=[chosen.slice()],seen=new Set([key(chosen)]);
 if(chosen.length>=maxAssets)return result;
 const extras=sampleExtras(owned,chosen,valueOf,positionOf,maxExtras);
 const singles=extras.map(x=>[...chosen,x]);
 const pairs=chosen.length===1?choosePairs(extras,valueOf,positionOf,maxPairs).map(xs=>[...chosen,...xs]):[];
 const add=xs=>{const k=key(xs);if(xs.length<=maxAssets&&!seen.has(k)){seen.add(k);result.push(xs)}};
 let i=0,j=0;
 while(i<singles.length||j<pairs.length){
  if(i<singles.length)add(singles[i++]);
  if(j<pairs.length)add(pairs[j++]);
  if(j<pairs.length)add(pairs[j++]);
 }
 return result;
}
function diversify(rows,chosen,limit=140){
 if(!Array.isArray(rows)||!rows.length||!Array.isArray(chosen)||!chosen.length)return(rows||[]).slice(0,limit);
 const baseSet=new Set(chosen.map(id)),bucket={0:[],1:[],2:[]};
 for(const row of rows){
  const give=row?.give||[],ids=new Set(give.map(id));
  if(![...baseSet].every(k=>ids.has(k))||give.length>3)continue;
  const extras=give.filter(x=>!baseSet.has(id(x)));
  if(extras.length>2)continue;
  bucket[extras.length].push({row,extra:extras});
 }
 const pattern=chosen.length===1?[0,1,2,1,2,1,2]:[0,1,1,0,1,1],used=new Set(),assetUse=new Map(),
 out=[],next=(n)=>{
  const pool=bucket[n];if(!pool?.length)return null;
  let bi=0,best=Infinity;
  for(let i=0;i<Math.min(50,pool.length);i++){
   const keys=pool[i].extra.map(id),use=keys.map(k=>assetUse.get(k)||0);
   const score=(use.length?Math.max(...use):0)*1000+use.reduce((a,b)=>a+b,0)*100+i;
   if(score<best){best=score;bi=i}
  }
  const candidate=pool.splice(bi,1)[0];
  for(const x of candidate.extra){const k=id(x);assetUse.set(k,(assetUse.get(k)||0)+1)}
  return candidate.row;
 };
 let step=0;
 while(out.length<limit&&(bucket[0].length||bucket[1].length||bucket[2].length)){
  let r=null;
  for(let tries=0;tries<pattern.length;tries++){r=next(pattern[(step+tries)%pattern.length]);if(r){step=(step+tries+1)%pattern.length;break}}
  if(!r)break;
  if(!used.has(r)){used.add(r);out.push(r)}
 }
 return out;
}
window.tradeAddAssetsComplementV1={build,diversify,sampleExtras,choosePairs};
})();
