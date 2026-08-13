import { CONSENSUS_SOURCES, refreshAllSources as baseRefreshAllSources } from "./consensus-adapters.mjs";

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

export function refreshAllSources(opts={}) {
  return baseRefreshAllSources(opts);
}
