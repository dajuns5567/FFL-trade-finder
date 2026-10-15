import {getStore} from '@netlify/blobs';
import {isReadOnlyPreview} from './preview-read-only.mjs';
export default async function captureStatus(req,platformContext){
 if(isReadOnlyPreview(req,platformContext))return new Response(null,{status:403});
 if(req.method!=='GET')return new Response(null,{status:405});
 const id=new URL(req.url).searchParams.get('event_id');
 if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return new Response(null,{status:400});
 try{
  const record=await getStore('fll-value-history-capture',{consistency:'strong'}).get('events/'+id.toLowerCase()+'.json',{type:'json'});
  return Response.json(record?{state:record.state,attempts:Number(record.attempts)||1,snapshot:record.snapshot||null}:{state:'queued'},{headers:{'cache-control':'no-store'}});
 }catch{return Response.json({state:'unavailable'},{status:503,headers:{'cache-control':'no-store'}})}
}
