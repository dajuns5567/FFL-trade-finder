import { getStore } from '@netlify/blobs';
const token=process.env.GITHUB_TOKEN;
const repository=process.env.GITHUB_REPOSITORY||'dajuns5567/FFL-trade-finder';
const sourceBase=process.env.VALUE_HISTORY_SOURCE_URL||'https://subtle-genie-6167c5.netlify.app/.netlify/functions/value-history';
const netlifySiteId=process.env.NETLIFY_SITE_ID||'0cc03543-09f9-4de9-9b52-6cbc4fbc4357';
const netlifyToken=process.env.NETLIFY_BLOBS_TOKEN||process.env.NETLIFY_AUTH_TOKEN||'';
const dataBranch='value-history-data';
const root='value-history';
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
  return{sha:j.sha,content:Buffer.from(j.content||'','base64').toString('utf8')};
}
async function putFile(path,content,message,sha){
  const body={message,content:Buffer.from(content).toString('base64'),branch:dataBranch};
  if(sha)body.sha=sha;
  return gh(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g,'/')}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
}
const V380_BAD_WINDOW=[Date.parse('2026-09-10T03:25:00.000Z'),Date.parse('2026-09-10T03:35:00.000Z')];
function isV380BadSnapshot(s){const ms=new Date(s?.t||'').getTime();return Number.isFinite(ms)&&ms>=V380_BAD_WINDOW[0]&&ms<V380_BAD_WINDOW[1]}
function validSnapshot(s){
  return s&&String(s.league)==='1316867686394769408'&&s.t&&Array.isArray(s.rows)&&s.rows.length>=100&&!isV380BadSnapshot(s);
}
function monthOf(t){return String(t).slice(0,7)}
function safeName(t){return String(t).replace(/[:.]/g,'-')}

const idxFile=await readFile(`${root}/index.json`);
if(!idxFile)throw new Error('Value History archive index missing');
const index=JSON.parse(idxFile.content),existing=new Set((index.items||[]).map(x=>String(x.t))),since=index.latest||'';
async function snapshotsFromBlobStore(){
  if(!netlifyToken)return null;
  const live=getStore({name:'fll-value-history-v2',siteID:netlifySiteId,token:netlifyToken,consistency:'strong'});
  const listing=await live.list({prefix:'snapshots/'});
  const keys=(listing?.blobs||[]).map(x=>String(x?.key||'')).filter(Boolean).sort(),snapshots=[];
  for(let i=0;i<keys.length;i+=25){
    const batch=keys.slice(i,i+25);
    const rows=await Promise.all(batch.map(key=>live.get(key,{type:'json'}).catch(()=>null)));
    for(const snap of rows)if(validSnapshot(snap))snapshots.push(snap);
  }
  snapshots.sort((a,b)=>String(a.t).localeCompare(String(b.t)));
  return{schema_version:1,league_id:'1316867686394769408',source:'netlify-blobs-direct',snapshot_count:snapshots.length,snapshots};
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
const payload=await snapshotsFromBlobStore()||await snapshotsFromHttpExport();
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
  index.items=index.items||[];index.items.push({t:snap.t,path,fingerprint:snap.fingerprint||null,count:snap.rows.length});
  if(!monthGroups.has(month))monthGroups.set(month,[]);monthGroups.get(month).push(snap);
}
for(const [month,newSnaps] of monthGroups){
  const path=`${root}/months/${month}.json`,prior=await readFile(path),bundle=prior?JSON.parse(prior.content):{schema_version:1,league_id:'1316867686394769408',month,snapshots:[]};
  const byT=new Map((bundle.snapshots||[]).map(s=>[String(s.t),s]));for(const snap of newSnaps)byT.set(String(snap.t),snap);
  bundle.snapshots=[...byT.values()].sort((a,b)=>String(a.t).localeCompare(String(b.t)));
  await putFile(path,JSON.stringify(bundle,null,2)+'\n',`Update Value History monthly archive ${month}`,prior?.sha);
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
console.log(`Archived ${incoming.length} Value History snapshot(s) from ${payload.source||'unknown'}; total ${index.snapshot_count}; latest ${index.latest}.`);
