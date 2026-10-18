// One-shot, operator-only diagnosis of Netlify AI Gateway. Never modifies publications.
import {authorizeEditorialGeneration} from './inquirer-week4-run-auth.mjs';
import {loadNetlifyEditorialGatewayClient} from './inquirer-week4-gateway.mjs';
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const marker='inquirer/week4-style-drafts/2026/week-05/gateway-diagnostic.json';
const safe=s=>String(s||'unknown').slice(0,80).replace(/[^a-zA-Z0-9_.:-]/g,'');
export async function handler(req,{site,readEnv=(name)=>globalThis.Netlify?.env?.get?.(name)||process.env[name],
 openStore=async()=>{const {getStore}=await import('@netlify/blobs');return getStore({name:'fleeced-league-hub',consistency:'strong'});},
 loadClient=loadNetlifyEditorialGatewayClient}={}){
 const auth=authorizeEditorialGeneration(req,{readEnv});
 if(!auth.ok)return reply(auth.status,{error:'Diagnostic unavailable or unauthorized'});
 if(site?.id&&site.id!=='2e556797-6f35-4037-aa5a-1338724eb71d')return reply(403,{error:'Wrong site'});
 const model=String(readEnv('FLEECED_EDITORIAL_MODEL')||'');
 if(!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{2,90}$/.test(model))return reply(503,{error:'Model not configured'});
 const store=await openStore();
 const existing=await store.get(marker,{type:'json'}).catch(()=>null);
 if(existing)return reply(200,{status:existing.status,model:existing.model,
  provider_http_status:existing.provider_http_status||null,provider_code:existing.provider_code||null,
  provider_type:existing.provider_type||null,provider_message:existing.provider_message||null});
 const admission=await store.setJSON(marker,{status:'started',model,created_at:new Date().toISOString()},{onlyIfNew:true});
 if(!admission.modified)return reply(409,{error:'Diagnostic already started; no duplicate probe'});
 try{
  const client=await loadClient();
  const response=await client.chat.completions.create({model,
   messages:[{role:'system',content:'Return only a JSON object.'},{role:'user',content:'Return {"ok":true}.'}],
   response_format:{type:'json_object'},temperature:0.85,max_completion_tokens:40});
  const result={status:'gateway_responded',model,returned_model:safe(response?.model)};
  await store.setJSON(marker,result);
  return reply(200,result);
 }catch(error){
  const record={status:'gateway_rejected',model,provider_http_status:Number(error?.status)||null,
   provider_code:safe(error?.code),provider_type:safe(error?.type||error?.name),
   provider_message:String(error?.message||'').slice(0,300).replace(/[\r\n]/g,' ').replace(/(sk-[a-zA-Z0-9_-]{12,})/g,'[redacted]')};
  await store.setJSON(marker,record);
  return reply(200,record);
 }
}
export default handler;
export const config={rateLimit:{action:'rate_limit',windowLimit:2,windowSize:3600,aggregateBy:'ip'}};
