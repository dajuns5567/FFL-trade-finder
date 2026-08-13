import { CONSENSUS_SOURCES, refreshAllSources as baseRefreshAllSources } from "./consensus-adapters.mjs";
import { refreshIdpShow } from "./idpshow-adapter.mjs";
import { refreshFanRanked } from "./fanranked-adapter.mjs";
import { refreshKtc } from "./ktc-adapter.mjs";
import { refreshRotowireIdp } from "./rotowire-idp-adapter.mjs";
import { refreshDraftSharksIdp } from "./draftsharks-idp-adapter.mjs";
import { refreshDraftSharksOffense } from "./draftsharks-offense-adapter.mjs";

const draftSharksSource=CONSENSUS_SOURCES.find(source=>source.id==="draftsharks");
if(draftSharksSource){draftSharksSource.urls=["https://www.draftsharks.com/dynasty-rankings/ppr-superflex"];draftSharksSource.format="dynasty-ppr-superflex";}

const blockedPfnIndex=CONSENSUS_SOURCES.findIndex(source=>source.id==="pfn");
if(blockedPfnIndex>=0){
  CONSENSUS_SOURCES.splice(blockedPfnIndex,1,{
    id:"combined-dynasty",
    name:"The IDP Show Combined",
    type:"mixed",
    format:"combined-offense-idp-dynasty",
    urls:["https://www.theidpshow.com/p/combined-idp-offense-dynasty-rankings-fantasy-football"]
  });
}

const pffIdpIndex=CONSENSUS_SOURCES.findIndex(source=>source.id==="pff-idp");
if(pffIdpIndex>=0){
  CONSENSUS_SOURCES.splice(pffIdpIndex,1,{
    id:"rotowire-idp",
    name:"RotoWire IDP",
    type:"idp",
    format:"2026-idp-cheatsheet",
    reducedWeight:true,
    urls:["https://www.rotowire.com/football/cheatsheet-idp.php"]
  });
}

const dynastyDealerIndex=CONSENSUS_SOURCES.findIndex(source=>source.id==="dynasty-dealer-idp");
if(dynastyDealerIndex>=0)CONSENSUS_SOURCES.splice(dynastyDealerIndex,1);

export async function refreshAllSources(opts={}) {
  const [refresh,fanRanked,ktc,rotowireIdp,draftSharksIdp,draftSharksOffense]=await Promise.all([
    baseRefreshAllSources(opts),
    refreshFanRanked(opts),
    refreshKtc(opts),
    refreshRotowireIdp(opts),
    refreshDraftSharksIdp(opts),
    refreshDraftSharksOffense(opts)
  ]);
  const combinedIndex=refresh.results.findIndex(result=>result.id==="combined-dynasty");
  if(combinedIndex>=0){
    try{refresh.results[combinedIndex]=await refreshIdpShow(opts)}
    catch(error){refresh.results[combinedIndex]={...refresh.results[combinedIndex],status:"failed",valid:false,stage:"fetch",error:String(error?.message||error),rankings:[],players_extracted:0,ranking_rows:0};}
  }

  const draftSharksIndex=refresh.results.findIndex(result=>result.id==="draftsharks");
  if(draftSharksIndex>=0)refresh.results[draftSharksIndex]=draftSharksOffense;
  else refresh.results.push(draftSharksOffense);

  const ktcIndex=refresh.results.findIndex(result=>result.id==="ktc");
  if(ktcIndex>=0)refresh.results[ktcIndex]=ktc;
  else refresh.results.push(ktc);

  const draftSharksIdpIndex=refresh.results.findIndex(result=>result.id==="draftsharks-idp");
  if(draftSharksIdpIndex>=0)refresh.results[draftSharksIdpIndex]=draftSharksIdp;
  else refresh.results.push(draftSharksIdp);

  const rotowireIndex=refresh.results.findIndex(result=>result.id==="rotowire-idp");
  if(rotowireIndex>=0)refresh.results[rotowireIndex]=rotowireIdp;
  else refresh.results.push(rotowireIdp);

  refresh.results.push(fanRanked);
  refresh.total=refresh.results.length;
  refresh.successful=refresh.results.filter(result=>result.valid).length;
  return refresh;
}
