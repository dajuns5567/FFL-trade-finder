import { refreshAllSources } from "./consensus-source-overrides.mjs";
import { buildConsensusComposite } from "./consensus-composite-v3.mjs";

const REFRESH_REUSE_MS=5000;
let refreshInFlight=null;
let lastRefresh=null;
let lastRefreshAt=0;

async function getConsensusRefresh(){
  const now=Date.now();
  if(lastRefresh&&now-lastRefreshAt<REFRESH_REUSE_MS)return{refresh:lastRefresh,reused:true,ageMs:now-lastRefreshAt};
  if(refreshInFlight)return{refresh:await refreshInFlight,reused:true,ageMs:0};
  refreshInFlight=refreshAllSources();
  try{
    const refresh=await refreshInFlight;
    lastRefresh=refresh;
    lastRefreshAt=Date.now();
    return{refresh,reused:false,ageMs:0};
  }finally{
    refreshInFlight=null;
  }
}

function addSnapshot(sources,name,result,rows,kind,updatedAt){
  const data={};
  for(const row of rows||[]){
    const player=String(row?.player||"").trim().toLowerCase();
    const rank=Number(row?.rank);
    if(!player||!Number.isFinite(rank))continue;
    if(data[player]==null||rank<data[player])data[player]=rank;
  }
  if(!Object.keys(data).length)return;
  sources[name]={updated:result.timestamp||updatedAt,data,url:Array.isArray(result.urls)?result.urls[0]||null:null,kind,playerCount:Object.keys(data).length,...(result.reducedWeight?{reducedWeight:true}:{})};
}

export function buildConsensusPayload(refresh,players=[],updatedAt=new Date().toISOString()) {
  const results=Array.isArray(refresh?.results)?refresh.results:[];
  const sources={};
  for(const result of results){
    if(!result?.valid)continue;
    if(result.id==="combined-dynasty"){
      const offense=[],idp=[];
      for(const row of result.rankings||[]){
        if(String(row?.position||"").toUpperCase()==="IDP")idp.push(row); else offense.push(row);
      }
      addSnapshot(sources,"The IDP Show Combined Offense",result,offense,"offense",updatedAt);
      addSnapshot(sources,"The IDP Show Combined IDP",result,idp,"idp",updatedAt);
      continue;
    }
    addSnapshot(sources,result.source,result,result.rankings,result.id?.includes("idp")?"idp":"offense",updatedAt);
  }
  const diagnostics=results.map(result=>({source:result.source,ok:!!result.valid,status:result.valid?"refreshed":"failed",stage:result.stage||null,url:Array.isArray(result.urls)?result.urls[0]||null:null,players_extracted:Number(result.players_extracted||0),ranking_rows:Number(result.ranking_rows||0),elapsed_ms:Number.isFinite(Number(result.elapsed_ms))?Number(result.elapsed_ms):null,error:result.valid?null:(result.error||null),timestamp:result.timestamp||null,...(result.reducedWeight?{reducedWeight:true}:{})}));
  const successful=diagnostics.filter(result=>result.ok).length;
  const composite=buildConsensusComposite(results,players);
  return {ok:true,sources,composite,summary:{total:results.length,successful,failed:results.length-successful,elapsed_ms:Number(refresh?.elapsed_ms)||null,results:diagnostics},updatedAt};
}

export default async (req)=>{
  if(req.method==="OPTIONS")return json({ok:true});
  if(req.method!=="POST")return json({ok:false,error:"POST required"},405);
  let body={};try{body=await req.json()}catch{return json({ok:false,error:"Invalid JSON"},400)}
  const players=Array.isArray(body.players)?body.players:[];
  if(!players.length)return json({ok:false,error:"No player list supplied"},400);
  const run=await getConsensusRefresh();
  const payload=buildConsensusPayload(run.refresh,players);
  payload.summary.refresh_reused=run.reused;
  payload.summary.refresh_age_ms=run.ageMs;
  return json(payload);
};

function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}})}
