const ROOT="https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/sleeper-data/data/sleeper";
const YEAR_RE=/^20\d{2}$/;

async function fetchYear(year){
  const c=new AbortController();
  const t=setTimeout(()=>c.abort(),15000);
  try{
    const r=await fetch(`${ROOT}/${year}/season-stats.json`,{headers:{accept:"application/json"},cache:"no-store",signal:c.signal});
    if(!r.ok)throw new Error(`season ${year} HTTP ${r.status}`);
    return await r.json();
  }finally{clearTimeout(t)}
}

export default async req=>{
  if(req.method==="OPTIONS")return json({ok:true});
  if(req.method!=="POST")return json({ok:false,error:"POST required"},405);
  let body={};
  try{body=await req.json()}catch{return json({ok:false,error:"Invalid JSON"},400)}
  const years=[...new Set((body.years||[]).map(String).filter(y=>YEAR_RE.test(y)))].slice(0,4);
  const ids=new Set((body.idpIds||[]).map(String).filter(Boolean).slice(0,6000));
  if(!years.length||!ids.size)return json({ok:false,error:"years and idpIds required"},400);
  try{
    const pairs=await Promise.all(years.map(async year=>{
      const source=await fetchYear(year);
      const rows={};
      for(const id of ids)if(source?.[id]!=null)rows[id]=source[id];
      return [year,rows];
    }));
    return json({ok:true,source:"verified Sleeper season stats filtered server-side",stats:Object.fromEntries(pairs)});
  }catch(e){return json({ok:false,error:String(e?.message||e)},502)}
};

function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}})}
