import { refreshAllSources } from "./consensus-source-overrides.mjs";
import { buildConsensusComposite } from "./consensus-composite-v3.mjs";
import { getStore } from "@netlify/blobs";

const SNAPSHOT_STORE="fleeced-consensus-lkg";
const SNAPSHOT_KEY="validated-sources-v1";
const sourceStore=()=>getStore(SNAPSHOT_STORE,{consistency:"strong"});
async function readLastGood(){try{return await sourceStore().get(SNAPSHOT_KEY,{type:"json"})||null}catch{return null}}
async function writeLastGood(value){try{await sourceStore().setJSON(SNAPSHOT_KEY,value)}catch(e){console.warn("Consensus LKG persistence failed",e)}}

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
  const diagnostics=results.map(result=>({source:result.source,ok:!!result.valid,status:result.valid?"refreshed":"failed",stage:result.stage||null,url:Array.isArray(result.urls)?result.urls[0]||null:null,players_extracted:Number(result.players_extracted||0),ranking_rows:Number(result.ranking_rows||0),error:result.valid?null:(result.error||null),timestamp:result.timestamp||null,...(result.reducedWeight?{reducedWeight:true}:{})}));
  const successful=diagnostics.filter(result=>result.ok).length,failedSources=diagnostics.filter(result=>!result.ok).map(result=>result.source),integrityReady=results.length>=7&&failedSources.length===0;
  const composite=integrityReady?buildConsensusComposite(results,players):{byId:{},byName:{},detailsById:{},sourceCounts:{offense:0,idp:0},ambiguousNames:[]};
  return {ok:true,sources:integrityReady?sources:{},composite,withheld:!integrityReady,integrity:{all_sources_valid:integrityReady,failed_sources:failedSources,reason:integrityReady?null:`Consensus replacement withheld because ${failedSources.length?failedSources.join(', '):'one or more required sources'} did not validate; prior validated source set remains in use`},summary:{total:results.length,successful,failed:results.length-successful,results:diagnostics},updatedAt};
}

export default async (req)=>{
  if(req.method==="OPTIONS")return json({ok:true});
  if(req.method!=="POST")return json({ok:false,error:"POST required"},405);
  let body={};try{body=await req.json()}catch{return json({ok:false,error:"Invalid JSON"},400)}
  const players=Array.isArray(body.players)?body.players:[];
  if(!players.length)return json({ok:false,error:"No player list supplied"},400);
  const refresh=await refreshAllSources();
  const candidate=buildConsensusPayload(refresh,players);
  const previous=await readLastGood();

  if(!candidate.withheld){
    const promoted={sources:candidate.sources,composite:candidate.composite,updatedAt:candidate.updatedAt,sourceManifest:candidate.summary.results.map(x=>({source:x.source,status:"fresh",snapshot_timestamp:x.timestamp||candidate.updatedAt,attempt_timestamp:x.timestamp||candidate.updatedAt,players_extracted:x.players_extracted,ranking_rows:x.ranking_rows}))};
    await writeLastGood(promoted);
    return json({...candidate,promotion:{promoted:true,using_last_known_good:false},sourceManifest:promoted.sourceManifest});
  }

  const priorSources=previous?.sources&&Object.keys(previous.sources).length?previous.sources:null;
  const priorComposite=previous?.composite||null;
  const priorManifest=Array.isArray(previous?.sourceManifest)?previous.sourceManifest:[];
  const attemptBySource=new Map((candidate.summary.results||[]).map(x=>[x.source,x]));
  const manifest=(candidate.summary.results||[]).map(x=>{
    if(x.ok)return{source:x.source,status:"fresh-not-promoted",snapshot_timestamp:x.timestamp||candidate.updatedAt,attempt_timestamp:x.timestamp||candidate.updatedAt,players_extracted:x.players_extracted,ranking_rows:x.ranking_rows};
    const old=priorManifest.find(p=>p.source===x.source);
    return{source:x.source,status:old?"last-known-good":"unavailable",snapshot_timestamp:old?.snapshot_timestamp||null,attempt_timestamp:x.timestamp||candidate.updatedAt,players_extracted:old?.players_extracted??null,ranking_rows:old?.ranking_rows??null,error:x.error||"Live refresh failed"};
  });
  const summary={...candidate.summary,successful:candidate.summary.results.filter(x=>x.ok).length,results:manifest.map(x=>({source:x.source,ok:x.status==="fresh-not-promoted",status:x.status,players_extracted:x.players_extracted,ranking_rows:x.ranking_rows,timestamp:x.attempt_timestamp,snapshot_timestamp:x.snapshot_timestamp,error:x.error||null}))};
  return json({...candidate,sources:priorSources||{},composite:priorComposite||candidate.composite,summary,sourceManifest:manifest,promotion:{promoted:false,using_last_known_good:!!priorSources,last_good_updated_at:previous?.updatedAt||null},integrity:{...candidate.integrity,reason:priorSources?`${candidate.integrity.reason}; complete last-known-good consensus from ${previous.updatedAt} remains active`:`${candidate.integrity.reason}; no persisted last-known-good consensus is available yet`}});
};
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}})}
