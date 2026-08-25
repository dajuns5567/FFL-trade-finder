import { getStore } from '@netlify/blobs';

const LEAGUE='1316867686394769408';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const store=()=>getStore('fll-value-history-v1');

function cleanRows(rows){
  if(!Array.isArray(rows))return[];
  const out=[];
  for(const r of rows){
    const id=String(r?.id||'').trim(),value=Math.round(Number(r?.value)),overall=Math.round(Number(r?.overall)),posRank=Math.round(Number(r?.posRank));
    const pos=String(r?.pos||'').toUpperCase();
    if(!id||!Number.isFinite(value)||value<0||value>12000||!Number.isFinite(overall)||overall<1||overall>10000||!Number.isFinite(posRank)||posRank<1||posRank>10000)continue;
    if(!['QB','RB','WR','TE','IDP'].includes(pos))continue;
    out.push({id,value,overall,pos,posRank});
  }
  return out.slice(0,5000);
}
function fingerprint(rows){
  let h=2166136261;
  for(const r of rows){const s=`${r.id}:${r.value}:${r.overall}:${r.posRank}|`;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}}
  return (h>>>0).toString(36);
}

export default async (req)=>{
  try{
    const url=new URL(req.url),s=store();
    if(req.method==='GET'){
      const playerId=String(url.searchParams.get('player_id')||'').trim();
      if(!playerId)return json({error:'player_id required'},400);
      const listing=await s.list({prefix:'snapshots/'});
      const blobs=(listing?.blobs||[]).slice(-500);
      const snaps=await Promise.all(blobs.map(async b=>{try{return await s.get(b.key,{type:'json'})}catch{return null}}));
      const points=[];
      for(const snap of snaps){const row=snap?.rows?.find?.(r=>String(r.id)===playerId);if(row)points.push({t:snap.t,value:row.value,overall:row.overall,pos:row.pos,posRank:row.posRank})}
      points.sort((a,b)=>String(a.t).localeCompare(String(b.t)));
      return json({player_id:playerId,points});
    }
    if(req.method!=='POST')return json({error:'method not allowed'},405);
    const body=await req.json().catch(()=>null);
    if(String(body?.league||'')!==LEAGUE)return json({error:'league mismatch'},400);
    const rows=cleanRows(body?.rows);
    if(rows.length<100)return json({error:'incomplete snapshot'},400);
    rows.sort((a,b)=>a.id.localeCompare(b.id));
    const fp=fingerprint(rows);
    const latest=await s.get('latest.json',{type:'json'}).catch(()=>null);
    if(latest?.fingerprint===fp)return json({ok:true,stored:false,reason:'unchanged',t:latest.t});
    const t=new Date().toISOString();
    const key=`snapshots/${t.replace(/[:.]/g,'-')}.json`;
    const snapshot={version:1,league:LEAGUE,t,fingerprint:fp,rows};
    await s.setJSON(key,snapshot);
    await s.setJSON('latest.json',{version:1,t,fingerprint:fp,key,count:rows.length});
    return json({ok:true,stored:true,t,count:rows.length});
  }catch(e){
    console.error('value-history',e);
    return json({error:'history unavailable'},503);
  }
};
