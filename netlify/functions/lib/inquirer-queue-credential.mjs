import {randomBytes,timingSafeEqual} from 'node:crypto';
const CREDENTIAL_KEY='inquirer/internal-queue-credential.json';
const valid=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{40,}$/.test(value);
// Site-private Blob fallback means the owner never has to hand-create a queue
// secret. Created only by an authorized production scheduler, never a worker.
export async function resolveInquirerQueueCredential({store,configured='',bootstrap=false}={}){
 // Existing legacy environments may use a shorter configured secret.
 if(typeof configured==='string'&&configured.length>0)return configured;
 if(!store)return null;
 const existing=await store.get(CREDENTIAL_KEY,{type:'json'});
 if(existing){
  if(!valid(existing.key))throw Error('Invalid stored Inquirer queue credential');
  return existing.key;
 }
 if(!bootstrap)return null;
 const generated=randomBytes(48).toString('base64url');
 await store.setJSON(CREDENTIAL_KEY,{key:generated,created_at:new Date().toISOString()},{onlyIfNew:true});
 const confirmed=await store.get(CREDENTIAL_KEY,{type:'json'});
 if(!valid(confirmed?.key))throw Error('Inquirer queue credential persistence unavailable');
 return confirmed.key;
}
export function inquirerQueueKeyMatches(expected,received){
 if(typeof expected!=='string'||!expected||typeof received!=='string'||!received)return false;
 const a=Buffer.from(expected),b=Buffer.from(received);
 return a.length===b.length&&timingSafeEqual(a,b);
}
