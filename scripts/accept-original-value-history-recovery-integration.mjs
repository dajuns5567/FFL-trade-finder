// Execute the original Value History GET handler with isolated restored historical records.
// The original archive HTTP fetch is intercepted and backed entirely by isolated Netlify Blobs.
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getStore} from '@netlify/blobs';
const SITE='05a8ec65-a0a3-46f1-9f73-3da47dac662e';
assert.equal(process.env.RECOVERY_DESTINATION_SITE_ID,SITE);
const token=process.env.NETLIFY_BLOBS_TOKEN;assert(token);
const root=path.resolve(process.argv[2]||'');
const hist=getStore({name:'fleeced-recovery-history-rehearsal',siteID:SITE,token,consistency:'strong'});
const index=await hist.get('value-history/index.json',{type:'json'});
assert.equal(index?.items?.length,156);
const first=await hist.get(index.items[0].path,{type:'json'});
const example=first?.rows?.find(r=>r.id&&Number.isFinite(Number(r.value)));
assert(example,'No valid sample player in restored archive');
const archiveCache=new Map([['value-history/index.json',index]]);
for(const month of index.months||[]){const key='value-history/months/'+month+'.json';archiveCache.set(key,await hist.get(key,{type:'json'}));}
for(let i=0;i<index.items.length;i+=20){const batch=index.items.slice(i,i+20);const values=await Promise.all(batch.map(item=>hist.get(item.path,{type:'json'})));for(let j=0;j<batch.length;j++)archiveCache.set(batch[j].path,values[j]);}
assert(archiveCache.size>=index.items.length+2,'Recovered archive fixtures incomplete');
const originalFetch=globalThis.fetch;
let intercepted=0;
globalThis.fetch=async resource=>{
 const url=new URL(String(resource));
 const prefix='/value-history/';
 if(url.hostname!=='raw.githubusercontent.com'||!url.pathname.includes(prefix))throw Error('FORBIDDEN_EXTERNAL_REQUEST: '+url.hostname);
 const key='value-history/'+url.pathname.split(prefix).slice(1).join(prefix);
 if(!/^value-history\/(index\.json|months\/\d{4}-\d{2}\.json|snapshots\/\d{4}\/\d{2}\/[\w.-]+\.json)$/.test(key))throw Error('FORBIDDEN_ARCHIVE_KEY');
 const obj=archiveCache.get(key)||null;intercepted++;
 return new Response(obj===null?'not found':JSON.stringify(obj),{status:obj===null?404:200,headers:{'content-type':'application/json'}});
};
try{
 const {default:handler}=await import(pathToFileURL(path.join(root,'netlify/functions/value-history.mjs')).href);
 const response=await handler(new Request('https://recovery.invalid/.netlify/functions/value-history?player_id='+encodeURIComponent(example.id),{method:'GET'}),{});
 assert.equal(response.status,200,'Original Value History GET handler did not succeed');
 const result=await response.json();
 assert.equal(String(result.player_id),String(example.id));
 assert(result.snapshot_count>=156,'Original handler lost recovered snapshot coverage');
 assert(Array.isArray(result.points)&&result.points.length>0,'No recovered historical points returned');
 assert(result.points.some(p=>p.t===first.t&&Number(p.value)===Number(example.value)),'Original handler omitted verified recovered sample valuation');
 assert(result.points.every((p,i)=>i===0||String(p.t)>=String(result.points[i-1].t)),'History points not ordered');
 assert(intercepted>0,'Original handler never read recovered historical archive');
 console.log('ORIGINAL VALUE HISTORY HANDLER RESTORED-DATA PASS '+JSON.stringify({site:SITE,snapshots:result.snapshot_count,sample_player_points:result.points.length,isolated_archive_reads:intercepted,source:result.history_state,production_writes:0}));
}finally{globalThis.fetch=originalFetch}
