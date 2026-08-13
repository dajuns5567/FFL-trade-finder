const TARGET="https://www.fanranked.com/football/dynasty-rankings";
const TIMEOUT_MS=7000;

async function fetchText(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const res=await fetch(url,{headers:{
      "user-agent":"Mozilla/5.0 (compatible; FFL-TradeFinder/16.0; +https://netlify.com)",
      "accept":"text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.8"
    },redirect:"follow",signal:controller.signal});
    const text=await res.text();
    return {ok:res.ok,status:res.status,contentType:res.headers.get("content-type")||"",text,url:res.url||url};
  }finally{clearTimeout(timer)}
}

const clean=s=>String(s||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim();

function inspect(label,result){
  const text=String(result?.text||"");
  const links=[...text.matchAll(/href=["']([^"']+)["']/gi)].map(m=>m[1]).filter(h=>/page|offset|start|limit|dynasty-rankings/i.test(h)).slice(0,80);
  const api=[...text.matchAll(/https?:\/\/[^\s"'<>]+/gi)].map(m=>m[0]).filter(u=>/api|rank|dynasty|football/i.test(u)).slice(0,80);
  const tableHeaders=[...text.matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map(m=>clean(m[1])).filter(Boolean).slice(0,120);
  const marketSnippets=[];
  for(const m of text.matchAll(/.{0,180}market.{0,240}/gi))marketSnippets.push(clean(m[0]));
  const rankSnippets=[];
  for(const m of text.matchAll(/.{0,160}superflex.{0,220}/gi))rankSnippets.push(clean(m[0]));
  return {
    label,
    status:result?.status??null,
    finalUrl:result?.url??null,
    contentType:result?.contentType??null,
    bytes:text.length,
    markers:{
      market:/\bmarket\b/i.test(text),
      rank:/\brank\b/i.test(text),
      superflex:/superflex/i.test(text),
      ppr:/\bppr\b/i.test(text),
      htmlTable:/<table\b/i.test(text),
      nextData:/__NEXT_DATA__/i.test(text),
      scriptJson:/application\/json/i.test(text),
      graphql:/graphql/i.test(text)
    },
    tableHeaders,
    paginationLinks:[...new Set(links)],
    candidateUrls:[...new Set(api)],
    marketSnippets:[...new Set(marketSnippets)].slice(0,20),
    superflexSnippets:[...new Set(rankSnippets)].slice(0,20),
    firstText:clean(text).slice(0,1500)
  };
}

export default async ()=>{
  const attempts=[];
  try{
    const direct=await fetchText(TARGET);
    attempts.push(inspect("direct",direct));
  }catch(error){attempts.push({label:"direct",error:String(error?.message||error)});}
  try{
    const jina=await fetchText(`https://r.jina.ai/http://${TARGET.replace(/^https?:\/\//,"")}`);
    attempts.push(inspect("jina",jina));
  }catch(error){attempts.push({label:"jina",error:String(error?.message||error)});}
  return new Response(JSON.stringify({ok:true,source:"FanRanked",url:TARGET,attempts},null,2),{headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
};
