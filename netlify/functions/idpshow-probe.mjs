const SOURCE_URL="https://www.theidpshow.com/p/combined-idp-offense-dynasty-rankings-fantasy-football";
const TIMEOUT_MS=7000;

async function fetchText(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const res=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; FLL-TradeFinder/16.0; +https://netlify.com)","accept":"text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.8"},redirect:"follow",signal:controller.signal});
    const text=await res.text();
    return {ok:res.ok,status:res.status,contentType:res.headers.get("content-type")||null,text};
  } finally { clearTimeout(timer); }
}

function uniq(values){return [...new Set(values.filter(Boolean))];}
function clean(value,max=500){return String(value||"").replace(/\s+/g," ").trim().slice(0,max);}

function inspect(text,method,status,contentType){
  const source=String(text||"");
  const urls=uniq([...(source.matchAll(/https?:\\?\/\\?\/[^\s"'<>]+/gi))].map(m=>m[0].replace(/\\\//g,"/"))).slice(0,80);
  const iframeSrcs=uniq([...(source.matchAll(/<iframe[^>]+src=["']([^"']+)/gi))].map(m=>m[1])).slice(0,40);
  const scriptSrcs=uniq([...(source.matchAll(/<script[^>]+src=["']([^"']+)/gi))].map(m=>m[1])).slice(0,60);
  const tableHints=uniq(source.split(/\r?\n/).filter(line=>/table|rank|player|pagination|pageLength|dataTable|airtable|datawrapper|flourish|sheet|embed|iframe/i.test(line)).map(line=>clean(line,700))).slice(0,40);
  return {
    method,status,contentType,
    bytes:Buffer.byteLength(source,"utf8"),
    markers:{
      tables:(source.match(/<table\b/gi)||[]).length,
      rows:(source.match(/<tr\b/gi)||[]).length,
      iframes:(source.match(/<iframe\b/gi)||[]).length,
      scripts:(source.match(/<script\b/gi)||[]).length,
      jsonScripts:(source.match(/<script[^>]+type=["']application\/json["']/gi)||[]).length,
      rankTokens:(source.match(/\brank\b/gi)||[]).length,
      playerTokens:(source.match(/\bplayer\b/gi)||[]).length,
      pageTokens:(source.match(/\bpage\b/gi)||[]).length,
      datatables:/datatables|dataTable|pageLength/i.test(source),
      airtable:/airtable/i.test(source),
      datawrapper:/datawrapper/i.test(source),
      flourish:/flourish/i.test(source),
      googleSheets:/docs\.google\.com\/spreadsheets|googleusercontent/i.test(source),
      substack:/substack/i.test(source)
    },
    iframeSrcs,scriptSrcs,urls,tableHints
  };
}

export default async()=>{
  const attempts=[];
  try{
    const direct=await fetchText(SOURCE_URL);
    attempts.push(inspect(direct.text,"direct",direct.status,direct.contentType));
  }catch(error){attempts.push({method:"direct",error:String(error?.message||error)});}
  try{
    const jinaUrl=`https://r.jina.ai/http://${SOURCE_URL.replace(/^https?:\/\//,"")}`;
    const jina=await fetchText(jinaUrl);
    attempts.push(inspect(jina.text,"jina",jina.status,jina.contentType));
  }catch(error){attempts.push({method:"jina",error:String(error?.message||error)});}
  return new Response(JSON.stringify({ok:true,source:"The IDP Show Combined",url:SOURCE_URL,attempts},null,2),{headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
};
