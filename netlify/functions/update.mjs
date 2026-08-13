import { refreshAllSources } from "./consensus-adapters.mjs";

export function buildConsensusPayload(refresh, updatedAt=new Date().toISOString()) {
  const results=Array.isArray(refresh?.results)?refresh.results:[];
  const sources={};

  for(const result of results){
    if(!result?.valid)continue;
    const data={};
    for(const row of result.rankings||[]){
      const name=String(row?.player||"").trim().toLowerCase();
      const rank=Number(row?.rank);
      if(!name||!Number.isFinite(rank))continue;
      if(data[name]==null||rank<data[name])data[name]=rank;
    }
    sources[result.source]={
      updated:result.timestamp||updatedAt,
      data,
      url:Array.isArray(result.urls)?result.urls[0]||null:null,
      kind:result.id?.includes("idp")?"idp":"offense",
      playerCount:Object.keys(data).length,
      ...(result.reducedWeight?{reducedWeight:true}:{})
    };
  }

  const diagnostics=results.map(result=>({
    source:result.source,
    ok:!!result.valid,
    status:result.valid?"refreshed":"failed",
    stage:result.stage||null,
    url:Array.isArray(result.urls)?result.urls[0]||null:null,
    players_extracted:Number(result.players_extracted||0),
    ranking_rows:Number(result.ranking_rows||0),
    error:result.valid?null:(result.error||null),
    timestamp:result.timestamp||null,
    ...(result.reducedWeight?{reducedWeight:true}:{})
  }));
  const successful=diagnostics.filter(result=>result.ok).length;

  return {
    ok:true,
    sources,
    summary:{
      total:results.length,
      successful,
      failed:results.length-successful,
      results:diagnostics
    },
    updatedAt
  };
}

export default async (req)=>{
  if(req.method==="OPTIONS")return json({ok:true});
  if(req.method!=="POST")return json({ok:false,error:"POST required"},405);
  let body={};try{body=await req.json()}catch{return json({ok:false,error:"Invalid JSON"},400)}
  const players=Array.isArray(body.players)?body.players:[];
  if(!players.length)return json({ok:false,error:"No player list supplied"},400);

  const refresh=await refreshAllSources();

  // A partial refresh is diagnostic success: failed sources are omitted from
  // sources so the browser retains their last validated snapshots.
  return json(buildConsensusPayload(refresh));
};

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{
    "content-type":"application/json; charset=utf-8","cache-control":"no-store"
  }});
}
