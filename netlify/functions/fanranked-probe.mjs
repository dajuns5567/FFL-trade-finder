const ORIGIN="https://www.fanranked.com";
const TIMEOUT_MS=7000;

async function fetchAny(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const res=await fetch(url,{headers:{
      "user-agent":"Mozilla/5.0 (compatible; FFL-TradeFinder/16.0; +https://netlify.com)",
      "accept":"application/json,text/plain,*/*;q=0.8"
    },redirect:"follow",signal:controller.signal});
    const text=await res.text();
    let json=null;
    try{json=JSON.parse(text)}catch{}
    return {url,status:res.status,ok:res.ok,contentType:res.headers.get("content-type")||"",bytes:text.length,text,json};
  }finally{clearTimeout(timer)}
}

function summarize(label,result){
  const sample=result?.json??result?.text??null;
  const str=typeof sample==="string"?sample:JSON.stringify(sample);
  const marketSnippets=[];
  const playerSnippets=[];
  for(const m of String(str||"").matchAll(/.{0,180}market.{0,260}/gi))marketSnippets.push(m[0]);
  for(const m of String(str||"").matchAll(/.{0,180}(?:player|consensusRank|marketRank).{0,260}/gi))playerSnippets.push(m[0]);
  let topLevel=null;
  if(result?.json&&typeof result.json==="object"){
    topLevel=Array.isArray(result.json)?{type:"array",length:result.json.length}:{type:"object",keys:Object.keys(result.json).slice(0,50)};
  }
  return {
    label,url:result?.url,status:result?.status,ok:result?.ok,contentType:result?.contentType,bytes:result?.bytes,
    topLevel,
    marketSnippets:[...new Set(marketSnippets)].slice(0,20),
    playerSnippets:[...new Set(playerSnippets)].slice(0,20),
    sample:typeof result?.json!=="undefined"&&result.json!==null?result.json:(result?.text||"").slice(0,5000)
  };
}

export default async ()=>{
  const candidates=[
    ["players-football-dynasty-sf",`${ORIGIN}/api/players?mode=football_dynasty_sf`],
    ["players-dynasty",`${ORIGIN}/api/players?mode=dynasty`],
    ["ratings-football-dynasty-sf",`${ORIGIN}/api/player-ratings?mode=football_dynasty_sf`],
    ["ratings-dynasty",`${ORIGIN}/api/player-ratings?mode=dynasty`],
    ["sources",`${ORIGIN}/api/sources`]
  ];
  const attempts=[];
  for(const [label,url] of candidates){
    try{attempts.push(summarize(label,await fetchAny(url)))}
    catch(error){attempts.push({label,url,error:String(error?.message||error)})}
  }
  return new Response(JSON.stringify({ok:true,source:"FanRanked",goal:"Dynasty Superflex marketRank discovery",attempts},null,2),{
    headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
  });
};
