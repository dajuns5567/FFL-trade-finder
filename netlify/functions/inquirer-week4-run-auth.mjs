import {createHash,timingSafeEqual} from 'node:crypto';

// This check must precede every paid model call and private Blob read.
export function authorizeEditorialGeneration(request,{readEnv=(key)=>process.env[key],method='POST'}={}){
  if(request?.method!==method)return{ok:false,status:405};
  const expected=String(readEnv('FLEECED_EDITORIAL_RUN_TOKEN')||'');
  if(!readEnv('FLEECED_ENABLE_WEEK4_AI_STAGING')||readEnv('FLEECED_ENABLE_WEEK4_AI_STAGING')!=='true'
    ||expected.length<43)return{ok:false,status:503};
  const provided=String(request.headers?.get?.('authorization')||'');
  if(!provided.startsWith('Bearer ')||provided.length>512)return{ok:false,status:401};
  const token=provided.slice(7);
  const left=createHash('sha256').update(token).digest();
  const right=createHash('sha256').update(expected).digest();
  return timingSafeEqual(left,right)?{ok:true,status:200}:{ok:false,status:401};
}
