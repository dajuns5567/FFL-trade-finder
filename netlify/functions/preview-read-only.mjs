// Defense in depth: Netlify's CONTEXT variable may be unavailable in a
// locally invoked handler or a particular runtime. Actual Netlify preview
// hostnames are independently recognized; never rely on a browser header.
export function isReadOnlyPreview(req){
 const context=String(process.env.CONTEXT||process.env.NETLIFY_CONTEXT||'').toLowerCase();
 if(context==='deploy-preview'||context==='branch-deploy')return true;
 const hosts=[];
 try{hosts.push(new URL(req.url).hostname.toLowerCase())}catch{}
 try{if(process.env.DEPLOY_URL)hosts.push(new URL(process.env.DEPLOY_URL).hostname.toLowerCase())}catch{}
 // Dedicated public browser CI project must be read-only on its primary
 // domain as well as on PR/branch aliases, regardless of Netlify CONTEXT.
 return hosts.some(host=>host==='fleeced-inquirer-browser-ci.netlify.app'||/^[a-z0-9-]+--[a-z0-9-]+\.netlify\.app$/.test(host));
}
