const ORIGIN="https://www.fanranked.com";
const PAGE=`${ORIGIN}/football/dynasty-rankings`;
const TIMEOUT_MS=7000;

async function fetchAny(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const res=await fetch(url,{headers:{
      "user-agent":"Mozilla/5.0 (compatible; FFL-TradeFinder/16.0; +https://netlify.com)",
      "accept":"text/html,application/javascript,application/json,text/plain,*/*;q=0.8"
    },redirect:"follow",signal:controller.signal});
    const text=await res.text();
    let json=null; try{json=JSON.parse(text)}catch{}
    return {url:res.url||url,status:res.status,ok:res.ok,contentType:res.headers.get("content-type")||"",bytes:text.length,text,json};
  }finally{clearTimeout(timer)}
}

function contexts(text,term,limit=20,radius=500){
  const src=String(text||""); const out=[]; const lower=src.toLowerCase(); const needle=term.toLowerCase(); let at=0;
  while((at=lower.indexOf(needle,at))>=0&&out.length<limit){out.push(src.slice(Math.max(0,at-radius),Math.min(src.length,at+needle.length+radius)));at+=needle.length;}
  return out;
}

function apiUrls(text){
  const out=[];
  for(const m of String(text||"").matchAll(/["'`]([^"'`]*\/api\/[^"'`]*)["'`]/g)){
    const raw=m[1]; if(/market|rating|player|rank|trade|value|adp|vote/i.test(raw))out.push(raw);
  }
  return [...new Set(out)].slice(0,120);
}

export default async ()=>{
  const page=await fetchAny(PAGE);
  const scripts=[...page.text.matchAll(/<script\b[^>]*src=["']([^"']+)["']/gi)].map(m=>new URL(m[1],ORIGIN).href);
  let main=null;
  for(const url of scripts){
    try{const got=await fetchAny(url); if(/FootballDynastyRankings|marketRank|football_dynasty_sf/i.test(got.text)){main=got;break}}
    catch{}
  }
  const lazy=[];
  if(main){
    for(const m of main.text.matchAll(/assets\/(FootballDynastyRankings-[A-Za-z0-9_-]+\.js|FootballPlayerValues-[A-Za-z0-9_-]+\.js)/g))lazy.push(new URL(`/assets/${m[1]}`,ORIGIN).href);
  }
  const chunks=[];
  for(const url of [...new Set(lazy)]){
    try{
      const got=await fetchAny(url);
      chunks.push({url,status:got.status,bytes:got.bytes,apiUrls:apiUrls(got.text),marketRankContexts:contexts(got.text,"marketRank",30,700),marketContexts:contexts(got.text,"market",20,500),playerRatingContexts:contexts(got.text,"player-ratings",20,600)});
    }catch(error){chunks.push({url,error:String(error?.message||error)})}
  }
  return new Response(JSON.stringify({
    ok:true,source:"FanRanked",goal:"Trace exact marketRanks source",
    page:{status:page.status,bytes:page.bytes,scripts},
    main:main?{url:main.url,status:main.status,bytes:main.bytes,apiUrls:apiUrls(main.text),marketRankContexts:contexts(main.text,"marketRank",20,600)}:null,
    chunks
  },null,2),{headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
};
