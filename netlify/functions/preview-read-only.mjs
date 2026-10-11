// Defense in depth: Netlify's CONTEXT variable may be unavailable in a
// locally invoked handler or a particular runtime. Actual Netlify preview
// hostnames are independently recognized; never rely on a browser header.
export function isReadOnlyPreview(req){
 const context=String(process.env.CONTEXT||process.env.NETLIFY_CONTEXT||'').toLowerCase();
 if(context==='deploy-preview'||context==='branch-deploy')return true;
 const hosts=[];
 try{hosts.push(new URL(req.url).hostname.toLowerCase())}catch{}
 try{if(process.env.DEPLOY_URL)hosts.push(new URL(process.env.DEPLOY_URL).hostname.toLowerCase())}catch{}
 return hosts.some(host=>/^[a-z0-9-]+--[a-z0-9-]+\\.netlify\\.app$/.test(host));
}
