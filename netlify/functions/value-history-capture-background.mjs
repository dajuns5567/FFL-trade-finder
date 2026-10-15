import {getStore} from '@netlify/blobs';
import {isReadOnlyPreview} from './preview-read-only.mjs';
import {persistCanonicalCapture} from './value-history.mjs';
export const config={background:true,method:'POST',rateLimit:{action:'rate_limit',aggregateBy:['domain','ip'],windowSize:60,windowLimit:3}};
export function validEvent(id){return typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)}
async function collect({deploymentContext=null}={}){
 const [{default:chromium},{chromium:playwright},{collectCanonicalSnapshot}]=await Promise.all([
  import('@sparticuz/chromium'),import('playwright-core'),import('../../scripts/value-history-headless-refresh.mjs')
 ]);
 return collectCanonicalSnapshot({deploymentContext,persistLocal:false,promoteConsensus:true,maintainAwards:true,launch:async()=>playwright.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:true})});
}
export function createCaptureHandler({getStorage=()=>getStore('fll-value-history-capture',{consistency:'strong'}),calculate=collect,persist=persistCanonicalCapture}={}){
 return async function capture(req,platformContext=null){
  if(isReadOnlyPreview(req,platformContext))return new Response(null,{status:403});
  if(req.method!=='POST')return new Response(null,{status:405});
  const body=await req.json().catch(()=>null);
  if(!body||!validEvent(body.event_id)||!['page-load','manual-update'].includes(body.source)||Object.keys(body).some(k=>!['event_id','source'].includes(k)))return new Response(null,{status:400});
  const storage=getStorage(),key='events/'+body.event_id.toLowerCase()+'.json';
  const previous=await storage.getWithMetadata(key,{type:'json'});
  if(previous?.data?.state==='complete'||previous?.data?.state==='failed'&&Number(previous.data.attempts)>=3||previous?.data?.state==='running'&&Date.now()-Date.parse(previous.data.started_at)<12*60*1000)return;
  const job={attempts:(Number(previous?.data?.attempts)||0)+1,state:'running',started_at:new Date().toISOString(),source:body.source};
  const claimed=await storage.setJSON(key,job,previous?.etag?{onlyIfMatch:previous.etag}:{onlyIfNew:true});
  if(claimed?.modified===false)return;
  try{
   const canonical=await calculate({deploymentContext:platformContext});
   const snapshot=await persist(canonical,body.event_id.toLowerCase(),body.source);
   await storage.setJSON(key,{...job,state:'complete',snapshot,maintenance:canonical.maintenance||null});
  }catch(error){
   await storage.setJSON(key,{...job,state:'failed',reason:'Trusted calculation or persistence failed'});
   throw error;
  }
 };
}
export default createCaptureHandler();
