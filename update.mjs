import { refreshAllSources, CONSENSUS_SOURCES } from "./consensus-adapters.mjs";

const SOURCE_REGISTRY = [

  {name:"FantasyPros", kind:"offense", urls:[
    "https://www.fantasypros.com/nfl/rankings/?scoring=PPR&type=dynasty"
  ]},
  {name:"DraftSharks", kind:"offense", urls:[
    "https://www.draftsharks.com/dynasty-rankings/ppr",
    "https://www.draftsharks.com/dynasty-rankings/superflex"
  ]},
  {name:"PFN", kind:"offense", urls:[
    "https://www.profootballnetwork.com/fantasy-football-dynasty-rankings/"
  ]},
  {name:"SI", kind:"offense", urls:[
    "https://www.si.com/onsi/fantasy/rankings/top-150-overall-dynasty-fantasy-football-rankings-ja-marr-chase-is-still-the-top-option-but-puka-nacua-falls"
  ]},
  {name:"KTC", kind:"offense", urls:[
    "https://keeptradecut.com/dynasty-rankings"
  ]},
  {name:"DraftSharks IDP", kind:"idp", urls:[
    "https://www.draftsharks.com/dynasty-rankings/idp"
  ]},
  {name:"PFF IDP", kind:"idp", urls:[
    "https://www.pff.com/news/fantasy-football-dynasty-idp-rankings"
  ]},
  {name:"Dynasty Dealer IDP", kind:"idp", urls:[
    "https://www.dynastydealer.com/rankings/idp"
  ]}
];

// V14.8 diagnostics: keep source retrieval separate from valuation.
// Every adapter should return {ok, source, status, players_extracted, stage, error, timestamp}.
const SOURCE_DIAGNOSTICS = Array.isArray(SOURCE_REGISTRY) ? SOURCE_REGISTRY.map(s => ({
  source: s.name, status: "failed", players_extracted: 0, stage: "not-run",
  error: "source adapter did not return a validated result", timestamp: null
})) : [];


const SOURCES=SOURCE_REGISTRY;
const MAX=9000000;

export default async (req)=>{
  if(req.method==="OPTIONS")return json({ok:true});
  if(req.method!=="POST")return json({ok:false,error:"POST required"},405);
  let body={};try{body=await req.json()}catch{return json({ok:false,error:"Invalid JSON"},400)}
  const players=Array.isArray(body.players)?body.players:[];
  if(!players.length)return json({ok:false,error:"No player list supplied"},400);

  const results=await Promise.all(SOURCES.map(s=>refreshSource(s,players)));
  const successful=results.filter(x=>x.ok);
  const failed=results.filter(x=>!x.ok);
  const sources={};
  for(const x of successful){
    sources[x.name]={updated:new Date().toISOString(),data:x.data,url:x.url,kind:x.kind,playerCount:Object.keys(x.data).length};
  }

  // IMPORTANT: always return 200 for a diagnostic refresh. A partial/failed
  // refresh must not look like a server outage and must never erase the last
  // validated client snapshot.
  return json({
    ok:true,
    sources,
    sourceRegistry:SOURCE_REGISTRY,
    summary:{
      total:SOURCES.length,
      attempted:SOURCES.length,
      successful:successful.length,
      failed:failed.length,
      refreshedSources:successful.map(x=>x.name),
      failedSources:failed.map(x=>x.name),
      results:results.map(x=>({
        source:x.name,
        ok:x.ok,
        stage:x.stage,
        url:x.url||null,
        players_extracted:x.ok?Object.keys(x.data).length:0,
        error:x.ok?null:x.error
      }))
    },
    updatedAt:new Date().toISOString()
  });
};

async function refreshSource(source,players){
  let last={stage:"fetch",error:"no usable URL"};
  for(const url of source.urls){
    const attempts=[
      {kind:"direct",url},
      {kind:"jina",url:"https://r.jina.ai/http://"+url.replace(/^https?:\/\//,"")}
    ];
    for(const a of attempts){
      const got=await fetchText(a.url);
      if(!got){last={stage:"fetch",error:`${a.kind} fetch failed`,url};continue}
      const data=parseRankings(got.text,players);
      if(Object.keys(data).length>=10){
        const ranks=Object.values(data).map(Number).filter(Number.isFinite);
        const maxRank=Math.max(...ranks);
        if(ranks.length>=10 && maxRank>=10){
          return {ok:true,name:source.name,kind:source.kind,url, data};
        }
        last={stage:"validate",error:"ranking rows detected but validation failed",url};
      }
      last={stage:"extract",error:`${a.kind} page fetched but only ${Object.keys(data).length} matched ranking rows`,url};
    }
  }
  return {ok:false,name:source.name,stage:last.stage,url:last.url||null,error:last.error};
}

async function fetchText(url){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),9000);
  try{
    const r=await fetch(url,{redirect:"follow",signal:c.signal,headers:{
      "user-agent":"Mozilla/5.0 (compatible; FLL-Dynasty-Trade-Finder/14.6)",
      "accept":"text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8"
    }});
    if(!r.ok)return null;
    const t=await r.text();
    if(!t||t.length>MAX)return null;
    return {text:t,status:r.status,contentType:r.headers.get("content-type")||""};
  }catch{return null}finally{clearTimeout(timer)}
}

function norm(s){
  return String(s||"").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[.'’,-]/g," ")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g," ")
    .replace(/[^a-z0-9]/g,"");
}

function parseRankings(text,players){
  const aliases=players.map(p=>({
    id:String(p.id),name:p.name,n:norm(p.name),
    first:norm((p.name||"").split(/\s+/)[0]),
    last:norm((p.name||"").split(/\s+/).slice(-1)[0])
  })).filter(x=>x.n).sort((a,b)=>b.n.length-a.n.length);

  const out={};
  const raw=String(text||"");
  const clean=raw
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/\r/g,"\n")
    .replace(/[|•]/g," ")
    .replace(/\s+/g," ");

  // Prefer line-based extraction first. This works for normal pages and Jina markdown.
  const lines=raw.split(/\n+/).map(x=>x.replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").trim()).filter(Boolean);
  for(const line0 of lines){
    const line=line0.replace(/\s+/g," ");
    const m=line.match(/(?:^|[\s|])(\d{1,3})\s*[.)\-:]?\s+([A-Za-z][A-Za-z'’.\-]+(?:\s+[A-Za-z][A-Za-z'’.\-]+){1,5})(?=$|[\s|])/);
    if(!m)continue;
    const rank=Number(m[1]); if(rank<1||rank>500)continue;
    const segment=m[2].trim();
    const sn=norm(segment); if(!sn)continue;
    let hit=aliases.find(a=>sn.includes(a.n));
    if(!hit){
      const toks=sn.match(/[a-z0-9]+/g)||[];
      if(toks.length>=2) hit=aliases.find(a=>toks.includes(a.first)&&toks.includes(a.last));
    }
    if(hit && (out[hit.id]==null||rank<out[hit.id])) out[hit.id]=rank;
  }

  // Fallback over flattened text for HTML tables that lost row boundaries.
  const re=/\b(\d{1,3})\s*[.)\-:]?\s+([A-Za-z][A-Za-z'’.\-]+(?:\s+[A-Za-z][A-Za-z'’.\-]+){1,5})/g;
  let m;
  while((m=re.exec(clean))){
    const rank=Number(m[1]); if(rank<1||rank>500)continue;
    const sn=norm(m[2]); if(!sn)continue;
    let hit=aliases.find(a=>sn.includes(a.n));
    if(!hit){
      const toks=sn.match(/[a-z0-9]+/g)||[];
      if(toks.length>=2) hit=aliases.find(a=>toks.includes(a.first)&&toks.includes(a.last));
    }
    if(hit && (out[hit.id]==null||rank<out[hit.id])) out[hit.id]=rank;
  }
  return out;
}

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{
    "content-type":"application/json; charset=utf-8","cache-control":"no-store"
  }});
}


// V14.8 response wiring helper. Existing update logic can pass its source results here.
function consensusResponse(sourceResults) {
  const results = Array.isArray(sourceResults) ? sourceResults.map(x => ({
    source: x.source || x.name || "Unknown",
    status: x.status || (x.ok ? "refreshed" : "failed"),
    players_extracted: Number(x.players_extracted ?? x.extracted ?? x.count ?? 0),
    stage: x.stage || null,
    error: x.error || null,
    timestamp: x.timestamp || null
  })) : [];
  return {
    successful: results.filter(x => x.status === "refreshed" || x.status === "success" || x.status === "successful").length,
    total: results.length || 8,
    results
  };
}

/* V16_CONSENSUS_INGESTION
   Source-specific ingestion is now available to the update handler.
   This helper is intentionally isolated from valuation calculations.
*/
async function V16_CONSENSUS_INGESTION() {
  return await refreshAllSources();
}
