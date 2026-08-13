const URL='https://www.draftsharks.com/dynasty-rankings/ppr-superflex';
export default async()=>{const r=await fetch(URL);const text=await r.text();const script=text.match(/<script[^>]+src=["']([^"']*RankingsApp[^"']*)["']/i);let js='';if(script){js=await (await fetch(new URL(script[1],r.url||URL))).text();}
const grab=(needle,len=2200)=>{const i=js.indexOf(needle);return i>=0?js.slice(Math.max(0,i-300),i+len):null};
const contexts=[...text.matchAll(/(?:selectedFantasyPosition|currentSortParam|pprSuperflexSlug|fantasyPosition|playerGroup|rookiesOnly|basePath)[^<]{0,300}/gi)].slice(0,80).map(m=>m[0]);
return new Response(JSON.stringify({ok:true,url:URL,status:r.status,contexts,appendPersistentParams:grab('appendPersistentParams('),getPprSuperflexSlug:grab('getPprSuperflexSlug('),selectedFantasyPosition:grab('selectedFantasyPosition'),currentSortParam:grab('currentSortParam')},null,2),{headers:{'content-type':'application/json','cache-control':'no-store'}})};
