// Package approved offline editions behind a minimal GET-only function.
// This temporary bundle must remain SSO-restricted and never be uploaded as a CI artifact.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'');
assert(root.includes('.tmp/'),'Only build in disposable candidate directory');
const file=path.join(root,'private-verified-editions.json');
const payload=JSON.parse(await fs.readFile(file,'utf8'));
assert.deepEqual(Object.keys(payload),['1','2','3','4']);
assert(Object.values(payload).every(v=>v.teams?.length===32));
const dir=path.join(root,'netlify/functions');await fs.mkdir(dir,{recursive:true});
const code=`// Original preserved approved editions. Offline read-only recovery.
const editions=JSON.parse(${JSON.stringify(JSON.stringify(payload))});
const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
export default function handler(request){
 if(request.method!=='GET')return send({error:'read only'},405);
 const url=new URL(request.url);
 if(url.pathname!=='/api/league-hub')return send({error:'not found'},404);
 const params=[...url.searchParams.entries()];
 if(params.length===1&&params[0][0]==='broadcast_archive'&&params[0][1]==='1')
  return send({reports:Object.keys(editions).map(w=>({type:'week',season:2026,week:Number(w),key:'preloaded:2026:'+w,preloaded:true}))});
 if(params.length===2&&url.searchParams.has('broadcast_season')&&url.searchParams.has('broadcast_week')){
  if(url.searchParams.get('broadcast_season')!=='2026'||!(/^[1-4]$/.test(url.searchParams.get('broadcast_week')||'')))return send({error:'edition not approved'},403);
  return send(editions[url.searchParams.get('broadcast_week')]);
 }
 return send({error:'unsupported route'},400);
}
export const config={path:'/api/league-hub'};
`;
await fs.writeFile(path.join(dir,'approved-inquirer.mjs'),code);
await fs.rm(file);
console.log('FROZEN INQUIRER READ-ONLY FUNCTION PACKAGED '+JSON.stringify({weeks:4,articles:128,allowed_routes:['archive','four-approved-editions'],write_routes:0,publishers:0,network_reads:0,private_payload_logged:false,deploys:0}));
