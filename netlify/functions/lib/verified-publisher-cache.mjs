// An anonymous refresh can cause a server-derived cache update, but cannot
// supply any stored rank, player ID mapping, model score or source evidence.
// Keep the exact complete publisher results; rebuild a caller's composite
// independently using the requested catalog on a fallback read.
export function verifiedPublisherResults(refresh){
 const rows=refresh?.results;
 if(!Array.isArray(rows)||rows.length!==7||rows.some(r=>r?.valid!==true||!r.id||!r.source||!Array.isArray(r.rankings)||!r.rankings.length)||new Set(rows.map(r=>r.id)).size!==7)return null;
 return rows.map(r=>({id:r.id,source:r.source,valid:true,dynastyVerified:r.dynastyVerified,reducedWeight:r.reducedWeight,rankings:r.rankings}));
}
export function publisherCachePayload(refresh,{sources,updatedAt,sourceManifest}){
 const publisher_results=verifiedPublisherResults(refresh);
 return publisher_results?{schema_version:2,sources,updatedAt,sourceManifest,publisher_results}:null;
}
export function canPersistPublisherCache(context={},env=process.env){
 return String(context?.deploy?.context||env.CONTEXT||'')==='production'&&(!env.BRANCH||env.BRANCH==='main');
}
export function lastGoodComposite(previous,players,build){
 if(previous?.schema_version===2){
  const rows=verifiedPublisherResults({results:previous.publisher_results});
  return rows?build(rows,players):null;
 }
 return previous?.composite||null;
}
export function shareCacheCommit(write){
 const commits=new WeakMap();
 return (refresh,payload)=>{
  if(!payload)return Promise.resolve(false);
  if(commits.has(refresh))return commits.get(refresh);
  const next=Promise.resolve().then(()=>write(payload));
  commits.set(refresh,next);return next;
 };
}
