import { getStore } from '@netlify/blobs';
import { readFileSync } from 'node:fs';
import { emptyMonthBundle, parseMonthBundleText } from './value-history-archive-utils.mjs';
import { inspectShortTermSnapback } from './value-history-snapshot-integrity.mjs';
import { readSnapshotInventory } from './archive-blob-inventory.mjs';
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
const V499_BAD_TIMES=new Set(['2026-09-19T23:38:30.077Z','2026-09-20T06:20:50.829Z','2026-09-20T06:23:39.657Z','2026-09-20T12:25:37.233Z','2026-09-20T16:31:11.607Z','2026-09-20T19:29:04.241Z','2026-09-20T22:29:01.016Z']);
const V496_BASELINE_T='2026-09-19T22:01:38.323Z';
const V496_BASELINE_MS=Date.parse(V496_BASELINE_T);
const SCHEDULED_VALUATION_CONTRACT='precision-idp-runtime-20260919';
const V101_SCHEDULED_CONTRACT='precision-idp-runtime-v101-20261119';
const V96_MODEL='idp-v96-single-source-continuous-v95-evidence';
const V101_MODEL='idp-v101-verified-role-growth-v100-source-free-lineage';
const V101_AUDITED_BLOB='443c8497a95e793665fb78474feaee49bd57e88f';
function isKnownBadSnapshot(s){const t=String(s?.t||''),ms=new Date(t).getTime();return V495_BAD_TIMES.has(t)||V498_BAD_TIMES.has(t)||V499_BAD_TIMES.has(t)||(Number.isFinite(ms)&&(ms<V496_BASELINE_MS||[V380_BAD_WINDOW,V381_BAD_WINDOW,V391_BAD_WINDOW,V494_BAD_WINDOW].some(([a,b])=>ms>=a&&ms<b)))}
function validSnapshot(s){
  return s&&String(s.league)==='1316867686394769408'&&s.t&&
    s?.provenance?.candidate_read_only!==true&&
    Array.isArray(s.rows)&&s.rows.length>=100&&!isKnownBadSnapshot(s)&&(
    String(s.source||'')!=='scheduled'||
    String(s.valuation_contract||'')===SCHEDULED_VALUATION_CONTRACT&&
      String(s.valuation_model||'')!==V101_MODEL||
    String(s.valuation_model||'')===V101_MODEL&&
      String(s.valuation_contract||'')===V101_SCHEDULED_CONTRACT&&
      s?.provenance?.canonical_parity==='exact'&&
      Number(s?.provenance?.consensus_sources)>=7&&
      String(s?.provenance?.model_blob_sha||'')===V101_AUDITED_BLOB
  );
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
      const snapshots=await readSnapshotInventory(live,validSnapshot);
      return{schema_version:1,league_id:'1316867686394769408',source:'netlify-blobs-direct',snapshot_count:snapshots.length,snapshots};
    }catch(e){
      if(String(e?.message||e).startsWith('ARCHIVE_INTEGRITY:'))throw e;
      last=e;
    }
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
  // V106: a research-only V101 capture must NEVER reach the durable history
  // archive under the older V96 era. Refuse explicitly, do not silently skip.
  if(snap?.provenance?.candidate_read_only===true)
    throw new Error('VALUE_HISTORY_MODEL_GUARD: scheduled archive rejects unapproved or read-only candidate valuation model');
  const model=String(snap?.valuation_model||''),selected=String(process.env.VALUE_HISTORY_SCHEDULED_MODEL||'').trim()||V96_MODEL;
  if(model===V101_MODEL){
    // Never record V101 under V96's contract or before a separately approved
    // main-branch promotion. No fallback to V96, no silent stamp rewriting.
    if(selected!==V101_MODEL||process.env.VALUE_HISTORY_V101_APPROVED!=='1'||
       process.env.GITHUB_REF!=='refs/heads/main'||
       !['schedule','workflow_run','workflow_dispatch'].includes(String(process.env.GITHUB_EVENT_NAME||''))||
       snap?.valuation_contract!==V101_SCHEDULED_CONTRACT||
       snap?.provenance?.model_blob_sha!==V101_AUDITED_BLOB||
       snap?.provenance?.canonical_parity!=='exact'||
       Number(snap?.provenance?.consensus_sources)<7||
       !/^[a-f0-9]{40}$/.test(String(snap?.provenance?.git_commit||''))||
       !Array.isArray(snap?.provenance?.source_manifest)||
       snap.provenance.source_manifest.length<7||
       !Array.isArray(snap?.rows)||snap.rows.length<1000||
       !Array.isArray(snap?.picks)||snap.picks.length<96||
       !Array.isArray(snap?.teams)||snap.teams.length!==32)
      throw new Error('VALUE_HISTORY_MODEL_GUARD: V101 scheduled archive requires explicitly approved, fully verified release provenance');
  }else if(model!==V96_MODEL||selected!==V96_MODEL||
           snap?.valuation_contract!==SCHEDULED_VALUATION_CONTRACT)
    throw new Error('VALUE_HISTORY_MODEL_GUARD: scheduled archive rejects unapproved or read-only candidate valuation model');
  payload={schema_version:1,league_id:'1316867686394769408',source:'scheduled-local-browser',snapshot_count:1,snapshots:[snap]};
}else payload=await snapshotsFromBlobStore()||await snapshotsFromHttpExport();
const incoming=(payload.snapshots||[]).filter(validSnapshot).filter(s=>!existing.has(String(s.t))).sort((a,b)=>String(a.t).localeCompare(String(b.t)));
if(!incoming.length){
  console.log(`No new Value History snapshots to archive. Source=${payload.source||'unknown'} source_count=${Number(payload.snapshot_count)||0} archive_count=${(index.items||[]).length}.`);
  process.exit(0)
}

// Check immutable, already-archived evidence before writing any new point.
// A correlated snapback across several players within hours is more likely an
// incomplete/transient publisher refresh than meaningful dynasty consensus.
// Do NOT average, rewrite, delete, or invent any individual historical value.
// Refuse this unverified batch and allow the next scheduled refresh to retry.
const recentlyIndexed=(index.items||[]).filter(x=>x?.path).slice().sort((a,b)=>String(a.t).localeCompare(String(b.t))).slice(-2);
const confirmed=[];
for(const item of recentlyIndexed){
 const record=await readFile(item.path);
 if(record?.content)try{const parsed=JSON.parse(record.content);if(validSnapshot(parsed))confirmed.push(parsed)}catch{}
}
for(const snap of incoming){
 // A deliberate V96 -> V101 model migration is not a same-model snapback.
 // Keep the existing immutable-history integrity gate for three consecutive
 // observations within the SAME model era, including legacy untagged rows.
 const era=String(snap?.valuation_model||'');
 const sameEra=confirmed.length>=2&&
  String(confirmed.at(-1)?.valuation_model||'')===era&&
  String(confirmed.at(-2)?.valuation_model||'')===era;
 if(sameEra){
  const check=inspectShortTermSnapback(confirmed.at(-2),confirmed.at(-1),snap);
  if(!check.ok)
   throw new Error('VALUE_HISTORY_COHORT_SNAPBACK: Refusing unverified scheduled batch '+snap.t+
    '; '+check.affected+'/'+check.comparable+' players reversed >=75 in <=18h, threshold='+
    check.threshold+'; preserving immutable archive and retrying on next schedule. Examples='+JSON.stringify(check.examples));
 }
 confirmed.push(snap);
}

const monthGroups=new Map();
for(const snap of incoming){
  const month=monthOf(snap.t),path=`${root}/snapshots/${month.replace('-','/')}/${safeName(snap.t)}.json`;
  const prior=await readFile(path);
  if(!prior)await putFile(path,JSON.stringify(snap,null,2)+'\n',`Archive Value History snapshot ${snap.t}`);
  index.items=index.items||[];index.items.push({t:snap.t,path,fingerprint:snap.fingerprint||null,count:snap.rows.length,source:snap.source||null,valuation_model:snap.valuation_model||null,valuation_contract:snap.valuation_contract||null});
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
  if(String(parsed?.t)!==String(snap.t)||String(parsed?.source||'')!==String(snap.source||'')||String(parsed?.valuation_model||'')!==String(snap.valuation_model||''))throw new Error(`Durable Value History archive verification content mismatch for ${snap.t}`);
  if(String(item?.valuation_model||'')!==String(snap?.valuation_model||'')||
     String(item?.valuation_contract||'')!==String(snap?.valuation_contract||'')||
     String(parsed?.valuation_contract||'')!==String(snap?.valuation_contract||''))
    throw new Error(`VALUE_HISTORY_MODEL_INTEGRITY: index and immutable snapshot must preserve model and era contract for ${snap.t}`);
}
console.log(`Archived ${incoming.length} Value History snapshot(s) from ${payload.source||'unknown'}; total ${index.snapshot_count}; latest ${index.latest}.`);
