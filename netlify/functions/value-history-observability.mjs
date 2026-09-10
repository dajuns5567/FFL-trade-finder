import { getStore } from '@netlify/blobs';

const ARCHIVE_INDEX='https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/value-history-data/value-history/index.json';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

function newestScheduled(items=[]){
  for(let i=items.length-1;i>=0;i--){
    const x=items[i];
    if(String(x?.source||'').toLowerCase()==='scheduled'&&x?.t)return String(x.t);
  }
  return null;
}

export default async ()=>{
  let latest=null,archive=null;
  try{
    const store=getStore('fll-value-history-v2');
    latest=await store.get('latest.json',{type:'json'});
  }catch(e){
    console.warn('value-history-observability-live',String(e?.message||e));
  }
  try{
    const r=await fetch(`${ARCHIVE_INDEX}?ts=${Date.now()}`,{headers:{accept:'application/json','user-agent':'Fleeced-Value-History-Observability/1.0'},cache:'no-store'});
    if(r.ok)archive=await r.json();
  }catch(e){
    console.warn('value-history-observability-archive',String(e?.message||e));
  }
  const archivedScheduled=newestScheduled(archive?.items||[]);
  const liveScheduled=String(latest?.source||'').toLowerCase()==='scheduled'?String(latest?.t||''):null;
  const candidates=[archivedScheduled,liveScheduled].filter(Boolean).sort();
  return json({
    ok:true,
    latest:latest?.t||archive?.latest||null,
    latest_source:latest?.source||null,
    last_scheduled:candidates.at(-1)||null,
    archive_snapshot_count:Number(archive?.snapshot_count)||Number(archive?.items?.length)||0
  });
};
