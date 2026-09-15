const targets=[
["offense-page","https://www.draftsharks.com/dynasty-rankings/ppr-superflex"],
["offense-load","https://www.draftsharks.com/dynasty-rankings/load-rows?offset=0&limit=250&playerGroup=all&fantasyPosition=ALL&pprSuperflexSlug=ppr-superflex&sort=dsValue-desc"],
["idp-page","https://www.draftsharks.com/rankings/idp/superflex"],
["idp-load","https://www.draftsharks.com/rankings/load-rows?offset=0&limit=250&fantasyPosition=IDP&pprSuperflexSlug=superflex&researchDepth=rankings&sort=dsValue-desc"]
];
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
for(const [label,url] of targets){try{const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0","accept":"text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8","hx-request":"true"},redirect:"follow"});const t=await r.text();const scripts=[...t.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]).filter(x=>/rank|app|bundle|chunk/i.test(x)).slice(0,10);const names=[...t.matchAll(/<player-name\b[^>]*>/gi)].slice(0,3).map(m=>clean(m[0]).slice(0,400));console.log("\n===",label,"===",JSON.stringify({status:r.status,finalUrl:r.url,contentType:r.headers.get("content-type"),bytes:t.length,playerRow:(t.match(/data-player-row/gi)||[]).length,playerName:(t.match(/<player-name\b/gi)||[]).length,tbody:(t.match(/<tbody\b/gi)||[]).length,nextData:/__NEXT_DATA__/i.test(t),scripts,names,head:clean(t).slice(0,1200)},null,2));}catch(e){console.log("\n===",label,"ERROR===",String(e?.stack||e))}}
