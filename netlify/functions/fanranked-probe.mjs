const TARGET="https://www.fanranked.com/football/dynasty-rankings";
const ORIGIN="https://www.fanranked.com";
const TIMEOUT_MS=7000;

async function fetchText(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const res=await fetch(url,{headers:{
      "user-agent":"Mozilla/5.0 (compatible; FFL-TradeFinder/16.0; +https://netlify.com)",
      "accept":"text/html,application/javascript,application/json,text/plain;q=0.9,*/*;q=0.8"
    },redirect:"follow",signal:controller.signal});
    const text=await res.text();
    return {ok:res.ok,status:res.status,contentType:res.headers.get("content-type")||"",text,url:res.url||url};
  }finally{clearTimeout(timer)}
}

const clean=s=>String(s||"").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim();
const absolute=u=>{try{return new URL(u,ORIGIN).href}catch{return null}};

function snippets(text,term,limit=12){
  const out=[];
  const re=new RegExp(`.{0,180}${term}.{0,260}`,"gi");
  for(const m of String(text||"").matchAll(re))out.push(clean(m[0]));
  return [...new Set(out)].slice(0,limit);
}

function findCandidateUrls(text){
  const urls=[];
  const patterns=[
    /https?:\/\/[^\s"'`<>\\]+/gi,
    /["'`]((?:\/api\/|\/[^"'`]*rank[^"'`]*)[^"'`]*)["'`]/gi
  ];
  for(const re of patterns){
    for(const m of String(text||"").matchAll(re)){
      const raw=m[1]||m[0];
      const url=absolute(raw);
      if(url&&/api|rank|market|dynasty|football|player|graphql/i.test(url))urls.push(url);
    }
  }
  return [...new Set(urls)].slice(0,100);
}

function inspectBundle(url,result){
  const text=String(result?.text||"");
  return {
    url,
    status:result?.status??null,
    bytes:text.length,
    markers:{market:/\bmarket\b/i.test(text),rank:/\brank\b/i.test(text),superflex:/superflex/i.test(text),ppr:/\bppr\b/i.test(text),fetch:/fetch\s*\(/i.test(text),axios:/axios/i.test(text),graphql:/graphql/i.test(text)},
    candidateUrls:findCandidateUrls(text),
    marketSnippets:snippets(text,"market"),
    superflexSnippets:snippets(text,"superflex"),
    pprSnippets:snippets(text,"\\bppr\\b")
  };
}

export default async ()=>{
  const page=await fetchText(TARGET);
  const html=String(page.text||"");
  const scriptUrls=[...html.matchAll(/<script\b[^>]*src=["']([^"']+)["']/gi)]
    .map(m=>absolute(m[1])).filter(Boolean);
  const uniqueScripts=[...new Set(scriptUrls)].slice(0,20);
  const bundles=[];
  for(const url of uniqueScripts){
    try{bundles.push(inspectBundle(url,await fetchText(url)))}
    catch(error){bundles.push({url,error:String(error?.message||error)})}
  }
  const interesting=bundles.filter(x=>x?.markers&&(x.markers.market||x.markers.superflex||x.markers.ppr||x.candidateUrls?.length));
  return new Response(JSON.stringify({
    ok:true,
    source:"FanRanked",
    url:TARGET,
    page:{status:page.status,finalUrl:page.url,contentType:page.contentType,bytes:html.length,scriptCount:uniqueScripts.length,scriptUrls:uniqueScripts},
    interestingBundles:interesting,
    allBundles:bundles
  },null,2),{headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
};
