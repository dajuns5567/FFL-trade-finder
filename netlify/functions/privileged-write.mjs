// Fail closed on public hosts: no shared token is ever embedded in browser code.
// Configure FLEECED_SERVER_WRITE_TOKEN as a Netlify server-side secret only.
// Calling this from a browser with a token is prohibited; use a trusted backend.
import {timingSafeEqual} from 'node:crypto';
export function isAuthorizedWrite(req){
 const expected=String(process.env.FLEECED_SERVER_WRITE_TOKEN||'');
 if(expected.length<32)return false;
 const auth=String(req.headers?.get?.('authorization')||'');
 if(!auth.startsWith('Bearer '))return false;
 const actual=auth.slice(7);
 const a=Buffer.from(actual),b=Buffer.from(expected);
 return a.length===b.length&&timingSafeEqual(a,b);
}
export function denyUnauthorizedWrite(){
 return new Response(JSON.stringify({error:'authenticated server-side write required'}),{
  status:403,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
 });
}
