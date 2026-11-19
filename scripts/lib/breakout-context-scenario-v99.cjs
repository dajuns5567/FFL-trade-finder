'use strict';
// V99 bounded, research-only dynasty-context scenario. Never touches canonical
// valuation code, does not infer missing dynasty consensus or invent scoring.
// Score breakouts from the native Sleeper cohort, but admit only when FLEECED's
// live regular-season scoring confirms actual qualified games.
const finite=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
function scenario(candidate,live){
  if(!candidate||!live)return{eligible:false,reason:'missing-live-evidence',delta:0};
  const offense=['QB','RB','WR','TE'].includes(String(candidate.position));
  const sourceCount=finite(live.sourceCount);
  const consensus=finite(live.consensusValue);
  const leaguePpg=finite(live.leaguePpg);
  const confidence=finite(live.scoreConfidence);
  const seasons=finite(live.qualifyingSeasons);
  const base=finite(live.baselineValue);
  const nativePercentile=finite(candidate.positionPercentile);
  const games=finite(candidate.currentGames);
  const deltaSnaps=finite(candidate.snapShareDelta);
  const valid=sourceCount!=null&&sourceCount>=(offense?2:1)&&
    consensus!=null&&consensus>0&&
    leaguePpg!=null&&leaguePpg>0&&
    confidence!=null&&confidence>=.30&&
    seasons!=null&&seasons>=1&&
    base!=null&&base>0&&
    nativePercentile!=null&&nativePercentile>=.9&&
    games!=null&&games>=8&&
    deltaSnaps!=null&&deltaSnaps>=.12&&
    String(candidate.roleOpportunity)==='verified-snap-share-increase'&&
    String(candidate.level||'')!=='not-qualified';
  if(!valid)return{eligible:false,reason:'insufficient-consensus-or-league-evidence',delta:0};
  // This is a sensitivity bound, not a claimed fair dynasty value. It confines
  // potential upside to current context only, with NO scoring or market source
  // repricing. Offense is strictly anchored to consensus (<=1.5% of consensus).
  // IDP context scenario <=4% of current canonical served value.
  const sample=clamp(games/14,0,1)*clamp(confidence,0,1);
  const growth=clamp((deltaSnaps-.12)/.30,0,1);
  const strength=sample*growth*clamp((nativePercentile-.90)/.10,0,1);
  const ceiling=offense?Math.min(.015*consensus,.02*base):.04*base;
  const delta=Number((ceiling*strength).toFixed(4));
  return{eligible:true,reason:'verified-context-sensitivity-only',delta,
    baseline:base,scenarioValue:Number((base+delta).toFixed(4)),
    strength:Number(strength.toFixed(5)),
    ceiling:Number(ceiling.toFixed(4)),family:offense?'offense':'idp',
    consensus,consensusSourceCount:sourceCount,leaguePpg,scoringConfidence:confidence};
}
module.exports={scenario};
