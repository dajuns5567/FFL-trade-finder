// Compile historical player points into a compressed, self-contained read-only Netlify function.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
const root=path.resolve(process.argv[2]||'');assert(root.includes('/.tmp/'));
const file=path.join(root,'private-history.json');
const data=JSON.parse(await fs.readFile(file,'utf8'));
assert.equal(data.snapshot_count,156);
assert(Object.keys(data.players||{}).length>100);
const compressed=gzipSync(Buffer.from(JSON.stringify(data)),{level:9}).toString('base64');
assert(compressed.length<9*1024*1024,'Compressed player-history exceeds safe single-function packaging budget');
const code=`// Frozen 156-snapshot isolated historical player values; no secrets and no Blob SDK.
import {gunzipSync} from 'node:zlib';
const data=JSON.parse(gunzipSync(Buffer.from(${JSON.stringify(compressed)},'base64')).toString('utf8'));
const respond=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
export default function history(request){
 if(request.method!=='GET')return respond({error:'read only'},405);
 const url=new URL(request.url);
 if(url.pathname!=='/api/value-history')return respond({error:'not found'},404);
 const pairs=[...url.searchParams.entries()];
 if(pairs.length!==1||pairs[0][0]!=='player_id'||!/^[a-zA-Z0-9_-]{1,48}$/.test(pairs[0][1]))return respond({error:'unsupported history query'},400);
 const id=pairs[0][1];
 return respond({player_id:id,points:data.players[id]||[],snapshot_count:156,history_state:'isolated-recovery',partial:false,read_only:true});
}
export const config={path:'/api/value-history'};
`;
const dir=path.join(root,'netlify/functions');await fs.mkdir(dir,{recursive:true});
await fs.writeFile(path.join(dir,'approved-history.mjs'),code);
await fs.rm(file);
console.log('OFFLINE FROZEN VALUE HISTORY FUNCTION PACKAGED '+JSON.stringify({snapshots:156,player_ids:Object.keys(data.players).length,compressed_bytes:Buffer.byteLength(compressed,'utf8'),write_handlers:0,external_requests:0,deployed:false}));
