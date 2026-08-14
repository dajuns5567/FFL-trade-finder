import { refreshAllSources } from './consensus-source-overrides.mjs';
import { buildConsensusComposite } from './consensus-composite-v3.mjs';

const NAMES=['Josh Allen','Justin Jefferson','Ja\'Marr Chase','Bijan Robinson','Jack Campbell','Kyle Hamilton','Travis Hunter'];

export default async(req)=>{
  try{
    let body={};
    try{body=await req.json()}catch{}
    const players=Array.isArray(body.players)?body.players:[];
    const refresh=await refreshAllSources();
    const composite=buildConsensusComposite(refresh.results||[],players);
    const byName=new Map(players.map(p=>[String(p?.name||'').toLowerCase(),String(p?.id||'')]));
    const samples={};
    for(const name of NAMES){
      const id=byName.get(name.toLowerCase());
      samples[name]=id?composite.detailsById?.[id]||null:null;
    }
    return new Response(JSON.stringify({ok:true,sourceCounts:composite.sourceCounts,samples},null,2),{headers:{'content-type':'application/json','cache-control':'no-store'}});
  }catch(e){return new Response(JSON.stringify({ok:false,error:String(e?.stack||e)},null,2),{status:500,headers:{'content-type':'application/json','cache-control':'no-store'}})}
};
