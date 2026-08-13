const ROTOWIRE_IDP_URL="https://www.rotowire.com/football/cheatsheet-idp.php";
const TIMEOUT_MS=7000;
const DEF_POSITIONS=new Set(["DL","DE","DT","EDGE","LB","ILB","OLB","DB","CB","S","FS","SS"]);

function normalizePlayerName(name){
  return String(name||"")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[’']/g,"")
    .replace(/[^a-z0-9]+/gi," ")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g,"")
    .replace(/\s+/g," ")
    .trim();
}

function decodeHtml(s){
  return String(s||"")
    .replace(/&nbsp;|&#160;/gi," ")
    .replace(/&mdash;|&#8212;/gi,"—")
    .replace(/&ndash;|&#8211;/gi,"–")
    .replace(/&amp;/gi,"&")
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&quot;/gi,'"');
}

function cleanCell(s){
  return decodeHtml(String(s||"")
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g," "))
    .replace(/\s+/g," ")
    .trim();
}

async function fetchHtml(fetchImpl=fetch,timeoutMs=TIMEOUT_MS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const res=await fetchImpl(ROTOWIRE_IDP_URL,{headers:{
      "user-agent":"Mozilla/5.0 (compatible; FFL-TradeFinder/16.0; +https://netlify.com)",
      "accept":"text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"
    },redirect:"follow",signal:controller.signal});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }finally{clearTimeout(timer)}
}

export function extractRotowireIdpRankings(html){
  const tableMatch=String(html||"").match(/<table\b[^>]*class=["'][^"']*rankings-ssr-rich[^"']*["'][^>]*>[\s\S]*?<\/table>/i);
  if(!tableMatch)throw new Error("RotoWire rankings table not found");

  const rows=[];
  for(const match of tableMatch[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const cells=[...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>cleanCell(m[1]));
    if(cells.length<4)continue;
    const rank=Number(cells[0]);
    if(!Number.isFinite(rank)||rank<1)continue;
    const player=String(cells[1]||"").trim();
    const team=String(cells[2]||"").trim();
    const position=String(cells[3]||"").trim().toUpperCase();
    if(!player||!DEF_POSITIONS.has(position))continue;
    rows.push({rank,player,position:"IDP",sourcePosition:position,team});
  }

  rows.sort((a,b)=>a.rank-b.rank);
  return rows;
}

export async function refreshRotowireIdp(opts={}){
  const now=new Date().toISOString();
  try{
    const html=await fetchHtml(opts.fetchImpl||fetch,opts.timeoutMs||TIMEOUT_MS);
    const rows=extractRotowireIdpRankings(html);
    const uniquePlayers=new Set(rows.map(row=>normalizePlayerName(row.player)));
    const uniqueRanks=new Set(rows.map(row=>row.rank));
    const maxRank=rows.length?rows[rows.length-1].rank:0;
    const contiguous=rows.length>0&&rows.every((row,index)=>row.rank===index+1);
    const valid=rows.length>=75&&uniquePlayers.size===rows.length&&uniqueRanks.size===rows.length&&contiguous;
    return {
      source:"RotoWire IDP",id:"rotowire-idp",status:valid?"refreshed":"failed",valid,
      format:"2026-idp-cheatsheet",reducedWeight:true,
      players_extracted:uniquePlayers.size,ranking_rows:rows.length,rankings:rows,
      timestamp:now,stage:valid?"validated":"extract",
      error:valid?null:`RotoWire IDP validation failed: ${rows.length} rows, max rank ${maxRank}, contiguous=${contiguous}`,
      urls:[ROTOWIRE_IDP_URL],
      diagnostics:{parser:"rotowire-rankings-ssr-rich",max_rank:maxRank,contiguous,first_10:rows.slice(0,10),validation_result:valid}
    };
  }catch(error){
    return {
      source:"RotoWire IDP",id:"rotowire-idp",status:"failed",valid:false,
      format:"2026-idp-cheatsheet",reducedWeight:true,
      players_extracted:0,ranking_rows:0,rankings:[],timestamp:now,
      stage:"fetch",error:String(error?.message||error),urls:[ROTOWIRE_IDP_URL]
    };
  }
}
