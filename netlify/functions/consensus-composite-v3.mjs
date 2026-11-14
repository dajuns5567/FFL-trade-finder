const OFF=new Set(["QB","RB","WR","TE"]);
const IDP=new Set(["DL","DE","DT","LB","DB","CB","S","IDP"]);
const REDUCED=.5,OFF_FLOOR=260,IDP_FLOOR=180,OFF_EXP=.32,IDP_EXP=.45,OFF_SCALE=3000,IDP_SCALE=1800,DUAL_IDP_SHARE=.35,DUAL_CAP=1.20;
const norm=s=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"").replace(/[^a-z0-9]+/gi," ").trim().toLowerCase();
const SUFFIXES=new Set(["jr","sr","ii","iii","iv","v"]);
const canonical=s=>{const p=norm(s).split(" ").filter(Boolean);while(p.length>1&&SUFFIXES.has(p.at(-1)))p.pop();return p.join(" ")};
const parts=s=>canonical(s).split(" ").filter(Boolean);
const positionsOf=p=>new Set((Array.isArray(p?.positions)?p.positions:[p?.position]).filter(Boolean).map(x=>String(x).toUpperCase()));
// Ordinal publisher ranks must survive transient extraction omissions.
// Reindex only a genuinely combined offense/IDP publisher when splitting its
// single cross-position list into two independently valued channels.
const reindex=(rows,splitCombined=false)=>[...(rows||[])]
 .filter(r=>Number.isFinite(Number(r?.rank))&&Number(r.rank)>0&&String(r?.player||"").trim())
 .sort((a,b)=>Number(a.rank)-Number(b.rank))
 .map((r,i)=>({...r,modelRank:splitCombined?i+1:Number(r.rank)}));
function makeChannel(name,weight,rows,splitCombined=false){const indexed=reindex(rows,splitCombined),byName=new Map(),byCanonical=new Map(),byLast=new Map();for(const row of indexed){const key=norm(row.player),list=byName.get(key)||[];list.push(row);byName.set(key,list);const ck=canonical(row.player),cl=byCanonical.get(ck)||[];cl.push(row);byCanonical.set(ck,cl);const ps=parts(row.player),last=ps.at(-1);if(last){const a=byLast.get(last)||[];a.push(row);byLast.set(last,a)}}return{name,weight,rows:indexed,byName,byCanonical,byLast}}
function channels(results){const offense=[],idp=[];for(const r of results||[]){if(!r?.valid)continue;const weight=r.reducedWeight?REDUCED:1;if(r.id==="combined-dynasty"){offense.push(makeChannel("The IDP Show Combined Offense",weight,(r.rankings||[]).filter(x=>String(x?.position||"").toUpperCase()!=="IDP"),true));idp.push(makeChannel("The IDP Show Combined IDP",weight,(r.rankings||[]).filter(x=>String(x?.position||"").toUpperCase()==="IDP"),true));continue}if(r.id==="draftsharks"){offense.push(makeChannel(r.source,weight,r.rankings||[]));continue}if(r.id?.includes("idp")){idp.push(makeChannel(r.source,weight,r.rankings));continue}offense.push(makeChannel(r.source,weight,r.rankings))}return{offense,idp}}
function compatibleFirst(a,b){if(!a||!b)return false;if(a===b)return true;if(a[0]!==b[0])return false;const m=Math.min(a.length,b.length);return m>=3&&(a.slice(0,Math.min(4,m))===b.slice(0,Math.min(4,m))||a.startsWith(b)||b.startsWith(a))}
function positionFilter(rows,positions){if(!positions?.size)return rows;return rows.filter(r=>{const rp=String(r?.position||"").toUpperCase();return !rp||positions.has(rp)||rp==="IDP"})}
function hit(channel,name,positions,strictOffense=false){const key=norm(name),same=channel.byName.get(key)||[],sameByPos=positionFilter(same,positions);if(sameByPos.length===1)return sameByPos[0].modelRank;if(same.length)return null;const ck=canonical(name),canon=positionFilter(channel.byCanonical.get(ck)||[],positions);if(canon.length===1)return canon[0].modelRank;if(canon.length>1)return null;if(strictOffense)return null;const ps=parts(name),first=ps[0],last=ps.at(-1),candidates=positionFilter((channel.byLast.get(last)||[]).filter(r=>{const rp=parts(r.player),rf=rp[0];return compatibleFirst(first,rf)}),positions);return candidates.length===1?candidates[0].modelRank:null}
function mean(hits){const w=hits.reduce((s,x)=>s+x.weight,0);return hits.reduce((s,x)=>s+x.rank*x.weight,0)/w}
// Continuous offense-only robust consensus: all players use the same
// median/MAD-based influence function when 3+ independent sources list them.
// Small differences smoothly receive almost full weight; extreme singleton
// differences receive progressively less. Dispersed/split markets have a
// larger disagreement scale and therefore are not forcefully overridden.
// Low evidence remains conservative (3/4/5-source attenuation floors).
const OFF_ROBUST_MIN_WEIGHT={3:.70,4:.50,5:.35};
function medianRanks(values){const sorted=values.slice().sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2}
function robustOffenseEvidence(listed){
  if(listed.length<3)return[];
  const center=medianRanks(listed.map(x=>x.rank));
  const mad=medianRanks(listed.map(x=>Math.abs(x.rank-center)));
  const scale=Math.max(15,.30*center,1.4826*mad);
  const minWeight=OFF_ROBUST_MIN_WEIGHT[Math.min(5,listed.length)];
  const adjustments=[];
  for(const row of listed){
    const deviation=Math.abs(row.rank-center);
    const relative=deviation/(2*scale);
    const multiplier=minWeight+(1-minWeight)/(1+relative**4);
    const originalWeight=row.weight;
    row.weight=originalWeight*multiplier;
    // Preserve every effective factor for full valuation explainability.
    adjustments.push({source:row.source,rank:row.rank,centerRank:center,
      medianAbsoluteDeviation:mad,disagreementScale:scale,
      observedSourceCount:listed.length,originalWeight,
      adjustedWeight:row.weight,weightMultiplier:multiplier,
      reason:"continuous median/MAD consensus influence; no per-player or source-name exception"});
  }
  return adjustments;
}
function weighted(list,p,floor,strictOffense=false,eligible=null){const hits=[],missing=[];for(const c of list){if(eligible&&!eligible(c))continue;const rank=hit(c,p.name,p.positions,strictOffense);if(Number.isFinite(rank))hits.push({rank,weight:c.weight,source:c.name});else missing.push(c)}if(!hits.length)return{rank:null,hits,outlierAdjustments:[]};if(hits.length===1)return{rank:Math.max(floor,hits[0].rank),hits,outlierAdjustments:[]};const robustWeights=strictOffense?robustOffenseEvidence(hits):[];const outlierAdjustments=robustWeights.filter(x=>x.weightMultiplier<.99);const preliminary=mean(hits);for(const c of missing){const depth=c.rows.length;if(depth>=preliminary*.80)hits.push({rank:Math.min(depth+1,preliminary*1.25),weight:c.weight*.60,source:`${c.name} (not listed)`})}return{rank:mean(hits),hits,outlierAdjustments,robustWeights}}
const curve=(rank,scale,exp)=>Math.max(1,Math.round(scale/Math.pow(Math.max(1,rank),exp)));
// One published row must not silently value multiple distinct Sleeper players.
// For same-canonical-name offense records, a source must expose a position that
// uniquely identifies the target roster player. A rank without identity evidence
// is omitted entirely (not counted as a "not listed" penalty).
function offenseOwnershipAllowed(channel,p,peers){
  if(peers.length<=1)return true;
  const rows=(channel.byCanonical.get(canonical(p.name))||[]).filter(row=>
    OFF.has(String(row.position||'').toUpperCase())&&positionsOf(p).has(String(row.position||'').toUpperCase()));
  if(rows.length!==1)return false;
  const rowPos=String(rows[0].position).toUpperCase();
  const eligible=peers.filter(peer=>positionsOf(peer).has(rowPos));
  return eligible.length===1&&String(eligible[0].id)===String(p.id);
}
export function buildConsensusComposite(results,players){const c=channels(results),counts=new Map(),offenseByCanonical=new Map();
  for(const p of players||[]){
    if(![...positionsOf(p)].some(x=>OFF.has(x)))continue;
    const ck=canonical(p?.name);
    if(!ck)continue;
    const peers=offenseByCanonical.get(ck)||[];
    peers.push(p);offenseByCanonical.set(ck,peers);
  }for(const p of players||[]){const k=norm(p?.name);if(k)counts.set(k,(counts.get(k)||0)+1)}const byId={},byName={},detailsById={};for(const p of players||[]){const id=String(p?.id||"").trim(),name=String(p?.name||"").trim(),key=norm(name),positions=positionsOf(p);if(!id||!key)continue;const hasOff=[...positions].some(x=>OFF.has(x));const hasIdp=[...positions].some(x=>IDP.has(x))||(!hasOff&&positions.size>0);const peers=offenseByCanonical.get(canonical(name))||[];
const o=hasOff?weighted(c.offense,{name,positions},OFF_FLOOR,true,
  channel=>offenseOwnershipAllowed(channel,p,peers)):{rank:null,hits:[]};const d=hasIdp?weighted(c.idp,{name,positions},IDP_FLOOR):{rank:null,hits:[]};const offenseValue=Number.isFinite(o.rank)?curve(o.rank,OFF_SCALE,OFF_EXP):null,idpValue=Number.isFinite(d.rank)?curve(d.rank,IDP_SCALE,IDP_EXP):null;let value=null,kind="none";if(Number.isFinite(offenseValue)&&Number.isFinite(idpValue)){value=Math.min(Math.round(offenseValue*DUAL_CAP),Math.round(offenseValue+idpValue*DUAL_IDP_SHARE));kind="dual"}else if(Number.isFinite(offenseValue)){value=offenseValue;kind="offense"}else if(Number.isFinite(idpValue)){value=idpValue;kind="idp"}if(!Number.isFinite(value))continue;const detail={id,name,kind,consensusCompositeValue:value,offenseRank:o.rank,idpRank:d.rank,offenseValue,idpValue,offenseSources:o.hits.map(x=>x.source),offenseSourceEvidence:o.hits.map(x=>({source:x.source,rank:x.rank,weight:x.weight,baseWeight:(o.robustWeights||[]).find(a=>a.source===x.source)?.originalWeight??x.weight,outlierProtected:(o.outlierAdjustments||[]).some(a=>a.source===x.source),robustEvaluated:(o.robustWeights||[]).some(a=>a.source===x.source),listed:!String(x.source).endsWith(' (not listed)')})),offenseObservedSourceCount:o.hits.filter(x=>!String(x.source).endsWith(' (not listed)')).length,offenseOutlierAdjustments:o.outlierAdjustments||[],offenseRobustWeights:o.robustWeights||[],idpSources:d.hits.map(x=>x.source)};byId[id]=value;if(counts.get(key)===1)byName[name.toLowerCase()]=value;detailsById[id]=detail}return{byId,byName,detailsById,sourceCounts:{offense:c.offense.length,idp:c.idp.length},ambiguousNames:[...counts].filter(([,n])=>n>1).map(([k])=>k)}}
