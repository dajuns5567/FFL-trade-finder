const SOURCE='https://docs.google.com/spreadsheets/d/1yEqtTNlSJNIcXl9crqHqiSb2fGu6QEN2Fod-LgpS7qg/export?format=csv&gid=516313750';
export default async()=>{
  const fetchedAt=new Date().toISOString();
  try{
    const r=await fetch(SOURCE,{cache:'no-store',headers:{accept:'text/csv,text/plain;q=0.9,*/*;q=0.8'}});
    if(!r.ok)throw new Error(`projection source ${r.status}`);
    const csv=await r.text();
    if(!csv||csv.length<500)throw new Error('projection source returned an unexpectedly small payload');
    return new Response(csv,{status:200,headers:{'content-type':'text/csv; charset=utf-8','cache-control':'no-store, max-age=0','x-ffl-fetched-at':fetchedAt}});
  }catch(e){
    return new Response(JSON.stringify({ok:false,error:String(e?.message||e),fetchedAt}),{status:502,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }
};
