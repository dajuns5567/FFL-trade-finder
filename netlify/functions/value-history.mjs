import { getStore } from '@netlify/blobs';

const LEAGUE='1316867686394769408';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const store=()=>getStore('fll-value-history-v2');
const ARCHIVE_RAW='https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/value-history-data/value-history';
let archiveIndexCache=null,archiveIndexCacheAt=0;
async function archiveJson(path){
  const r=await fetch(`${ARCHIVE_RAW}/${path}?ts=${Date.now()}`,{headers:{accept:'application/json','user-agent':'FFL-TradeFinder-ValueHistoryArchive/1.0'},cache:'no-store'});
  if(!r.ok)throw new Error(`archive fetch ${r.status}: ${path}`);
  return r.json();
}
async function archiveIndex(){
  const now=Date.now();
  if(archiveIndexCache&&now-archiveIndexCacheAt<30000)return archiveIndexCache;
  try{
    const idx=await archiveJson('index.json');
    archiveIndexCache=idx&&Array.isArray(idx.items)?idx:{items:[],months:[]};archiveIndexCacheAt=now;return archiveIndexCache;
  }catch{return{items:[],months:[]}}
}
function archiveItemAtOrBefore(items,targetMs){
  let best=items[0]||null;
  for(const item of items||[]){const ms=new Date(item?.t||'').getTime();if(!Number.isFinite(ms))continue;if(ms<=targetMs)best=item;else break}
  return best;
}
async function archiveSnapshot(item){
  if(!item?.path)return null;
  try{const snap=await archiveJson(item.path);return snap?.t&&Array.isArray(snap?.rows)?snap:null}catch{return null}
}
async function archiveAllSnapshots(){
  const idx=await archiveIndex(),months=[...new Set((idx.months||[]).map(String).filter(Boolean))].sort(),out=[];
  for(const month of months){
    try{
      const bundle=await archiveJson(`months/${month}.json`);
      for(const snap of bundle?.snapshots||[])if(snap?.t&&Array.isArray(snap.rows))out.push(snap);
    }catch{}
  }
  out.sort((a,b)=>String(a.t).localeCompare(String(b.t)));return out;
}
function mergeSnapshots(...groups){
  const map=new Map();
  for(const group of groups)for(const snap of group||[]){if(!snap?.t||!Array.isArray(snap.rows))continue;map.set(String(snap.t),snap)}
  return[...map.values()].sort((a,b)=>String(a.t).localeCompare(String(b.t)));
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LEGACY_INDEX_KEY='snapshot-index.json';
const LATEST_KEY='latest.json';
const MONTHS_KEY='history-months.json';
const MONTH_INDEX_PREFIX='indexes/';
const LEGACY_MAX=500;
const V346_KTC_CUTOFF_MS=Date.parse('2026-09-08T05:23:00.000Z');
const V346_CLEANUP_KEY='maintenance/v346-ktc-history-scrub.json';
const V348_CLEANUP_KEY='maintenance/v348-consensus-history-scrub.json';
const V348_BAD_WINDOWS=[[Date.parse('2026-09-08T20:00:00.000Z'),Date.parse('2026-09-08T20:01:00.000Z')],[Date.parse('2026-09-08T22:08:00.000Z'),Date.parse('2026-09-08T22:09:00.000Z')]];

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
function cleanPicks(picks){
  if(!Array.isArray(picks))return[];
  const out=[];
  for(const p of picks){
    const id=String(p?.id||'').trim(),value=Math.round(Number(p?.value)),season=Math.round(Number(p?.season)),round=Math.round(Number(p?.round)),original_owner=Math.round(Number(p?.original_owner)),owner=Math.round(Number(p?.owner));
    if(!id||!Number.isFinite(value)||value<0||value>12000||!Number.isFinite(season)||season<2020||season>2100||!Number.isFinite(round)||round<1||round>10||!Number.isFinite(original_owner)||original_owner<1)continue;
    out.push({id,value,season,round,original_owner,owner:Number.isFinite(owner)?owner:0});
  }
  return out.slice(0,1000);
}
function fingerprint(rows,picks=[]){
  let h=2166136261;
  for(const r of rows){const x=`${r.id}:${r.value}:${r.overall}:${r.posRank}|`;for(let i=0;i<x.length;i++){h^=x.charCodeAt(i);h=Math.imul(h,16777619)}}
  for(const p of picks){const x=`P:${p.id}:${p.value}:${p.season}:${p.round}:${p.original_owner}|`;for(let i=0;i<x.length;i++){h^=x.charCodeAt(i);h=Math.imul(h,16777619)}}
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
async function writeFilteredIndexes(s,keepItems){
  const keep=new Map(keepItems.map(x=>[x.key,x]));
  const legacy=normalizeItems(await safeGet(s,LEGACY_INDEX_KEY),LEGACY_MAX).filter(x=>keep.has(x.key));
  await retry(()=>s.setJSON(LEGACY_INDEX_KEY,{version:2,items:legacy.slice(-LEGACY_MAX)}),120);
  const months=normalizeMonths(await safeGet(s,MONTHS_KEY));
  for(const month of months){
    const key=monthIndexKey(month),items=normalizeItems(await safeGet(s,key)).filter(x=>keep.has(x.key));
    await retry(()=>s.setJSON(key,{version:2,month,items}),120);
  }
}
async function scrubV346KtcContamination(s){
  const marker=await safeGet(s,V346_CLEANUP_KEY);if(marker?.done)return marker;
  const indexed=await indexedItemsAll(s),items=indexed.items||[];
  const bad=items.filter(x=>{const ms=new Date(x?.t||'').getTime();return Number.isFinite(ms)&&ms>V346_KTC_CUTOFF_MS});
  const keep=items.filter(x=>!bad.some(b=>b.key===x.key));
  for(const item of bad){try{await retry(()=>s.delete(item.key),120)}catch(e){console.warn('v346-history-delete',item.key,e)}}
  try{await writeFilteredIndexes(s,keep)}catch(e){console.warn('v346-history-reindex',e)}
  const last=keep[keep.length-1]||null;
  if(last){
    const snap=await safeGet(s,last.key);
    if(snap?.t&&Array.isArray(snap?.rows))await retry(()=>s.setJSON(LATEST_KEY,{version:2,t:snap.t,fingerprint:snap.fingerprint||fingerprint(snap.rows),key:last.key,count:snap.rows.length}),120);
  }else await retry(()=>s.delete(LATEST_KEY),120).catch(()=>{});
  const result={done:true,cutoff:'2026-09-08T05:23:00.000Z',removed:bad.length,completedAt:new Date().toISOString()};
  await retry(()=>s.setJSON(V346_CLEANUP_KEY,result),120);return result;
}
async function scrubV348ConsensusContamination(s){
  const marker=await safeGet(s,V348_CLEANUP_KEY);if(marker?.done)return marker;
  const indexed=await indexedItemsAll(s),items=indexed.items||[];
  const isBad=item=>{const ms=new Date(item?.t||'').getTime();return Number.isFinite(ms)&&V348_BAD_WINDOWS.some(([a,b])=>ms>=a&&ms<b)};
  const bad=items.filter(isBad),keep=items.filter(item=>!isBad(item));
  for(const item of bad){try{await retry(()=>s.delete(item.key),120)}catch(e){console.warn('v348-history-delete',item.key,e)}}
  try{await writeFilteredIndexes(s,keep)}catch(e){console.warn('v348-history-reindex',e)}
  const last=keep[keep.length-1]||null;
  if(last){const snap=await safeGet(s,last.key);if(snap?.t&&Array.isArray(snap?.rows))await retry(()=>s.setJSON(LATEST_KEY,{version:2,t:snap.t,fingerprint:snap.fingerprint||fingerprint(snap.rows),key:last.key,count:snap.rows.length}),120)}
  const result={done:true,windows:['2026-09-08 16:00 EDT','2026-09-08 18:08 EDT'],removed:bad.length,completedAt:new Date().toISOString()};
  await retry(()=>s.setJSON(V348_CLEANUP_KEY,result),120);return result;
}
async function latestFallback(s,playerId){
  const latest=await safeGet(s,LATEST_KEY),key=String(latest?.key||'').trim();
  if(!key)return{reachable:true,points:[],source:'empty'};
  const snap=await safeGet(s,key);
  if(!snap)return{reachable:false,points:[],source:'latest-unreadable'};
  return{reachable:true,points:pointsFromSnapshots([snap],playerId),source:'latest-fallback'};
}
async function getPlayerHistory(s,playerId){
  const indexed=await allItems(s),localSnaps=indexed.items.length?await readSnapshotsBounded(s,indexed.items,25):[],archiveSnaps=await archiveAllSnapshots(),snaps=mergeSnapshots(archiveSnaps,localSnaps);
  if(snaps.length)return{points:pointsFromSnapshots(snaps,playerId),source:archiveSnaps.length?'github-archive+netlify-live':'netlify-live',snapshotCount:snaps.length};
  if(indexed.source==='unavailable'){
    const fallback=await latestFallback(s,playerId);
    if(!fallback.reachable)throw new Error('history store unavailable');
    return{points:fallback.points,source:fallback.source,snapshotCount:fallback.source==='empty'?0:1,partial:fallback.source==='latest-fallback'};
  }
  return{points:[],source:'empty',snapshotCount:0};
}
async function getTeamNetHistory(s,playerIds){
  const ids=[...new Set((playerIds||[]).map(String).filter(Boolean))].slice(0,100),wanted=new Set(ids);
  if(!ids.length)return{points:[],playerCount:0,source:'empty'};
  const indexed=await allItems(s),localSnaps=indexed.items.length?await readSnapshotsBounded(s,indexed.items,25):[],archiveSnaps=await archiveAllSnapshots(),snaps=mergeSnapshots(archiveSnaps,localSnaps);
  if(!snaps.length)return{points:[],playerCount:ids.length,source:indexed.source};
  const points=[];
  for(const snap of snaps){
    let value=0,found=0;
    for(const row of snap?.rows||[]){
      if(!wanted.has(String(row?.id)))continue;
      const n=Number(row?.value);if(!Number.isFinite(n))continue;
      value+=n;found++;
    }
    points.push({t:snap.t,value:Math.round(value),playersFound:found,playerCount:ids.length});
  }
  return{points,playerCount:ids.length,source:archiveSnaps.length?'github-archive+netlify-live':'netlify-live',snapshotCount:snaps.length};
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
  const valueRisers=rows.filter(x=>x.delta>0).sort((a,b)=>b.delta-a.delta||b.value-a.value);
  const valueFallers=rows.filter(x=>x.delta<0).sort((a,b)=>a.delta-b.delta||b.value-a.value);
  const rankRisers=rows.filter(x=>x.overallDelta>0).sort((a,b)=>b.overallDelta-a.overallDelta||b.value-a.value);
  const rankFallers=rows.filter(x=>x.overallDelta<0).sort((a,b)=>a.overallDelta-b.overallDelta||b.value-a.value);
  const posRankRisers=rows.filter(x=>x.posRankDelta>0).sort((a,b)=>b.posRankDelta-a.posRankDelta||b.value-a.value);
  const posRankFallers=rows.filter(x=>x.posRankDelta<0).sort((a,b)=>a.posRankDelta-b.posRankDelta||b.value-a.value);
  return{valueRisers,valueFallers,rankRisers,rankFallers,posRankRisers,posRankFallers,metrics};
}
function marketFromSnapshots(snaps){
  const ordered=(snaps||[]).filter(s=>s?.t&&Array.isArray(s?.rows)).slice().sort((a,b)=>String(a.t).localeCompare(String(b.t)));
  if(!ordered.length)return{tracking_since:null,latest:null,snapshot_count:0,periods:{'1D':{},'7D':{},'30D':{},'90D':{},'1Y':{},'ALL':{}},marketRows:[],has1:false,has7:false,has30:false,has90:false,has365:false};
  const first=ordered[0],latest=ordered[ordered.length-1],latestMs=new Date(latest.t).getTime(),firstMs=new Date(first.t).getTime();
  const bases={
    '1D':baselineFor(ordered,latestMs,1)||first,
    '7D':baselineFor(ordered,latestMs,7)||first,
    '30D':baselineFor(ordered,latestMs,30)||first,
    '90D':baselineFor(ordered,latestMs,90)||first,
    '1Y':baselineFor(ordered,latestMs,365)||first,
    'ALL':first
  };
  const periods={};
  for(const [label,base] of Object.entries(bases)){
    const p=marketPeriod(latest,base);
    periods[label]={valueRisers:p.valueRisers,valueFallers:p.valueFallers,rankRisers:p.rankRisers,rankFallers:p.rankFallers,posRankRisers:p.posRankRisers,posRankFallers:p.posRankFallers,baseline:base?.t||null};
  }
  const m1=marketPeriod(latest,bases['1D']).metrics,m7=marketPeriod(latest,bases['7D']).metrics,m30=marketPeriod(latest,bases['30D']).metrics,m365=marketPeriod(latest,bases['1Y']).metrics,mAll=marketPeriod(latest,bases['ALL']).metrics;
  const latestMap=rowMap(latest);
  const marketRows=[...latestMap.values()].map(r=>{
    const id=String(r.id),d1=m1.get(id),d7=m7.get(id),d30=m30.get(id),d365=m365.get(id),dAll=mAll.get(id);
    return{id,value:r.value,overall:r.overall,pos:r.pos,posRank:r.posRank,delta1:d1?.delta??null,delta7:d7?.delta??null,delta30:d30?.delta??null,delta365:d365?.delta??null,deltaAll:dAll?.delta??null,posRankDelta1:d1?.posRankDelta??null,posRankDelta7:d7?.posRankDelta??null,posRankDelta30:d30?.posRankDelta??null,posRankDelta365:d365?.posRankDelta??null,posRankDeltaAll:dAll?.posRankDelta??null,overallDelta7:d7?.overallDelta??null,overallDelta30:d30?.overallDelta??null};
  }).sort((a,b)=>b.value-a.value);
  return{
    tracking_since:first.t,latest:latest.t,snapshot_count:ordered.length,periods,marketRows,
    has1:latestMs-firstMs>=1*86400000,
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
  const local=await allItems(s),arch=await archiveIndex();
  const timed=[],seenT=new Set();
  for(const item of arch.items||[]){const t=String(item?.t||'');if(!t||seenT.has(t))continue;seenT.add(t);timed.push({...item,source:'archive'})}
  for(const item of local.items||[]){const t=String(item?.t||'');if(!t)continue;if(seenT.has(t)){const i=timed.findIndex(x=>x.t===t);if(i>=0)timed[i]={...item,source:'local'};continue}seenT.add(t);timed.push({...item,source:'local'})}
  timed.sort((a,b)=>String(a.t).localeCompare(String(b.t)));
  if(!timed.length){
    if(local.items?.length){
      const snaps=await readSnapshotsBounded(s,local.items,25),market=marketFromSnapshots(snaps);market.snapshot_count=snaps.length;return market;
    }
    return marketFromSnapshots([]);
  }
  const latestItem=timed[timed.length-1],latestMs=new Date(latestItem.t).getTime(),wanted=[timed[0],archiveItemAtOrBefore(timed,latestMs-1*86400000),archiveItemAtOrBefore(timed,latestMs-7*86400000),archiveItemAtOrBefore(timed,latestMs-30*86400000),archiveItemAtOrBefore(timed,latestMs-90*86400000),archiveItemAtOrBefore(timed,latestMs-365*86400000),latestItem].filter(Boolean);
  const unique=[],seen=new Set();for(const item of wanted){const k=`${item.source}:${item.key||item.path||item.t}`;if(!seen.has(k)){seen.add(k);unique.push(item)}}
  const snaps=[];
  for(const item of unique){
    if(item.source==='archive'){const snap=await archiveSnapshot(item);if(snap)snaps.push(snap)}
    else{try{const snap=await s.get(item.key,{type:'json'});if(snap?.t&&Array.isArray(snap.rows))snaps.push(snap)}catch{}}
  }
  snaps.sort((a,b)=>String(a.t).localeCompare(String(b.t)));
  const market=marketFromSnapshots(snaps);market.snapshot_count=timed.length;market.archive_snapshot_count=(arch.items||[]).length;market.local_snapshot_count=(local.items||[]).length;return market;
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
const SCORING_API='https://api.sleeper.app/v1';
const SCORING_RAW='https://raw.githubusercontent.com/dajuns5567/FFL-trade-finder/sleeper-data/data/sleeper';
const TRADE_AUDIT_SEASONS=[2024,2025,2026];
let tradeAuditCache=null;
const scoringCache=new Map();
async function scoringJson(url){
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'FFL-TradeFinder-ValueHistoryScoring/1.0'},cache:'no-store'});
  if(!r.ok)throw new Error(`scoring fetch ${r.status}`);
  return r.json();
}
function weeklyPlayerRow(payload,id){
  if(!payload)return null;
  if(!Array.isArray(payload)){const direct=payload?.[id];if(direct)return direct?.stats&&typeof direct.stats==='object'?direct.stats:direct}
  const rows=Array.isArray(payload)?payload:Object.values(payload||{});
  const row=rows.find(x=>String(x?.player_id||x?.id||'')===String(id));
  return row?(row?.stats&&typeof row.stats==='object'?row.stats:row):null;
}
function leagueScore(stats,scoring){
  let total=0,seen=false;
  for(const [key,weightRaw] of Object.entries(scoring||{})){
    const weight=Number(weightRaw),value=Number(stats?.[key]);
    if(!Number.isFinite(weight)||!Number.isFinite(value))continue;
    seen=true;total+=weight*value;
  }
  return seen?Number(total.toFixed(2)):null;
}
function weeklyHasData(weekly){return Object.values(weekly||{}).some(v=>Array.isArray(v)?v.length>0:(v&&typeof v==='object'&&Object.keys(v).length>0))}
async function liveSeasonWeeks(year){
  const pairs=await Promise.all(Array.from({length:18},async(_,i)=>{const week=i+1;try{return[week,await scoringJson(`${SCORING_API}/stats/nfl/regular/${year}/${week}`)]}catch{return[week,{}]}}));
  return Object.fromEntries(pairs);
}
async function scoringSeasonWeeks(year,currentSeason){
  const key=String(year),cached=scoringCache.get(key),now=Date.now();
  if(cached&&now-cached.t<(Number(year)===Number(currentSeason)?30000:86400000))return cached.weekly;
  let weekly={};
  if(Number(year)===Number(currentSeason)){
    weekly=await liveSeasonWeeks(year);
    if(!weeklyHasData(weekly))weekly=await scoringJson(`${SCORING_RAW}/${year}/weekly-stats.json?ts=${Date.now()}`).catch(()=>({}));
  }else{
    weekly=await scoringJson(`${SCORING_RAW}/${year}/weekly-stats.json?ts=${Date.now()}`).catch(()=>({}));
    if(!weeklyHasData(weekly))weekly=await liveSeasonWeeks(year);
  }
  scoringCache.set(key,{t:now,weekly});return weekly;
}
async function scoringMilestones(playerId){
  try{
    const league=await scoringJson(`${SCORING_API}/league/${LEAGUE}`),currentSeason=Number(league?.season),scoring=league?.scoring_settings||{};
    if(!currentSeason||!Object.keys(scoring).length)return null;
    const years=[currentSeason,currentSeason-1,currentSeason-2,currentSeason-3],weeklyByYear={};
    await Promise.all(years.map(async y=>weeklyByYear[y]=await scoringSeasonWeeks(y,currentSeason)));
    let highWeek=null,highSeason=null,highPpg=null;
    for(const year of years){
      let total=0,games=0;
      for(let week=1;week<=18;week++){
        const row=weeklyPlayerRow(weeklyByYear[year]?.[week],playerId);if(!row)continue;
        const points=leagueScore(row,scoring);if(points==null)continue;
        games++;total+=points;
        if(!highWeek||points>highWeek.points)highWeek={points,season:year,week};
      }
      total=Number(total.toFixed(2));
      if(games>=8){
        const ppg=Number((total/games).toFixed(2));
        if(!highSeason||total>highSeason.points)highSeason={points:total,season:year,games};
        if(!highPpg||ppg>highPpg.points)highPpg={points:ppg,season:year,games,total};
      }
    }
    return{source:'Sleeper weekly regular-season stats + league scoring settings',qualifyingSeasonMinimumGames:8,highWeek,highSeason,highPpg,refreshedAt:new Date().toISOString()};
  }catch(e){console.warn('value-history-scoring',e);return null}
}
async function tradeJson(url){
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'FFL-TradeFinder-TradeHistory/1.0'},cache:'no-store'});
  if(!r.ok)throw new Error(`trade history fetch ${r.status}`);
  return r.json();
}
function auditUrl(season,file){return`${SCORING_RAW}/league-audit/${season}/${file}.json?ts=${Date.now()}`}
function historicalTeamNames(users,rosters){
  const userById=new Map((users||[]).map(u=>[String(u?.user_id||''),u])),out={};
  for(const r of rosters||[]){
    const rid=String(r?.roster_id||'');if(!rid)continue;const u=userById.get(String(r?.owner_id||''))||{};
    out[rid]=String(u?.metadata?.team_name||u?.display_name||`Roster ${rid}`);
  }
  return out;
}
async function exactDraftResultMap(league){
  const leagueId=String(league?.league_id||'');if(!leagueId)return new Map();
  const drafts=await tradeJson(`${SCORING_API}/league/${leagueId}/drafts`).catch(()=>[]),out=new Map(),ambiguous=new Set();
  for(const meta of Array.isArray(drafts)?drafts:[]){
    const draftId=String(meta?.draft_id||'');if(!draftId)continue;
    const [draft,picks]=await Promise.all([
      tradeJson(`${SCORING_API}/draft/${draftId}`).catch(()=>null),
      tradeJson(`${SCORING_API}/draft/${draftId}/picks`).catch(()=>[])
    ]);
    const season=String(draft?.season||meta?.season||'');if(!season||!draft?.slot_to_roster_id||!Array.isArray(picks)||!picks.length)continue;
    const rosterToSlot=new Map();
    for(const [slot,rid] of Object.entries(draft.slot_to_roster_id||{})){const r=String(rid||'');if(r)rosterToSlot.set(r,Number(slot))}
    for(const [rid,slot] of rosterToSlot){
      if(!Number.isFinite(slot))continue;
      for(const pick of picks){
        if(Number(pick?.draft_slot)!==slot)continue;
        const round=Number(pick?.round),playerId=String(pick?.player_id||'');if(!round||!playerId)continue;
        const key=`${season}|${round}|${rid}`,mapped={player_id:playerId,draft_slot:slot,pick_no:Number(pick?.pick_no)||null,draft_id:draftId,source:'Sleeper draft result + slot_to_roster_id'};
        if(out.has(key)&&out.get(key)?.player_id!==playerId){ambiguous.add(key);out.delete(key)}else if(!ambiguous.has(key))out.set(key,mapped);
      }
    }
  }
  for(const key of ambiguous)out.delete(key);
  return out;
}
function normalizeCompletedTrade(tx,week,season,teamNames,draftResults){
  if(tx?.type!=='trade'||tx?.status!=='complete')return null;
  const rosterIds=[...new Set((tx.roster_ids||[]).map(String).filter(Boolean))],adds=tx.adds&&typeof tx.adds==='object'?tx.adds:{},picks=Array.isArray(tx.draft_picks)?tx.draft_picks:[];
  const createdMs=Number(tx.status_updated||tx.created),created=Number.isFinite(createdMs)?new Date(createdMs).toISOString():null;
  if(!created||rosterIds.length<2)return null;
  const sides=rosterIds.map(rosterId=>({
    roster_id:rosterId,
    player_ids:Object.entries(adds).filter(([,rid])=>String(rid)===rosterId).map(([id])=>String(id)),
    picks:picks.filter(p=>String(p?.owner_id||'')===rosterId).map(p=>{
      const pickSeason=String(p?.season||''),round=Number(p?.round)||null,original=p?.roster_id==null?null:String(p.roster_id),mapped=pickSeason&&round&&original?draftResults.get(`${pickSeason}|${round}|${original}`):null;
      return{season:pickSeason,round,original_roster_id:original,drafted_player_id:mapped?.player_id||null,draft_slot:mapped?.draft_slot||null,pick_no:mapped?.pick_no||null,draft_id:mapped?.draft_id||null,draft_result_source:mapped?.source||null};
    })
  }));
  return{id:String(tx.transaction_id||''),created,season:Number(season)||null,week:Number(week)||null,roster_ids:rosterIds,team_names:teamNames||{},sides};
}
async function importedCompletedTrades(){
  const now=Date.now();if(tradeAuditCache&&now-tradeAuditCache.t<60000)return tradeAuditCache.value;
  const seasonBundles=await Promise.all(TRADE_AUDIT_SEASONS.map(async season=>{
    const [transactions,league,users,rosters]=await Promise.all([
      tradeJson(auditUrl(season,'transactions')),
      tradeJson(auditUrl(season,'league')),
      tradeJson(auditUrl(season,'users')),
      tradeJson(auditUrl(season,'rosters'))
    ]);
    const teamNames=historicalTeamNames(users,rosters);
    return{season,transactions,league,teamNames};
  }));
  const combinedDraftResults=new Map(),ambiguous=new Set();
  for(const bundle of seasonBundles){
    const draftResults=await exactDraftResultMap(bundle.league);
    for(const [key,mapped] of draftResults){
      if(combinedDraftResults.has(key)&&combinedDraftResults.get(key)?.player_id!==mapped?.player_id){ambiguous.add(key);combinedDraftResults.delete(key)}
      else if(!ambiguous.has(key))combinedDraftResults.set(key,mapped);
    }
  }
  for(const key of ambiguous)combinedDraftResults.delete(key);
  const trades=[];
  for(const bundle of seasonBundles)for(const [week,rows] of Object.entries(bundle.transactions||{}))for(const tx of Array.isArray(rows)?rows:[]){const t=normalizeCompletedTrade(tx,week,bundle.season,bundle.teamNames,combinedDraftResults);if(t)trades.push(t)}
  trades.sort((a,b)=>String(b.created).localeCompare(String(a.created)));tradeAuditCache={t:now,value:trades};return trades;
}
function closestSnapshotItem(items,targetMs,maxGapMs=36*3600000){
  let best=null,bestGap=Infinity;
  for(const item of items||[]){
    const ms=new Date(item?.t||'').getTime();if(!Number.isFinite(ms))continue;
    const gap=Math.abs(ms-targetMs);if(gap<bestGap){bestGap=gap;best=item}
  }
  return best&&bestGap<=maxGapMs?best:null;
}
function playerValuesFromMap(side,map){
  const ids=side?.player_ids||[],values=[],missing=[];
  for(const id of ids){const row=map.get(String(id)),n=Number(row?.value);if(Number.isFinite(n))values.push({id:String(id),value:Math.round(n)});else missing.push(String(id))}
  return{values,missing,complete:missing.length===0,total:values.reduce((n,x)=>n+x.value,0)};
}
function pickMap(snap){return new Map((snap?.picks||[]).map(p=>[String(p.id),p]))}
function pickValuesFromSide(side,map){
  const values=[],missing=[];
  for(const p of side?.picks||[]){
    const id=`pick-${Number(p?.season)||0}-${Number(p?.round)||0}-${Number(p?.original_roster_id)||0}`,row=map.get(id),n=Number(row?.value);
    if(Number.isFinite(n))values.push({id,value:Math.round(n),season:Number(p.season),round:Number(p.round),original_roster_id:Number(p.original_roster_id)||null});else missing.push(id);
  }
  return{values,missing,complete:missing.length===0,total:values.reduce((n,x)=>n+x.value,0)};
}
async function completedTradeHistory(s){
  const trades=await importedCompletedTrades(),indexed=await allItems(s),items=indexed.items||[];
  if(!items.length)return{source:'Sleeper imported transaction audits (2024–2026) + exact Sleeper draft results',tracking_since:null,latest:null,trades:trades.map(t=>({...t,trade_snapshot_t:null,current_snapshot_t:null,sides:t.sides.map(side=>({...side,then_players:[],then_players_complete:false,then_picks:[],then_picks_complete:false,current_players:[],current_players_complete:false}))}))};
  const latestItem=items[items.length-1],selected=new Map([[latestItem.key,latestItem]]),snapshotItemByTrade=new Map();
  for(const trade of trades){
    const ms=new Date(trade.created).getTime(),item=Number.isFinite(ms)?closestSnapshotItem(items,ms):null;
    if(item){selected.set(item.key,item);snapshotItemByTrade.set(trade.id,item)}
  }
  const selectedItems=[...selected.values()].sort((a,b)=>String(a.t).localeCompare(String(b.t))),snaps=await readSnapshotsBounded(s,selectedItems,20),snapByKey=new Map();
  for(const snap of snaps){const item=selectedItems.find(x=>String(x.t)===String(snap.t));if(item)snapByKey.set(item.key,snap)}
  const latestSnap=snapByKey.get(latestItem.key),latestMap=rowMap(latestSnap||{rows:[]});
  const out=trades.map(trade=>{
    const histItem=snapshotItemByTrade.get(trade.id)||null,histSnap=histItem?snapByKey.get(histItem.key):null,histMap=rowMap(histSnap||{rows:[]}),histPickMap=pickMap(histSnap||{picks:[]});
    const sides=trade.sides.map(side=>{
      const then=histItem?playerValuesFromMap(side,histMap):{values:[],missing:[...(side.player_ids||[])],complete:false,total:null},thenPicks=histItem?pickValuesFromSide(side,histPickMap):{values:[],missing:(side.picks||[]).map(p=>`pick-${p.season}-${p.round}-${p.original_roster_id}`),complete:false,total:null},current=playerValuesFromMap(side,latestMap);
      return{...side,then_players:then.values,then_players_complete:Boolean(histItem&&then.complete),then_player_total:histItem&&then.complete?then.total:null,then_picks:thenPicks.values,then_picks_complete:Boolean(histItem&&thenPicks.complete),then_pick_total:histItem&&thenPicks.complete?thenPicks.total:null,current_players:current.values,current_players_complete:current.complete,current_player_total:current.complete?current.total:null};
    });
    return{...trade,trade_snapshot_t:histItem?.t||null,current_snapshot_t:latestItem?.t||null,sides};
  });
  return{source:'Sleeper imported transaction audits (2024–2026) + exact Sleeper draft results',tracking_since:items[0]?.t||null,latest:latestItem?.t||null,trades:out};
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
    try{await scrubV346KtcContamination(s)}catch(e){console.warn('v346-history-scrub',e)}
    try{await scrubV348ConsensusContamination(s)}catch(e){console.warn('v348-history-scrub',e)}
    if(req.method==='GET'){
      if(url.searchParams.get('archive_export')==='1'){
        const indexed=await allItems(s),sinceMs=new Date(String(url.searchParams.get('since')||'')).getTime();
        const items=(indexed.items||[]).filter(item=>{const ms=new Date(item?.t||'').getTime();return !Number.isFinite(sinceMs)||!Number.isFinite(ms)||ms>sinceMs});
        const snapshots=await readSnapshotsBounded(s,items,25);
        return json({schema_version:1,league_id:LEAGUE,source:'netlify-live-buffer',snapshot_count:snapshots.length,snapshots});
      }
      if(url.searchParams.get('health')==='1'){
        const h=await health(s);
        return json(h,h.ok?200:503);
      }
      if(url.searchParams.get('market')==='1'){
        const market=await retry(()=>getMarketSummary(s),180);
        return json({market,history_state:'ok'});
      }
      if(url.searchParams.get('trades')==='1'){
        const result=await retry(()=>completedTradeHistory(s),180);
        return json(result);
      }
      if(url.searchParams.get('team_net')==='1'){
        const ids=String(url.searchParams.get('player_ids')||'').split(',').map(x=>x.trim()).filter(Boolean);
        const result=await retry(()=>getTeamNetHistory(s,ids),180);
        return json({team_net:true,points:result.points||[],player_count:result.playerCount||0,history_state:result.source,snapshot_count:result.snapshotCount||0});
      }
      const playerId=String(url.searchParams.get('player_id')||'').trim();
      if(!playerId)return json({error:'player_id required'},400);
      const result=await retry(()=>getPlayerHistory(s,playerId),180),milestones=await scoringMilestones(playerId);
      return json({player_id:playerId,points:result.points||[],scoring_milestones:milestones,history_state:result.source,snapshot_count:result.snapshotCount||0,partial:!!result.partial});
    }
    if(req.method!=='POST')return json({error:'method not allowed'},405);
    const body=await req.json().catch(()=>null);
    if(String(body?.league||'')!==LEAGUE)return json({error:'league mismatch'},400);
    const rows=cleanRows(body?.rows),picks=cleanPicks(body?.picks);
    if(rows.length<100)return json({error:'incomplete snapshot'},400);
    rows.sort((a,b)=>a.id.localeCompare(b.id));picks.sort((a,b)=>a.id.localeCompare(b.id));
    const fp=fingerprint(rows,picks),latest=await safeGet(s,LATEST_KEY);
    if(latest?.fingerprint===fp)return json({ok:true,stored:false,reason:'unchanged',t:latest.t});
    const t=new Date().toISOString(),key=`snapshots/${t.replace(/[:.]/g,'-')}.json`;
    const snapshot={version:3,league:LEAGUE,t,fingerprint:fp,rows,picks};
    await retry(()=>s.setJSON(key,snapshot),120);
    await retry(()=>s.setJSON(LATEST_KEY,{version:2,t,fingerprint:fp,key,count:rows.length}),120);
    try{await appendIndex(s,key,t)}catch(e){console.warn('value-history-index',e)}
    return json({ok:true,stored:true,t,count:rows.length,pick_count:picks.length});
  }catch(e){
    console.error('value-history',e);
    return json({error:'history unavailable'},503);
  }
};
