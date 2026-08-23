const SOURCE='https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/mida-live-data/data/mida-team-context.csv';
export default async()=>{
  const fetchedAt=new Date().toISOString();
  try{
    const r=await fetch(`${SOURCE}?ts=${Date.now()}`,{cache:'no-store',headers:{accept:'text/csv,text/plain;q=0.9,*/*;q=0.8'}});
    if(!r.ok)throw new Error(`projection source ${r.status}`);
    const csv=await r.text();
    if(!csv||csv.length<500)throw new Error('projection source returned an unexpectedly small payload');
    return new Response(csv,{status:200,headers:{'content-type':'text/csv; charset=utf-8','cache-control':'no-store, max-age=0','x-ffl-fetched-at':fetchedAt,'x-ffl-projection-source':'mida-github-live-data'}});
  }catch(e){
    return new Response(JSON.stringify({ok:false,error:String(e?.message||e),fetchedAt}),{status:502,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }
};
