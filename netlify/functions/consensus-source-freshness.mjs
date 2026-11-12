// Consensus source freshness is observational: a successful fetch does not prove
// that the publisher changed its rankings. Never synthesize a publisher update date.
import { createHash } from 'node:crypto';
const ISO = v => { if(typeof v!=='string'||!v.trim())return null;const d=Date.parse(v);return Number.isFinite(d)?new Date(d).toISOString():null; };
const DAY=86400000;
export function sourceFingerprint(data) {
  const entries=Object.entries(data||{}).map(([name,rank])=>[name,Number(rank)]).sort((a,b)=>a[0].localeCompare(b[0]));
  return createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}
export function marketObservationFreshness(rows,now=new Date().toISOString()) {
  const time=Date.parse(now);
  const dates=(rows||[]).map(x=>ISO(x?.capturedAt)).filter(Boolean).sort();
  const unknown=(rows||[]).length-dates.length;
  const olderThan30Days=dates.filter(x=>Number.isFinite(time)&&time-Date.parse(x)>30*DAY).length;
  return {kind:'player-market-observation',sampleSize:(rows||[]).length,
    datedRows:dates.length,undatedRows:unknown,oldestObservationAt:dates[0]||null,
    newestObservationAt:dates.at(-1)||null,rowsOlderThan30Days:olderThan30Days,
    publisherUpdatedAt:null};
}
export function buildFreshnessSnapshot(snapshot,previous,now=new Date().toISOString()) {
  const fetchedAt=ISO(now);
  const fingerprint=sourceFingerprint(snapshot?.data);
  const before=previous?.data?sourceFingerprint(previous.data):null;
  const changed=before!==null && before!==fingerprint;
  const unchanged=before!==null && before===fingerprint;
  return {
    fetchedAt, // successful network retrieval
    publisherUpdatedAt:ISO(snapshot?.publisherUpdatedAt), // ONLY explicit publisher metadata
    publisherUpdateStatus:ISO(snapshot?.publisherUpdatedAt)?'verified':'unknown',
    observedFirstAt:ISO(previous?.freshness?.observedFirstAt)||fetchedAt,
    contentLastChangedAt:changed?fetchedAt:ISO(previous?.freshness?.contentLastChangedAt),
    contentChangeStatus:changed?'changed':unchanged?'unchanged':'unknown-baseline',
    unchangedFetchCount:unchanged?(Number(previous?.freshness?.unchangedFetchCount)||0)+1:0,
    unchangedSinceAt:unchanged
      ? ISO(previous?.freshness?.unchangedSinceAt)
        || ISO(previous?.freshness?.fetchedAt)
        || ISO(previous?.updated)
        || null
      : null,
    contentFingerprint:fingerprint,
    observation: snapshot?.observation||previous?.freshness?.observation||null
  };
}
export function ageFreshness(freshness,now=new Date().toISOString()) {
  const current=Date.parse(now);
  const days=v=>{const t=Date.parse(v||'');return Number.isFinite(current)&&Number.isFinite(t)?Math.max(0,(current-t)/DAY):null;};
  return {fetchAgeDays:days(freshness?.fetchedAt),publisherAgeDays:days(freshness?.publisherUpdatedAt),
    lastContentChangeAgeDays:days(freshness?.contentLastChangedAt),
    publisherAgeKnown:!!freshness?.publisherUpdatedAt};
}
