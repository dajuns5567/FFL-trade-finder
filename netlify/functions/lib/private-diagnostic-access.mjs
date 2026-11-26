// Diagnostics and legacy loaders are never public production features.
// Allow direct internal imports, the isolated local collector, and only
// Netlify-authenticated team members on a protected Deploy Preview.
export function privateDiagnosticDenied(req,context){
 if(!req)return null; // internal module invocation, not a remote HTTP request
 const deny=(status=404)=>new Response(JSON.stringify({error:'Not available'}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
 if(req.method!=='GET'&&req.method!=='HEAD')return deny(405);
 const hosted=!!(context?.deploy||context?.site||globalThis.Netlify?.env||process.env.NETLIFY==='true');
 if(hosted){
  if(context?.deploy?.context==='deploy-preview'&&typeof context?.user?.id==='string'&&context.user.id)return null;
  return deny();
 }
 try{if(['127.0.0.1','localhost','[::1]'].includes(new URL(req.url).hostname))return null}catch{}
 return deny();
}
