import { getStore } from '@netlify/blobs';

const LEAGUE='1316867686394769408';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const store=()=>getStore('fll-value-history-v1');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const INDEX_KEY='snapshot-index.json';
const LATEST_KEY='latest.json';
const MAX_SNAPSHOTS=500;

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
async function retry(fn,wait=120){
  let last;
  for(let attempt=0;attempt<2;attempt++){
    try{return await fn()}catch(e){last=e;if(attempt===0)await sleep(wait)}
  }
  throw last||new Error('value history storage operation failed');
}
async function safeGet(s,key){
  try{return await retry(()=>s.get(key,{type:'json'}),120)}catch{return null}
}
async function listSnapshots(s){
  return retry(()=>s.list({prefix:'snapshots/'}),120);
}
function normalizeIndex(value){
  const items=Array.isArray(value?.items)?value.items:[];
  const out=[],seen=new Set();
  for(const x of items){
    const key=String(x?.key||'').trim(),t=String(x?.t||'').trim();
    if(!key||!key.startsWith('snapshots/')||seen.has(key))continue;
    seen.add(key);out.push({key,t});
  }
  out.sort((a,b)=>String(a.t||a.key).localeCompare(String(b.t||b.key)));
  return out.slice(-MAX_SNAPSHOTS);
}
async function readSnapshotsBounded(s,items,batchSize=25){
  const snaps=[];
  for(let i=0;i<items.length;i+=batchSize){
    const batch=items.slice(i,i+batchSize);
    const rows=await Promise.all(batch.map(async item=>{try{return await s.get(item.key,{type:'json'})}catch{return null}}));
    snaps.push(...rows);
  }
  return snaps;
}
function pointsFromSnapshots(snaps,playerId){
  const points=[];
  for(const snap of snaps){const row=snap?.rows?.find?.(r=>String(r.id)===playerId);if(row)points.push({t:snap.t,value:row.value,overall:row.overall,pos:row.pos,posRank:row.posRank})}
  points.sort((a,b)=>String(a.t).localeCompare(String(b.t)));
  return points;
}
async function indexedItems(s){
  const index=await safeGet(s,INDEX_KEY),items=normalizeIndex(index);
  return items.length?items:null;
}
async function listedItems(s){
  const listing=await listSnapshots(s);
  return (listing?.blobs||[]).slice(-MAX_SNAPSHOTS).map(b=>({key:b.key,t:''}));
}
async function latestFallback(s,playerId){
  const latest=await safeGet(s,LATEST_KEY);
  const key=String(latest?.key||'').trim();
  if(!key)return{reachable:true,points:[],source:'empty'};
  const snap=await safeGet(s,key);
  if(!snap)return{reachable:false,points:[],source:'latest-unreadable'};
  return{reachable:true,points:pointsFromSnapshots([snap],playerId),source:'latest-fallback'};
}
async function getPlayerHistory(s,playerId){
  const index=await indexedItems(s);
  if(index){
    const snaps=await readSnapshotsBounded(s,index,25);
    return{points:pointsFromSnapshots(snaps,playerId),source:'index',snapshotCount:index.length};
  }
  try{
    const listed=await listedItems(s);
    if(!listed.length)return{points:[],source:'empty',snapshotCount:0};
    const snaps=await readSnapshotsBounded(s,listed,25);
    return{points:pointsFromSnapshots(snaps,playerId),source:'list',snapshotCount:listed.length};
  }catch{
    const fallback=await latestFallback(s,playerId);
    if(!fallback.reachable)throw new Error('history store unavailable');
    return{points:fallback.points,source:fallback.source,snapshotCount:fallback.source==='empty'?0:1,partial:fallback.source==='latest-fallback'};
  }
}
async function appendIndex(s,key,t){
  const current=normalizeIndex(await safeGet(s,INDEX_KEY));
  const filtered=current.filter(x=>x.key!==key);
  filtered.push({key,t});
  filtered.sort((a,b)=>String(a.t||a.key).localeCompare(String(b.t||b.key)));
  await retry(()=>s.setJSON(INDEX_KEY,{version:1,items:filtered.slice(-MAX_SNAPSHOTS)}),120);
}
async function health(s){
  const latest=await safeGet(s,LATEST_KEY),index=normalizeIndex(await safeGet(s,INDEX_KEY));
  if(index.length)return{ok:true,storage:'reachable',source:'index',snapshotCount:index.length,latest:latest?.t||null};
  try{
    const listed=await listedItems(s);
    return{ok:true,storage:'reachable',source:'list',snapshotCount:listed.length,latest:latest?.t||null};
  }catch{
    if(latest?.key){const snap=await safeGet(s,latest.key);if(snap)return{ok:true,storage:'degraded',source:'latest-fallback',snapshotCount:1,latest:latest?.t||null}}
    if(latest===null)return{ok:false,storage:'unavailable',source:'none',snapshotCount:0,latest:null};
    return{ok:true,storage:'reachable',source:'empty',snapshotCount:0,latest:latest?.t||null};
  }
}

export default async (req)=>{
  try{
    const url=new URL(req.url),s=store();
    if(req.method==='GET'){
      if(url.searchParams.get('health')==='1'){
        const h=await health(s);
        return json(h,h.ok?200:503);
      }
      const playerId=String(url.searchParams.get('player_id')||'').trim();
      if(!playerId)return json({error:'player_id required'},400);
      const result=await retry(()=>getPlayerHistory(s,playerId),180);
      return json({player_id:playerId,points:result.points||[],history_state:result.source,snapshot_count:result.snapshotCount||0,partial:!!result.partial});
    }
    if(req.method!=='POST')return json({error:'method not allowed'},405);
    const body=await req.json().catch(()=>null);
    if(String(body?.league||'')!==LEAGUE)return json({error:'league mismatch'},400);
    const rows=cleanRows(body?.rows);
    if(rows.length<100)return json({error:'incomplete snapshot'},400);
    rows.sort((a,b)=>a.id.localeCompare(b.id));
    const fp=fingerprint(rows);
    const latest=await safeGet(s,LATEST_KEY);
    if(latest?.fingerprint===fp)return json({ok:true,stored:false,reason:'unchanged',t:latest.t});
    const t=new Date().toISOString();
    const key=`snapshots/${t.replace(/[:.]/g,'-')}.json`;
    const snapshot={version:1,league:LEAGUE,t,fingerprint:fp,rows};
    await retry(()=>s.setJSON(key,snapshot),120);
    await retry(()=>s.setJSON(LATEST_KEY,{version:1,t,fingerprint:fp,key,count:rows.length}),120);
    try{await appendIndex(s,key,t)}catch(e){console.warn('value-history-index',e)}
    return json({ok:true,stored:true,t,count:rows.length});
  }catch(e){
    console.error('value-history',e);
    return json({error:'history unavailable'},503);
  }
};
