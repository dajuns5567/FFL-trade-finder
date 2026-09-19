import { getStore } from '@netlify/blobs';
import { readFileSync } from 'node:fs';
import { emptyMonthBundle, parseMonthBundleText } from './value-history-archive-utils.mjs';
const token=process.env.GITHUB_TOKEN;
const repository=process.env.GITHUB_REPOSITORY||'dajuns5567/FFL-trade-finder';
const sourceBase=process.env.VALUE_HISTORY_SOURCE_URL||'https://subtle-genie-6167c5.netlify.app/.netlify/functions/value-history';
const netlifySiteId=process.env.NETLIFY_SITE_ID||'0cc03543-09f9-4de9-9b52-6cbc4fbc4357';
const netlifyTokens=[process.env.NETLIFY_BLOBS_TOKEN,process.env.NETLIFY_AUTH_TOKEN].map(x=>String(x||'').trim()).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i);
const dataBranch='value-history-data';
const root='value-history';
const scheduledSnapshotFile=String(process.env.VALUE_HISTORY_SNAPSHOT_FILE||'').trim();
if(!token)throw new Error('GITHUB_TOKEN required');
const [owner,repo]=repository.split('/');
const api='https://api.github.com';
const headers={authorization:`Bearer ${token}`,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','user-agent':'Fleeced-Value-History-Archive/1.0'};

async function gh(path,init={}){
  const r=await fetch(`${api}${path}`,{...init,headers:{...headers,...(init.headers||{})}});
  if(r.status===404)return null;
  if(!r.ok)throw new Error(`GitHub ${r.status}: ${await r.text()}`);
  return r.json();
}
async function readFile(path){
  const j=await gh(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g,'/')}?ref=${encodeURIComponent(dataBranch)}`);
  if(!j)return null;
  let encoding=String(j.encoding||'').toLowerCase(),encoded=String(j.content||'').trim();
  // GitHub's Contents API omits inline content for files larger than 1 MB.
  // Monthly Value History bundles can exceed that size, so fall back to the
  // Git blob endpoint using the authoritative blob SHA instead of treating the
  // file as empty and falsely reporting every indexed snapshot as missing.
  if((!encoded||encoding==='none')&&j.sha){
    const blob=await gh(`/repos/${owner}/${repo}/git/blobs/${j.sha}`);
    if(blob){
      encoding=String(blob.encoding||'base64').toLowerCase();
      encoded=String(blob.content||'').trim();
    }
  }
  const content=encoding==='base64'
    ?Buffer.from(encoded.replace(/\s+/g,''),'base64').toString('utf8')
    :encoded;
  return{sha:j.sha,content};
}
async function putFile(path,content,message,sha){
  const body={message,content:Buffer.from(content).toString('base64'),branch:dataBranch};
  if(sha)body.sha=sha;
  return gh(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g,'/')}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
}
const V380_BAD_WINDOW=[Date.parse('2026-09-10T03:25:00.000Z'),Date.parse('2026-09-10T03:35:00.000Z')];
const V381_BAD_WINDOW=[Date.parse('2026-09-10T03:20:00.000Z'),Date.parse('2026-09-10T03:46:38.700Z')];
const V391_BAD_WINDOW=[Date.parse('2026-09-10T03:51:00.000Z'),Date.parse('2026-09-10T03:52:00.000Z')];
const V494_BAD_WINDOW=[Date.parse('2026-09-16T04:57:00.000Z'),Date.parse('2026-09-19T19:38:00.000Z')];
const V495_BAD_TIMES=new Set(['2026-09-19T21:47:21.051Z']);
const V498_BAD_TIMES=new Set(['2026-09-19T23:09:48.738Z']);
const V496_BASELINE_T='2026-09-19T22:01:38.323Z';
const V496_BASELINE_MS=Date.parse(V496_BASELINE_T);
const SCHEDULED_VALUATION_CONTRACT='precision-idp-runtime-20260919';
function isKnownBadSnapshot(s){const t=String(s?.t||''),ms=new Date(t).getTime();return V495_BAD_TIMES.has(t)||V498_BAD_TIMES.has(t)||(Number.isFinite(ms)&&(ms<V496_BASELINE_MS||[V380_BAD_WINDOW,V381_BAD_WINDOW,V391_BAD_WINDOW,V494_BAD_WINDOW].some(([a,b])=>ms>=a&&ms<b)))}
function validSnapshot(s){
  return s&&String(s.league)==='1316867686394769408'&&s.t&&Array.isArray(s.rows)&&s.rows.length>=100&&!isKnownBadSnapshot(s)&&(String(s.source||'')!=='scheduled'||String(s.valuation_contract||'')===SCHEDULED_VALUATION_CONTRACT);
}
function monthOf(t){return String(t).slice(0,7)}
function safeName(t){return String(t).replace(/[:.]/g,'-')}

const idxFile=await readFile(`${root}/index.json`);
if(!idxFile)throw new Error('Value History archive index missing');
const index=JSON.parse(idxFile.content),existing=new Set((index.items||[]).map(x=>String(x.t))),since=index.latest||'';
async function snapshotsFromBlobStore(){
  if(!netlifyTokens.length)return null;
  let last=null;
  for(const token of netlifyTokens){
    try{
      const live=getStore({name:'fll-value-history-v2',siteID:netlifySiteId,token,consistency:'strong'});
      const listing=await live.list({prefix:'snapshots/'});
      const keys=(listing?.blobs||[]).map(x=>String(x?.key||'')).filter(Boolean).sort(),snapshots=[];
      for(let i=0;i<keys.length;i+=25){
        const batch=keys.slice(i,i+25);
        const rows=await Promise.all(batch.map(key=>live.get(key,{type:'json'}).catch(()=>null)));
        for(const snap of rows)if(validSnapshot(snap))snapshots.push(snap);
      }
      snapshots.sort((a,b)=>String(a.t).localeCompare(String(b.t)));
      return{schema_version:1,league_id:'1316867686394769408',source:'netlify-blobs-direct',snapshot_count:snapshots.length,snapshots};
    }catch(e){last=e}
  }
  if(last)console.warn('Netlify Blob archive credentials unavailable; trying HTTP export:',String(last?.message||last));
  return null;
}
async function snapshotsFromHttpExport(){
  const source=new URL(sourceBase);source.searchParams.set('archive_export','1');if(since)source.searchParams.set('since',since);
  const response=await fetch(source,{headers:{accept:'application/json','user-agent':'Fleeced-Value-History-Archive/1.0'},cache:'no-store'});
  if(!response.ok){
    const body=await response.text();
    throw new Error(`Value History export ${response.status}: ${body.includes('Login Redirect')?'production site requires Netlify authentication; configure NETLIFY_BLOBS_TOKEN repository secret for direct Blob archival':body.slice(0,500)}`);
  }
  return response.json();
}
let payload;
if(scheduledSnapshotFile){
  const snap=JSON.parse(readFileSync(scheduledSnapshotFile,'utf8'));
  payload={schema_version:1,league_id:'1316867686394769408',source:'scheduled-local-browser',snapshot_count:1,snapshots:[snap]};
}else payload=await snapshotsFromBlobStore()||await snapshotsFromHttpExport();
const incoming=(payload.snapshots||[]).filter(validSnapshot).filter(s=>!existing.has(String(s.t))).sort((a,b)=>String(a.t).localeCompare(String(b.t)));
if(!incoming.length){
  console.log(`No new Value History snapshots to archive. Source=${payload.source||'unknown'} source_count=${Number(payload.snapshot_count)||0} archive_count=${(index.items||[]).length}.`);
  process.exit(0)
}

const monthGroups=new Map();
for(const snap of incoming){
  const month=monthOf(snap.t),path=`${root}/snapshots/${month.replace('-','/')}/${safeName(snap.t)}.json`;
  const prior=await readFile(path);
  if(!prior)await putFile(path,JSON.stringify(snap,null,2)+'\n',`Archive Value History snapshot ${snap.t}`);
  index.items=index.items||[];index.items.push({t:snap.t,path,fingerprint:snap.fingerprint||null,count:snap.rows.length,source:snap.source||null});
  if(!monthGroups.has(month))monthGroups.set(month,[]);monthGroups.get(month).push(snap);
}
async function rebuildMonthBundleFromSnapshots(month){
  const bundle=emptyMonthBundle(month),items=(index.items||[]).filter(item=>monthOf(item?.t)===month&&item?.path);
  const snaps=[];
  for(let i=0;i<items.length;i+=20){
    const batch=items.slice(i,i+20);
    const files=await Promise.all(batch.map(item=>readFile(item.path).catch(()=>null)));
    for(const file of files){
      if(!file?.content?.trim())continue;
      try{const snap=JSON.parse(file.content);if(validSnapshot(snap))snaps.push(snap)}catch{}
    }
  }
  const byT=new Map(snaps.map(s=>[String(s.t),s]));
  bundle.snapshots=[...byT.values()].sort((a,b)=>String(a.t).localeCompare(String(b.t)));
  return bundle;
}
for(const [month,newSnaps] of monthGroups){
  const path=`${root}/months/${month}.json`,prior=await readFile(path);
  // The index + immutable per-snapshot files are authoritative. Rebuild the touched
  // month from those append-only records every time so a partial/stale month bundle
  // can never erase earlier history.
  const bundle=await rebuildMonthBundleFromSnapshots(month);
  const byT=new Map((bundle.snapshots||[]).filter(validSnapshot).map(s=>[String(s.t),s]));
  for(const snap of newSnaps)byT.set(String(snap.t),snap);
  bundle.snapshots=[...byT.values()].sort((a,b)=>String(a.t).localeCompare(String(b.t)));
  const indexedMonthTimes=new Set((index.items||[]).filter(item=>monthOf(item?.t)===month).map(item=>String(item.t)));
  const bundleTimes=new Set(bundle.snapshots.map(s=>String(s.t)));
  const missing=[...indexedMonthTimes].filter(t=>!bundleTimes.has(t));
  if(missing.length)throw new Error(`Monthly Value History rebuild missing ${missing.length} indexed snapshot(s) for ${month}: ${missing.slice(0,5).join(', ')}`);
  await putFile(path,JSON.stringify(bundle,null,2)+'\n',`Rebuild append-only Value History monthly archive ${month}`,prior?.sha);
}
index.items.sort((a,b)=>String(a.t).localeCompare(String(b.t)));
index.months=[...new Set(index.items.map(x=>monthOf(x.t)))].sort();
index.snapshot_count=index.items.length;
index.tracking_since=index.items[0]?.t||null;
index.latest=index.items.at(-1)?.t||null;
await putFile(`${root}/index.json`,JSON.stringify(index,null,2)+'\n',`Update durable Value History index through ${index.latest}`,idxFile.sha);
const latestFile=await readFile(`${root}/latest.json`);
await putFile(`${root}/latest.json`,JSON.stringify({schema_version:1,league_id:'1316867686394769408',latest:index.items.at(-1)||null},null,2)+'\n',`Update durable Value History latest pointer`,latestFile?.sha);
const verify=JSON.parse((await readFile(`${root}/index.json`)).content);
if(Number(verify?.snapshot_count)!==Number(index.snapshot_count)||!verify?.latest)throw new Error('Durable Value History archive verification failed after write');
const beforeCount=Number(JSON.parse(idxFile.content)?.snapshot_count)||0;
if(Number(verify?.snapshot_count)<beforeCount)throw new Error('Durable Value History archive must never shrink');
for(const month of monthGroups.keys()){
  const monthFile=await readFile(`${root}/months/${month}.json`);
  const monthBundle=parseMonthBundleText(monthFile?.content,month);
  const expected=(verify.items||[]).filter(item=>monthOf(item?.t)===month).map(item=>String(item.t));
  const actual=new Set((monthBundle?.snapshots||[]).map(s=>String(s.t)));
  const missing=expected.filter(t=>!actual.has(t));
  if(missing.length)throw new Error(`Durable Value History monthly archive ${month} is missing ${missing.length} indexed point(s)`);
}
for(const snap of incoming){
  const item=(verify.items||[]).find(x=>String(x?.t)===String(snap.t));
  if(!item)throw new Error(`Durable Value History archive verification missing snapshot ${snap.t}`);
  if(String(snap.source||'')==='scheduled'&&String(item.source||'')!=='scheduled')throw new Error(`Durable Value History archive verification lost scheduled source for ${snap.t}`);
  const stored=await readFile(String(item.path||''));
  if(!stored?.content)throw new Error(`Durable Value History archive verification unreadable snapshot ${snap.t}`);
  const parsed=JSON.parse(stored.content);
  if(String(parsed?.t)!==String(snap.t)||String(parsed?.source||'')!==String(snap.source||''))throw new Error(`Durable Value History archive verification content mismatch for ${snap.t}`);
}
console.log(`Archived ${incoming.length} Value History snapshot(s) from ${payload.source||'unknown'}; total ${index.snapshot_count}; latest ${index.latest}.`);
