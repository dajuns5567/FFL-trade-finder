import { CONSENSUS_SOURCES, refreshAllSources as baseRefreshAllSources } from "./consensus-adapters.mjs";

const blockedPfnIndex=CONSENSUS_SOURCES.findIndex(source=>source.id==="pfn");
if(blockedPfnIndex>=0){
  CONSENSUS_SOURCES.splice(blockedPfnIndex,1,{
    id:"dynastynerds",
    name:"Dynasty Nerds",
    type:"offense",
    format:"dynasty-superflex",
    urls:["https://www.dynastynerds.com/dynasty-rankings/superflex/"]
  });
}

export function refreshAllSources(opts={}) {
  return baseRefreshAllSources(opts);
}
