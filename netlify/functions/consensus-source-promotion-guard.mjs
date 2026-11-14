// Never promote a publisher-unverified pinned chart revision over a newer
// publisher-linked revision already stored as last-known-good. This prevents a
// transient article-fetch failure from toggling current dynasty rankings back
// to a stale chart, then forward again on the next successful fetch.
export function findUnverifiedChartRegression(candidateResults=[],previousManifest=[]){
  const prior=(previousManifest||[]).find(x=>x?.source==='The IDP Show Combined');
  const current=(candidateResults||[]).find(x=>x?.source==='The IDP Show Combined');
  if(!prior||!current||current.ok!==true)return null;
  const old=prior.source_provenance||{};
  const now=current.source_provenance||{};
  const previousRevision=String(old.chartRevision||'').trim();
  const incomingRevision=String(now.chartRevision||'').trim();
  if(old.publisherArticleRevisionMatched!==true||!previousRevision)return null;
  // The pinned fallback is useful on initial startup, but it cannot establish
  // that a previously publisher-verified chart was replaced by an older one.
  if(now.pinnedRevision!==true||now.publisherArticleRevisionMatched===true)return null;
  if(!incomingRevision||incomingRevision===previousRevision)return null;
  return {
    source:'The IDP Show Combined',
    previousRevision,
    incomingRevision,
    reason:'Pinned/unverified IDP Show revision cannot replace a distinct publisher-verified revision; retaining complete last-known-good consensus'
  };
}
