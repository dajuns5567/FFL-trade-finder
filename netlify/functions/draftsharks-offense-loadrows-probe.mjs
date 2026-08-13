const ORIGIN='https://www.draftsharks.com';
const base='/dynasty-rankings/load-rows?offset=0&limit=300&playerGroup=all';
const variants=[
 `${base}&fantasyPosition=ALL&pprSuperflexSlug=ppr-superflex&sort=dsValue-desc`,
 `${base}&fantasyPosition=all&pprSuperflexSlug=ppr-superflex&sort=dsValue-desc`,
 `${base}&fantasyPosition=&pprSuperflexSlug=ppr-superflex&sort=dsValue-desc`,
 `${base}&fantasyPosition=ALL&pprSuperflexSlug=ppr-superflex`,
 `${base}&fantasyPosition=all&pprSuperflexSlug=ppr-superflex`
];
const clean=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"').replace(/\s+/g,' ').trim();
async function get(path){const r=await fetch(new URL(path,ORIGIN),{headers:{'user-agent':'Mozilla/5.0 (compatible; FFL-TradeFinder/16.0; +https://netlify.com)',accept:'text/html,*/*;q=0.8','hx-request':'true'},redirect:'follow'});return {status:r.status,url:r.url,text:await r.text()}}
function summarize(r){const names=[...r.text.matchAll(/<player-name\b[^>]*first-name=["']([^"']+)["'][^>]*last-name=["']([^"']+)["']/gi)].map(m=>`${m[1]} ${m[2]}`);const ranks=[...r.text.matchAll(/<tbody\b[^>]*data-player-row[^>]*>[\s\S]*?<\/tbody>/gi)].map(m=>{const tr=m[0].match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i)?.[1]||'';const c=tr.match(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/i)?.[1]||'';const n=Number(clean(c));return Number.isInteger(n)?n:null}).filter(Number.isInteger);return {status:r.status,url:r.url,bytes:r.text.length,playerRows:names.length,firstRanks:ranks.slice(0,5),lastRanks:ranks.slice(-5),firstNames:names.slice(0,5),lastNames:names.slice(-5)}}
export default async()=>{const attempts=[];for(const path of variants){try{attempts.push(summarize(await get(path)))}catch(e){attempts.push({path,error:String(e?.message||e)})}}return new Response(JSON.stringify({ok:true,source:'DraftSharks',attempts},null,2),{headers:{'content-type':'application/json','cache-control':'no-store'}})};