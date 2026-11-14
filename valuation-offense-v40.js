(()=>{
'use strict';
// V50: terminal offense-only consensus anchor. Recalculate all covered QB/RB/WR/TE
// rows exactly once from the source composite and qualified Sleeper production.
// Earlier V30-V49 calibrations remain available for diagnostics, but may not
// compound their young-player projections or veteran production at the terminal.
const previousMaster50=masterRankings;
const OFF50=new Set(['QB','RB','WR','TE']);
const finite50=v=>v==null||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const clamp50=(lo,x,hi)=>Math.max(lo,Math.min(hi,x));
function production50(c,a){
  const seasons=Math.max(0,finite50(a?.qualifyingSeasons)??0);
  const observed=finite50(a?.value);
  if(!seasons||observed==null)return{value:c,seasons,reason:'neutral-missing-history'};
  // One qualified season is weak evidence, not a complete dynasty verdict.
  // Two seasons earn more weight; long-term production remains a secondary anchor.
  const reliability=seasons===1?(observed<c?.12:.35):seasons===2?.60:1;
  // Three-year regular-season production is an anchor, not a replacement
  // for verified dynasty PPR consensus. Established veterans cannot gain a
  // +28% scoring-only premium that reverses stronger multi-source dynasty
  // evidence for emerging players. Constrain ONLY the positive premium of
  // 3+ qualifying-season players; preserve all 0-2-season evidence rules and
  // the established downside adjustment. No player- or position-specific
  // boost, injury guess, smoothing, or consensus override is introduced.
  const upper=seasons>=3?1.20*c:1.28*c;
  return{value:clamp50(.72*c,c+reliability*(observed-c),upper),
    seasons,reason:'qualified-sleeper-anchor',reliability};
}
function sourceStatus50(sourceNames){
  const records=state.rankings||{};
  const snapshots=sourceNames.filter(n=>!String(n).endsWith(' (not listed)')).map(name=>{
    const r=records[name]||{},f=r.freshness||{};
    const time=f.fetchedAt||r.updated||r.updatedAt||null;
    const parsed=time?Date.parse(time):NaN;
    const fetchAgeDays=Number.isFinite(parsed)?Math.max(0,(Date.now()-parsed)/86400000):null;
    const pub=f.publisherUpdatedAt||null,updated=pub?Date.parse(pub):NaN;
    const publisherAgeDays=Number.isFinite(updated)?Math.max(0,(Date.now()-updated)/86400000):null;
    const changed=f.contentLastChangedAt||null,changeTime=changed?Date.parse(changed):NaN;
    return{source:String(name),snapshotUpdatedAt:time,ageDays:fetchAgeDays,fetchAgeDays,
      publisherUpdatedAt:pub,publisherAgeDays,
      contentLastChangedAt:changed,contentChangeAgeDays:Number.isFinite(changeTime)?Math.max(0,(Date.now()-changeTime)/86400000):null,
      contentChangeStatus:f.contentChangeStatus||'unknown',
      marketObservation:f.observation||r.observation||null};
  });
  return{snapshots,unknownDates:snapshots.filter(s=>s.ageDays==null).length,
    olderThan30Days:snapshots.filter(s=>s.fetchAgeDays!=null&&s.fetchAgeDays>30).length,
    unknownPublisherDates:snapshots.filter(s=>s.publisherAgeDays==null).length,
    publisherOlderThan30Days:snapshots.filter(s=>s.publisherAgeDays!=null&&s.publisherAgeDays>30).length};
}
function rebuild50(z){
  const pos=String(groupPos(z?.x)||'').toUpperCase();
  if(!OFF50.has(pos))return z; // No IDP, pick or other position changes.
  // V384 has already verified these players lack exact offensive-source coverage.
  // Do not resurrect an unverified fuzzy composite by revaluing its fallback slot.
  if(z?.coverageGate384===true)return z;
  const id=String(z?.x?.id??'');
  const c=finite50(state.consensusComposite?.byId?.[id]);
  if(c==null||c<=0)return z; // Never manufacture a missing consensus.
  const detail=state.consensusComposite?.detailsById?.[id]||{};
  const rank=finite50(detail.offenseRank);
  const a=z?.production?.correctedAudit||{};
  const p=production50(c,a);
  const sourceStatus=sourceStatus50(Array.isArray(detail.offenseSources)?detail.offenseSources:[]);
  const ctx=clamp50(.90*c,finite50(z?.context)??c,1.15*c);
  const ageFactor=clamp50(.88,finite50(z?.production?.ageFactor)??1,1.10);
  const raw=.70*c+.18*p.value+.08*ctx+.04*c*ageFactor;
  let constrained=clamp50(.90*c,raw,1.12*c);
  if(rank!=null&&rank<=24)constrained=Math.max(constrained,.95*c);
  if(rank!=null&&rank>220)constrained=Math.min(constrained,1.08*c);
  const curve=typeof window.assetCurveAudit==='function'
    ?window.assetCurveAudit(constrained):null;
  const exact=finite50(curve?.exact)??constrained;
  const curved=finite50(curve?.curved)??Math.round(constrained);
  return{...z,value:Math.max(1,Math.round(curved)),consensus:Math.round(c),
    context:Math.round(ctx),production:{...(z.production||{}),
      offenseConsensusAnchorV50:true,offenseTerminalRawV50:constrained,
      offenseTerminalExactV50:exact,effectiveScoringValue:Math.round(p.value),
      consensusSourceRankV50:rank,
      consensusSourceEvidenceV50:Array.isArray(detail.offenseSourceEvidence)?detail.offenseSourceEvidence.map(e=>({...e})):[],
      consensusSnapshotsV50:sourceStatus.snapshots,
      consensusUnknownSnapshotDatesV50:sourceStatus.unknownDates,
      consensusSourcesOlderThan30DaysV50:sourceStatus.olderThan30Days,
      consensusUnknownPublisherDatesV50:sourceStatus.unknownPublisherDates,
      consensusPublisherOlderThan30DaysV50:sourceStatus.publisherOlderThan30Days,
      consensusSourcesV50:Array.isArray(detail.offenseSources)?detail.offenseSources.slice():[],
      consensusSourceCountV50:Array.isArray(detail.offenseSources)?detail.offenseSources.filter(s=>!String(s).includes('(not listed)')).length:0,
      consensusNotListedPenaltyCountV50:Array.isArray(detail.offenseSources)?detail.offenseSources.filter(s=>String(s).includes('(not listed)')).length:0,
      ageYearsV50:finite50(state.players?.[id]?.age),
      productionHistoryReasonV50:p.reason,
      productionReliabilityV50:p.reliability??0,
      productionSeasonsV50:p.seasons,
      modelWeights:{consensus:.70,scoringLookback:.18,
        scarcityAndOtherContext:.08,ageContext:.04}}};
}
masterRankings=function(){return previousMaster50().map(rebuild50)
  .sort((a,b)=>Number(b.value)-Number(a.value))};
ensureMaster=function(){return masterRankCache||(masterRankCache=masterRankings())};
playerRankValue=function(x){const arr=ensureMaster(),i=arr.findIndex(z=>String(z.x.id)===String(x.id));
  if(i<0)return{rank:999,value:1,tier:9,consensus:null,context:null};
  const z=arr[i],rank=i+1,tiers=[12,24,48,80,120,180,260,400,9999];
  let tier=tiers.findIndex(m=>rank<=m);if(tier<0)tier=8;
  return{rank,value:z.value,tier:tier+1,consensus:z.consensus,context:z.context}};
baseValue=function(x){if(x.type==='pick')return pickValue(x);
  if(valueCache.has(x.id))return valueCache.get(x.id);
  const v=playerRankValue(x).value;valueCache.set(x.id,v);return v};
masterRankCache=null;valueCache.clear();fitCache.clear();stageCache.clear();
window.offenseConsensusAnchorV50={version:50,rebuild:rebuild50,production:production50};
})();
