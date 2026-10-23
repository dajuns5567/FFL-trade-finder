import test from 'node:test';
import assert from 'node:assert/strict';
import {handler} from '../netlify/functions/inquirer-week4-gateway-diagnostic.mjs';
const token='x'.repeat(64),site={id:'2e556797-6f35-4037-aa5a-1338724eb71d'};
const readEnv=k=>({FLEECED_EDITORIAL_RUN_TOKEN:token,FLEECED_ENABLE_WEEK4_AI_STAGING:'true',FLEECED_EDITORIAL_MODEL:'gpt-4.1'})[k];
const req=auth=>new Request('https://preview.netlify.app/.netlify/functions/inquirer-week4-gateway-diagnostic',{method:'POST',headers:auth?{authorization:'Bearer '+token}:{}});
test('gateway failure is classified and recorded without exposing prompts or publishing',async()=>{
 const writes=new Map();let calls=0;
 const store={get:async k=>writes.get(k)??null,setJSON:async(k,v,o)=>{
  assert.match(k,/gateway-diagnostic\.json$/);
  if(o?.onlyIfNew&&writes.has(k))return{modified:false};
  writes.set(k,v);return{modified:true};
 }};
 const client={chat:{completions:{create:async()=>{calls++;throw Object.assign(new Error('unsupported parameter'),{status:400,code:'bad_request',type:'invalid_request_error'});}}}};
 const ctx={site,readEnv,openStore:async()=>store,loadClient:async()=>client};
 const r=await handler(req(true),ctx),body=await r.json();
 assert.equal(r.status,200);assert.equal(body.provider_http_status,400);assert.equal(body.provider_code,'bad_request');
 assert.equal(body.status,'gateway_rejected');assert.equal(calls,1);
 const duplicate=await handler(req(true),ctx);
 assert.equal((await duplicate.json()).status,'gateway_rejected');assert.equal(calls,1);
});
test('gateway diagnostic rejects unauthorized before storage or model access',async()=>{
 let opened=0;const ctx={site,readEnv,openStore:async()=>{opened++;throw Error('should not access')}};
 assert.equal((await handler(req(false),ctx)).status,401);
 assert.equal((await handler(req(true),{...ctx,site:{id:'wrong'}})).status,403);
 assert.equal(opened,0);
});
