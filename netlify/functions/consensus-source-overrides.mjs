import { CONSENSUS_SOURCES, refreshAllSources as baseRefreshAllSources } from "./consensus-adapters.mjs";
import { refreshIdpShow } from "./idpshow-adapter.mjs";

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

export async function refreshAllSources(opts={}) {
  const refresh=await baseRefreshAllSources(opts);
  const index=refresh.results.findIndex(result=>result.id==="combined-dynasty");
  if(index>=0){
    try{refresh.results[index]=await refreshIdpShow(opts)}
    catch(error){
      refresh.results[index]={...refresh.results[index],status:"failed",valid:false,stage:"fetch",error:String(error?.message||error),rankings:[],players_extracted:0,ranking_rows:0};
    }
  }
  refresh.successful=refresh.results.filter(result=>result.valid).length;
  return refresh;
}
