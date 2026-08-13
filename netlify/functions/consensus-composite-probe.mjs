import { refreshAllSources } from "./consensus-source-overrides.mjs";
import { buildConsensusComposite } from "./consensus-composite.mjs";

const SAMPLE=[
  {id:"sample-allen",name:"Josh Allen",position:"QB"},
  {id:"sample-chase",name:"Ja'Marr Chase",position:"WR"},
  {id:"sample-hunter",name:"Travis Hunter",position:"WR"},
  {id:"sample-campbell",name:"Jack Campbell",position:"LB"},
  {id:"sample-hamilton",name:"Kyle Hamilton",position:"DB"}
];

export default async()=>{
  try{
    const refresh=await refreshAllSources();
    const composite=buildConsensusComposite(refresh.results,SAMPLE);
    return new Response(JSON.stringify({ok:true,sourceStatus:refresh.results.map(r=>({source:r.source,valid:r.valid,rows:r.ranking_rows,reducedWeight:!!r.reducedWeight})),sourceCounts:composite.sourceCounts,ambiguousNames:composite.ambiguousNames,samples:composite.details},null,2),{headers:{"content-type":"application/json","cache-control":"no-store"}});
  }catch(error){return new Response(JSON.stringify({ok:false,error:String(error?.stack||error)},null,2),{status:500,headers:{"content-type":"application/json","cache-control":"no-store"}})}
};
