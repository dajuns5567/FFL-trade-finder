import { getStore } from '@netlify/blobs';

const LEAGUE='1316867686394769408';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const store=()=>getStore('fll-value-history-v2');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LEGACY_INDEX_KEY='snapshot-index.json';
const LATEST_KEY='latest.json';
const MONTHS_KEY='history-months.json';
const MONTH_INDEX_PREFIX='indexes/';
const LEGACY_MAX=500;

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
function monthKey(t){
  const d=new Date(t);
  return Number.isFinite(d.getTime())?d.toISOString().slice(0,7):'';
}
function monthIndexKey(month){return`${MONTH_INDEX_PREFIX}${month}.json`}
function normalizeItems(value,limit=Infinity){
  const items=Array.isArray(value?.items)?value.items:[],out=[],seen=new Set();
  for(const x of items){
    const key=String(x?.key||'').trim(),t=String(x?.t||'').trim();
    if(!key||!key.startsWith('snapshots/')||seen.has(key))continue;
    seen.add(key);out.push({key,t});
  }
  out.sort((a,b)=>String(a.t||a.key).localeCompare(String(b.t||b.key)));
  return Number.isFinite(limit)?out.slice(-limit):out;
}
function normalizeMonths(value){
  const months=Array.isArray(value?.months)?value.months.map(String).filter(x=>/^\d{4}-\d{2}$/.test(x)):[];
  return [...new Set(months)].sort();
}
async function readSnapshotsBounded(s,items,batchSize=25){
  const snaps=[];
  for(let i=0;i<items.length;i+=batchSize){
    const batch=items.slice(i,i+batchSize);
    const rows=await Promise.all(batch.map(async item=>{try{return await s.get(item.key,{type:'json'})}catch{return null}}));
    for(const snap of rows)if(snap?.t&&Array.isArray(snap?.rows))snaps.push(snap);
  }
  snaps.sort((a,b)=>String(a.t).localeCompare(String(b.t)));
  return snaps;
}
function pointsFromSnapshots(snaps,playerId){
  const points=[];
  for(const snap of snaps){
    const row=snap?.rows?.find?.(r=>String(r.id)===playerId);
    if(row)points.push({t:snap.t,value:row.value,overall:row.overall,pos:row.pos,posRank:row.posRank});
  }
  points.sort((a,b)=>String(a.t).localeCompare(String(b.t)));
  return points;
}
async function indexedItemsAll(s){
  const legacy=normalizeItems(await safeGet(s,LEGACY_INDEX_KEY),LEGACY_MAX);
  const months=normalizeMonths(await safeGet(s,MONTHS_KEY));
  const all=[],seen=new Set(),add=item=>{if(item?.key&&!seen.has(item.key)){seen.add(item.key);all.push(item)}};
  for(const item of legacy)add(item);
  for(const month of months){
    const idx=normalizeItems(await safeGet(s,monthIndexKey(month)));
    for(const item of idx)add(item);
  }
  all.sort((a,b)=>String(a.t||a.key).localeCompare(String(b.t||b.key)));
  return{items:all,months,hasPartitioned:months.length>0};
}
async function listSnapshots(s){
  return retry(()=>s.list({prefix:'snapshots/'}),120);
}
async function listedItems(s){
  const listing=await listSnapshots(s);
  return (listing?.blobs||[]).map(b=>({key:b.key,t:''}));
}
async function allItems(s){
  const indexed=await indexedItemsAll(s);
  if(indexed.items.length)return{...indexed,source:indexed.hasPartitioned?'partitioned-index':'legacy-index'};
  try{
    const listed=await listedItems(s);
    return{items:listed,months:[],hasPartitioned:false,source:listed.length?'list':'empty'};
  }catch{return{items:[],months:[],hasPartitioned:false,source:'unavailable'}}
}
async function latestFallback(s,playerId){
  const latest=await safeGet(s,LATEST_KEY),key=String(latest?.key||'').trim();
  if(!key)return{reachable:true,points:[],source:'empty'};
  const snap=await safeGet(s,key);
  if(!snap)return{reachable:false,points:[],source:'latest-unreadable'};
  return{reachable:true,points:pointsFromSnapshots([snap],playerId),source:'latest-fallback'};
}
async function getPlayerHistory(s,playerId){
  const indexed=await allItems(s);
  if(indexed.items.length){
    const snaps=await readSnapshotsBounded(s,indexed.items,25);
    return{points:pointsFromSnapshots(snaps,playerId),source:indexed.source,snapshotCount:indexed.items.length};
  }
  if(indexed.source==='unavailable'){
    const fallback=await latestFallback(s,playerId);
    if(!fallback.reachable)throw new Error('history store unavailable');
    return{points:fallback.points,source:fallback.source,snapshotCount:fallback.source==='empty'?0:1,partial:fallback.source==='latest-fallback'};
  }
  return{points:[],source:'empty',snapshotCount:0};
}
function rowMap(snap){return new Map((snap?.rows||[]).map(r=>[String(r.id),r]))}
function baselineFor(snaps,latestMs,days){
  if(!snaps.length)return null;
  const target=latestMs-days*86400000;
  let best=snaps[0];
  for(const snap of snaps){
    const ms=new Date(snap.t).getTime();
    if(!Number.isFinite(ms))continue;
    if(ms<=target)best=snap;else break;
  }
  return best;
}
function deltaRow(latest,base){
  if(!latest||!base)return null;
  const delta=Number(latest.value)-Number(base.value);
  return{
    id:String(latest.id),value:Number(latest.value),overall:Number(latest.overall),pos:String(latest.pos),posRank:Number(latest.posRank),
    delta,pct:Number(base.value)?delta/Number(base.value)*100:0,
    overallDelta:Number(base.overall)-Number(latest.overall),
    posRankDelta:Number(base.posRank)-Number(latest.posRank),
    fromValue:Number(base.value),fromOverall:Number(base.overall),fromPosRank:Number(base.posRank)
  };
}
function metricsAgainst(latestSnap,baseSnap){
  const latest=rowMap(latestSnap),base=rowMap(baseSnap),out=new Map();
  for(const [id,row] of latest){const d=deltaRow(row,base.get(id));if(d)out.set(id,d)}
  return out;
}
function marketPeriod(latest,base){
  const metrics=metricsAgainst(latest,base),rows=[...metrics.values()];
  const valueRisers=rows.filter(x=>x.delta>0).sort((a,b)=>b.delta-a.delta||b.value-a.value).slice(0,10);
  const valueFallers=rows.filter(x=>x.delta<0).sort((a,b)=>a.delta-b.delta||b.value-a.value).slice(0,10);
  const rankRisers=rows.filter(x=>x.overallDelta>0).sort((a,b)=>b.overallDelta-a.overallDelta||b.value-a.value).slice(0,10);
  const rankFallers=rows.filter(x=>x.overallDelta<0).sort((a,b)=>a.overallDelta-b.overallDelta||b.value-a.value).slice(0,10);
  return{valueRisers,valueFallers,rankRisers,rankFallers,metrics};
}
function marketFromSnapshots(snaps){
  const ordered=(snaps||[]).filter(s=>s?.t&&Array.isArray(s?.rows)).slice().sort((a,b)=>String(a.t).localeCompare(String(b.t)));
  if(!ordered.length)return{tracking_since:null,latest:null,snapshot_count:0,periods:{'7D':{},'30D':{},'90D':{},'1Y':{},'ALL':{}},marketRows:[],has7:false,has30:false,has90:false,has365:false};
  const first=ordered[0],latest=ordered[ordered.length-1],latestMs=new Date(latest.t).getTime(),firstMs=new Date(first.t).getTime();
  const bases={
    '7D':baselineFor(ordered,latestMs,7)||first,
    '30D':baselineFor(ordered,latestMs,30)||first,
    '90D':baselineFor(ordered,latestMs,90)||first,
    '1Y':baselineFor(ordered,latestMs,365)||first,
    'ALL':first
  };
  const periods={};
  for(const [label,base] of Object.entries(bases)){
    const p=marketPeriod(latest,base);
    periods[label]={valueRisers:p.valueRisers,valueFallers:p.valueFallers,rankRisers:p.rankRisers,rankFallers:p.rankFallers,baseline:base?.t||null};
  }
  const m7=marketPeriod(latest,bases['7D']).metrics,m30=marketPeriod(latest,bases['30D']).metrics,m365=marketPeriod(latest,bases['1Y']).metrics;
  const latestMap=rowMap(latest);
  const marketRows=[...latestMap.values()].map(r=>{
    const id=String(r.id),d7=m7.get(id),d30=m30.get(id),d365=m365.get(id);
    return{id,value:r.value,overall:r.overall,pos:r.pos,posRank:r.posRank,delta7:d7?.delta??null,delta30:d30?.delta??null,delta365:d365?.delta??null,posRankDelta7:d7?.posRankDelta??null,posRankDelta30:d30?.posRankDelta??null,posRankDelta365:d365?.posRankDelta??null,overallDelta30:d30?.overallDelta??null};
  }).sort((a,b)=>b.value-a.value);
  return{
    tracking_since:first.t,latest:latest.t,snapshot_count:ordered.length,periods,marketRows,
    has7:latestMs-firstMs>=7*86400000,
    has30:latestMs-firstMs>=30*86400000,
    has90:latestMs-firstMs>=90*86400000,
    has365:latestMs-firstMs>=365*86400000
  };
}
function itemAtOrBefore(items,targetMs){
  let best=items[0]||null;
  for(const item of items){
    const ms=new Date(item?.t||'').getTime();
    if(!Number.isFinite(ms))continue;
    if(ms<=targetMs)best=item;else break;
  }
  return best;
}
async function getMarketSummary(s){
  const indexed=await allItems(s),items=indexed.items||[];
  if(!items.length)return marketFromSnapshots([]);
  const latestItem=items[items.length-1],latestMs=new Date(latestItem?.t||'').getTime();
  if(!Number.isFinite(latestMs)){
    const snaps=await readSnapshotsBounded(s,items,25),market=marketFromSnapshots(snaps);
    market.snapshot_count=items.length;return market;
  }
  const wanted=[items[0],itemAtOrBefore(items,latestMs-7*86400000),itemAtOrBefore(items,latestMs-30*86400000),itemAtOrBefore(items,latestMs-90*86400000),itemAtOrBefore(items,latestMs-365*86400000),latestItem].filter(Boolean);
  const unique=[],seen=new Set();for(const item of wanted)if(!seen.has(item.key)){seen.add(item.key);unique.push(item)}
  unique.sort((a,b)=>String(a.t).localeCompare(String(b.t)));
  const snaps=await readSnapshotsBounded(s,unique,6),market=marketFromSnapshots(snaps);
  market.snapshot_count=items.length;
  return market;
}
async function appendIndex(s,key,t){
  const legacy=normalizeItems(await safeGet(s,LEGACY_INDEX_KEY),LEGACY_MAX).filter(x=>x.key!==key);
  legacy.push({key,t});legacy.sort((a,b)=>String(a.t||a.key).localeCompare(String(b.t||b.key)));
  await retry(()=>s.setJSON(LEGACY_INDEX_KEY,{version:2,items:legacy.slice(-LEGACY_MAX)}),120);

  const month=monthKey(t);
  if(!month)return;
  const monthKeyName=monthIndexKey(month),monthly=normalizeItems(await safeGet(s,monthKeyName)).filter(x=>x.key!==key);
  monthly.push({key,t});monthly.sort((a,b)=>String(a.t||a.key).localeCompare(String(b.t||b.key)));
  await retry(()=>s.setJSON(monthKeyName,{version:2,month,items:monthly}),120);

  const months=normalizeMonths(await safeGet(s,MONTHS_KEY));
  if(!months.includes(month)){
    months.push(month);months.sort();
    await retry(()=>s.setJSON(MONTHS_KEY,{version:2,months}),120);
  }
}
async function health(s){
  const latest=await safeGet(s,LATEST_KEY),indexed=await allItems(s);
  if(indexed.items.length)return{ok:true,storage:'reachable',source:indexed.source,snapshotCount:indexed.items.length,latest:latest?.t||null};
  if(indexed.source==='unavailable'){
    if(latest?.key){const snap=await safeGet(s,latest.key);if(snap)return{ok:true,storage:'degraded',source:'latest-fallback',snapshotCount:1,latest:latest?.t||null}}
    return{ok:false,storage:'unavailable',source:'none',snapshotCount:0,latest:null};
  }
  return{ok:true,storage:'reachable',source:'empty',snapshotCount:0,latest:latest?.t||null};
}

export { monthKey, marketFromSnapshots, baselineFor };

export default async (req)=>{
  try{
    const url=new URL(req.url),s=store();
    if(req.method==='GET'){
      if(url.searchParams.get('health')==='1'){
        const h=await health(s);
        return json(h,h.ok?200:503);
      }
      if(url.searchParams.get('market')==='1'){
        const market=await retry(()=>getMarketSummary(s),180);
        return json({market,history_state:'ok'});
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
    const fp=fingerprint(rows),latest=await safeGet(s,LATEST_KEY);
    if(latest?.fingerprint===fp)return json({ok:true,stored:false,reason:'unchanged',t:latest.t});
    const t=new Date().toISOString(),key=`snapshots/${t.replace(/[:.]/g,'-')}.json`;
    const snapshot={version:2,league:LEAGUE,t,fingerprint:fp,rows};
    await retry(()=>s.setJSON(key,snapshot),120);
    await retry(()=>s.setJSON(LATEST_KEY,{version:2,t,fingerprint:fp,key,count:rows.length}),120);
    try{await appendIndex(s,key,t)}catch(e){console.warn('value-history-index',e)}
    return json({ok:true,stored:true,t,count:rows.length});
  }catch(e){
    console.error('value-history',e);
    return json({error:'history unavailable'},503);
  }
};
