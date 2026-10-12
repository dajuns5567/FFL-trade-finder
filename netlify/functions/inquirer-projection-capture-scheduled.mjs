import {isReadOnlyPreview} from './preview-read-only.mjs';
import {isAuthorizedWrite,denyUnauthorizedWrite,rememberDeploymentContext} from './privileged-write.mjs';
import {capturePregameProjections} from './league-hub.mjs';

// Dedicated hourly write-once capture; no edition publishing happens here.
export default async function inquirerProjectionCaptureScheduled(req,platformContext){
 rememberDeploymentContext(req,platformContext);
 if(isReadOnlyPreview(req))return new Response(JSON.stringify({ok:false,error:'preview capture disabled'}),{status:403,headers:{'content-type':'application/json','cache-control':'no-store'}});
 if(!isAuthorizedWrite(req))return denyUnauthorizedWrite();
 try{
  const result=await capturePregameProjections();
  return new Response(JSON.stringify({ok:true,...result}),{status:200,headers:{'content-type':'application/json','cache-control':'no-store'}});
 }catch(error){
  console.error('inquirer projection capture',error);
  return new Response(JSON.stringify({ok:false,reason:String(error?.message||error)}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}});
 }
}
