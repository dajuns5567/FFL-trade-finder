// Restricted, one-way recovery of original 2026 Week 3/4 archives.
// Writes raw, hash-pinned originals ONLY to a quarantine prefix, never broadcasts.
import {createHash} from 'node:crypto';
import {authorizeEditorialGeneration} from './inquirer-week4-run-auth.mjs';
import {verifyWeeklyEditorialSource} from './inquirer-week4-batch.mjs';
const originalHashes={3:'8f2631fd4f83b556daa29d78ab63e92b87a4914e7875ed6799e852397e86715c',
  4:'038248bef97fd7bfd2bdece6df9c3a538cac9c29ae1bb34487458927c129022c'};
const respond=(status,body)=>new Response(JSON.stringify(body),{status,
  headers:{'content-type':'application/json','cache-control':'no-store'}});
const keyFor=week=>`inquirer/recovery-originals/2026/week-${String(week).padStart(2,'0')}.json`;
export async function handler(req,{site,readEnv=(name)=>globalThis.Netlify?.env?.get?.(name)||process.env[name],
  openStore=async()=>{const {getStore}=await import('@netlify/blobs');return getStore('fleeced-league-hub',{consistency:'strong'});}}={}){
 const auth=authorizeEditorialGeneration(req,{readEnv});
 if(!auth.ok)return respond(auth.status,{error:'Recovery import unavailable or unauthorized'});
 if(site?.id&&site.id!=='2e556797-6f35-4037-aa5a-1338724eb71d')
   return respond(403,{error:'Wrong recovery destination site'});
 const week=Number(req.headers.get('x-recovery-week'));
 if(!Object.hasOwn(originalHashes,week))return respond(400,{error:'Only original Weeks 3 and 4 may be staged'});
 if(Number(req.headers.get('content-length')||0)>4_000_000)return respond(413,{error:'Archive too large'});
 const raw=await req.text();
 if(Buffer.byteLength(raw,'utf8')>4_000_000)return respond(413,{error:'Archive too large'});
 const sha=createHash('sha256').update(raw).digest('hex');
 if(sha!==originalHashes[week])return respond(422,{error:'Original archival SHA-256 does not match verified backup'});
 let edition;try{edition=JSON.parse(raw)}catch{return respond(422,{error:'Invalid archival JSON'})}
 if(Number(edition.season)!==2026||Number(edition.week)!==week||edition.available!==true||
   !Array.isArray(edition.teams)||edition.teams.length!==32||
   !Array.isArray(edition.league_overview?.sections)||edition.league_overview.sections.length<4||
   !verifyWeeklyEditorialSource(edition).ok)
   return respond(422,{error:'Archived edition failed factual validation'});
 const store=await openStore(),key=keyFor(week);
 const existing=await store.get(key,{type:'text'}).catch(()=>null);
 if(existing!==null){
   const existingSha=createHash('sha256').update(existing).digest('hex');
   if(existingSha!==sha)return respond(409,{error:'Different recovery object already exists; nothing overwritten'});
   return respond(200,{status:'already_staged',week,sha256:sha,production_unchanged:true});
 }
 const result=await store.set(key,raw,{onlyIfNew:true});
 if(!result.modified)return respond(409,{error:'Concurrent recovery object exists; nothing overwritten'});
 const readback=await store.get(key,{type:'text'});
 if(createHash('sha256').update(readback||'').digest('hex')!==sha)
   return respond(500,{error:'Recovery readback mismatch; require operator investigation'});
 return respond(201,{status:'original_staged',week,sha256:sha,production_unchanged:true});
}
export default handler;
export const config={rateLimit:{action:'rate_limit',windowLimit:6,windowSize:3600,aggregateBy:'ip'}};
