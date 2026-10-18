// Authenticated read-only integrity status of isolated recovered originals.
import {createHash} from 'node:crypto';
import {authorizeEditorialGeneration} from './inquirer-week4-run-auth.mjs';
const expected={3:'8f2631fd4f83b556daa29d78ab63e92b87a4914e7875ed6799e852397e86715c',
 4:'038248bef97fd7bfd2bdece6df9c3a538cac9c29ae1bb34487458927c129022c'};
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function handler(req,{site,readEnv=(name)=>globalThis.Netlify?.env?.get?.(name)||process.env[name],
 openStore=async()=>{const {getStore}=await import('@netlify/blobs');return getStore({name:'fleeced-league-hub',consistency:'strong'});},
 expectedHashes=expected}={}){
 const auth=authorizeEditorialGeneration(req,{readEnv,method:'GET'});
 if(!auth.ok)return reply(auth.status,{error:'Recovery verification unavailable or unauthorized'});
 if(site?.id&&site.id!=='2e556797-6f35-4037-aa5a-1338724eb71d')
   return reply(403,{error:'Wrong site'});
 try{
  const store=await openStore(),weeks={};
  for(const week of [3,4]){
   const key=`inquirer/recovery-originals/2026/week-${String(week).padStart(2,'0')}.json`;
   try{
    const raw=await store.get(key,{type:'text',consistency:'strong'});
    weeks[week]={present:typeof raw==='string',
      verified:typeof raw==='string'&&createHash('sha256').update(raw).digest('hex')===expectedHashes[week]};
   }catch{weeks[week]={present:null,verified:false,read_error:true};}
  }
  return reply(200,{weeks,production_unchanged:true});
 }catch{return reply(503,{error:'Recovery storage could not be inspected'});}
}
export default handler;
export const config={rateLimit:{action:'rate_limit',windowLimit:12,windowSize:60,aggregateBy:'ip'}};
