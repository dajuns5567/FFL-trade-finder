const ORIGIN="https://keeptradecut.com";
const PAGE_URL=`${ORIGIN}/dynasty-rankings`;
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
    return {url:res.url||url,status:res.status,ok:res.ok,contentType:res.headers.get("content-type")||"",text};
  }finally{clearTimeout(timer)}
}

function uniq(items){return [...new Set(items.filter(Boolean))]}
function absolute(url,base=PAGE_URL){try{return new URL(url,base).href}catch{return null}}
function snippets(text,re,max=20){
  const out=[];
  for(const m of String(text||"").matchAll(re)){
    const i=m.index||0;
    out.push(String(text).slice(Math.max(0,i-180),Math.min(text.length,i+420)).replace(/\s+/g," "));
    if(out.length>=max)break;
  }
  return uniq(out);
}

function summarizePage(result){
  const text=result.text||"";
  const scripts=uniq([...text.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>absolute(m[1],result.url)));
  const links=uniq([...text.matchAll(/href=["']([^"']+)["']/gi)].map(m=>absolute(m[1],result.url)));
  const apiUrls=uniq([
    ...[...text.matchAll(/(?:https?:\/\/[^"'\s<>]+|\/api\/[^"'\s<>]+)/gi)].map(m=>absolute(m[0],result.url)),
    ...links.filter(x=>/api|rank|page|superflex|sf/i.test(x||""))
  ]).slice(0,100);
  return {
    status:result.status,contentType:result.contentType,bytes:text.length,
    scripts:scripts.slice(0,50),
    apiUrls,
    markers:{
      superflex:/superflex|super flex/i.test(text),
      oneQb:/1qb|1 qb|one qb/i.test(text),
      risers:/riser|biggest risers/i.test(text),
      fallers:/faller|biggest fallers/i.test(text),
      pagination:/page\s*2|next\b|pagination/i.test(text),
      playerCards:(text.match(/player-name|playerName|ranked-player|player-row|rank-player/gi)||[]).length
    },
    pageContexts:snippets(text,/page|pagination|offset|limit/gi,20),
    superflexContexts:snippets(text,/superflex|super flex/gi,20),
    riserFallerContexts:snippets(text,/riser|faller/gi,20),
    rankContexts:snippets(text,/rank|player/gi,20)
  };
}

function summarizeBundle(result){
  const text=result.text||"";
  return {
    url:result.url,status:result.status,bytes:text.length,
    apiUrls:uniq([...text.matchAll(/(?:https?:\/\/[^"'`\s<>]+|\/api\/[^"'`\s<>]+)/gi)].map(m=>absolute(m[0],result.url))).slice(0,100),
    pagePatterns:uniq([...text.matchAll(/.{0,80}(?:page|offset|limit|skip).{0,160}/gi)].map(m=>m[0].replace(/\s+/g," "))).slice(0,30),
    superflexContexts:snippets(text,/superflex|super flex|sfRank|isSuperflex/gi,25),
    rankingContexts:snippets(text,/dynasty-rank|rankings|playerName|player_id|playerId/gi,25),
    riserFallerContexts:snippets(text,/riser|faller|trend/gi,20)
  };
}

export default async ()=>{
  const attempts=[];
  let page;
  try{
    page=await fetchText(PAGE_URL);
    attempts.push({label:"direct",...summarizePage(page)});
  }catch(error){attempts.push({label:"direct",error:String(error?.message||error)})}

  try{
    const jina=await fetchText(`https://r.jina.ai/http://${PAGE_URL.replace(/^https?:\/\//,"")}`);
    attempts.push({label:"jina",...summarizePage(jina)});
  }catch(error){attempts.push({label:"jina",error:String(error?.message||error)})}

  const bundles=[];
  for(const src of attempts.find(x=>x.label==="direct")?.scripts||[]){
    if(!/\.js(?:\?|$)/i.test(src))continue;
    try{
      const bundle=await fetchText(src);
      bundles.push(summarizeBundle(bundle));
      if(bundles.length>=12)break;
    }catch(error){bundles.push({url:src,error:String(error?.message||error)})}
  }

  return new Response(JSON.stringify({
    ok:true,
    source:"KTC",
    goal:"Discover Superflex dynasty ranking feed and exact 10x50 pagination while excluding risers/fallers side modules",
    pageUrl:PAGE_URL,
    attempts,
    bundles
  },null,2),{headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
};
