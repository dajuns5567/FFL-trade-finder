// Defense in depth: Netlify's CONTEXT variable may be unavailable in a
// locally invoked handler or a particular runtime. Actual Netlify preview
// hostnames are independently recognized; never rely on a browser header.
export function isReadOnlyPreview(req){
 // A dedicated CI site's scheduled functions run under CONTEXT=production.
 // Check the Netlify-assigned identity before inspecting request URLs so a
 // scheduler or internal invoke cannot bypass the isolation boundary.
 if(String(process.env.SITE_ID||'').toLowerCase()==='3db3f8f7-4997-48db-b8a3-1325d18c75ec'||String(process.env.SITE_NAME||'').toLowerCase()==='fleeced-inquirer-browser-ci')return true;
 const context=String(process.env.CONTEXT||process.env.NETLIFY_CONTEXT||'').toLowerCase();
 if(context==='deploy-preview'||context==='branch-deploy')return true;
 const hosts=[];
 try{hosts.push(new URL(req.url).hostname.toLowerCase())}catch{}
 try{if(process.env.DEPLOY_URL)hosts.push(new URL(process.env.DEPLOY_URL).hostname.toLowerCase())}catch{}
 // Dedicated public browser CI project must be read-only on its primary
 // domain as well as on PR/branch aliases, regardless of Netlify CONTEXT.
 return hosts.some(host=>host==='fleeced-inquirer-browser-ci.netlify.app'||/^[a-z0-9-]+--[a-z0-9-]+\.netlify\.app$/.test(host));
}
