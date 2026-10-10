import {capturePregameProjections} from './league-hub.mjs';

// Dedicated hourly write-once capture; no edition publishing happens here.
export default async function inquirerProjectionCaptureScheduled(){
 try{
  const result=await capturePregameProjections();
  return new Response(JSON.stringify({ok:true,...result}),{status:200,headers:{'content-type':'application/json','cache-control':'no-store'}});
 }catch(error){
  console.error('inquirer projection capture',error);
  return new Response(JSON.stringify({ok:false,reason:String(error?.message||error)}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}});
 }
}
