import { refreshAllSources } from './consensus-source-overrides.mjs';
import { buildConsensusComposite } from './consensus-composite-v3.mjs';

const NAMES=['Josh Allen','Justin Jefferson','Ja\'Marr Chase','Bijan Robinson','Jack Campbell','Kyle Hamilton','Travis Hunter','Maxx Crosby','Aidan Hutchinson','Myles Garrett'];
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/[^a-z0-9]+/gi,' ').trim().toLowerCase();

export default async()=>{
  try{
    const started=Date.now();
    const refresh=await refreshAllSources();
    const wanted=new Map(NAMES.map((name,i)=>[norm(name),{id:`sample-${i+1}`,name,positions:new Set()}]));
    for(const source of refresh.results||[]){
      for(const row of source?.rankings||[]){
        const sample=wanted.get(norm(row?.player));if(!sample)continue;
        const p=String(row?.position||'').toUpperCase();
        if(p)sample.positions.add(p);
        if(source.id?.includes('idp')||source.id==='combined-dynasty'&&p==='IDP')sample.positions.add('IDP');
      }
    }
    const players=[...wanted.values()].map(p=>({id:p.id,name:p.name,position:[...p.positions][0]||'IDP',positions:[...p.positions].length?[...p.positions]:['IDP']}));
    const composite=buildConsensusComposite(refresh.results||[],players);
    const samples={};for(const p of players)samples[p.name]=composite.detailsById?.[p.id]||null;
    return new Response(JSON.stringify({ok:true,elapsedMs:Date.now()-started,sourceStatus:(refresh.results||[]).map(x=>({source:x.source,valid:x.valid,rows:x.rankings?.length||0})),sourceCounts:composite.sourceCounts,samples},null,2),{headers:{'content-type':'application/json','cache-control':'no-store'}});
  }catch(e){return new Response(JSON.stringify({ok:false,error:String(e?.stack||e)},null,2),{status:500,headers:{'content-type':'application/json','cache-control':'no-store'}})}
};
