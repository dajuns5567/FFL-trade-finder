import { CONSENSUS_SOURCES, refreshAllSources as baseRefreshAllSources } from "./consensus-adapters.mjs";
import { refreshIdpShow } from "./idpshow-adapter.mjs";
import { refreshFanRanked } from "./fanranked-adapter.mjs";
import { refreshKtc } from "./ktc-adapter.mjs";

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
  const [refresh,fanRanked,ktc]=await Promise.all([
    baseRefreshAllSources(opts),
    refreshFanRanked(opts),
    refreshKtc(opts)
  ]);
  const combinedIndex=refresh.results.findIndex(result=>result.id==="combined-dynasty");
  if(combinedIndex>=0){
    try{refresh.results[combinedIndex]=await refreshIdpShow(opts)}
    catch(error){
      refresh.results[combinedIndex]={...refresh.results[combinedIndex],status:"failed",valid:false,stage:"fetch",error:String(error?.message||error),rankings:[],players_extracted:0,ranking_rows:0};
    }
  }
  const ktcIndex=refresh.results.findIndex(result=>result.id==="ktc");
  if(ktcIndex>=0)refresh.results[ktcIndex]=ktc;
  else refresh.results.push(ktc);
  refresh.results.push(fanRanked);
  refresh.total=refresh.results.length;
  refresh.successful=refresh.results.filter(result=>result.valid).length;
  return refresh;
}
