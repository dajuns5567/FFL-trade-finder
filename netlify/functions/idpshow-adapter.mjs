const SOURCE_URL="https://www.theidpshow.com/p/combined-idp-offense-dynasty-rankings-fantasy-football";
const TIMEOUT_MS=7000;

const decode=s=>String(s||"")
  .replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&#39;/gi,"'")
  .replace(/&quot;/gi,'"').replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

const normalizePosition=value=>{
  const p=String(value||"").trim().toUpperCase();
  return ["DL","LB","DB"].includes(p)?"IDP":p;
};

function parseHtmlTables(text){
  const rows=[];
  const tables=String(text||"").match(/<table\b[\s\S]*?<\/table>/gi)||[];
  for(const table of tables){
    const trs=table.match(/<tr\b[\s\S]*?<\/tr>/gi)||[];
    let header=null;
    for(const tr of trs){
      const cells=[...(tr.match(/<(?:th|td)\b[\s\S]*?<\/(?:th|td)>/gi)||[])].map(decode);
      if(cells.length<2)continue;
      const lower=cells.map(x=>x.toLowerCase());
      if(!header&&lower.some(x=>/rank/.test(x))&&lower.some(x=>/player|name/.test(x))){
        header={rank:lower.findIndex(x=>/rank/.test(x)),player:lower.findIndex(x=>/player|name/.test(x)),position:lower.findIndex(x=>/^pos|position/.test(x))};
        continue;
      }
      const rankIndex=header?.rank>=0?header.rank:0;
      const playerIndex=header?.player>=0?header.player:1;
      const posIndex=header?.position>=0?header.position:2;
      const rank=Number(String(cells[rankIndex]||"").match(/\d{1,4}/)?.[0]);
      const player=String(cells[playerIndex]||"").trim();
      const position=normalizePosition(cells[posIndex]||"");
      if(Number.isFinite(rank)&&rank>0&&player&&player.length>2)rows.push({rank,player,position});
    }
  }
  return rows;
}

function parseMarkdownTables(text){
  const rows=[];
  for(const line of String(text||"").split(/\r?\n/)){
    if(!line.includes("|"))continue;
    const cells=line.split("|").map(x=>x.trim()).filter(Boolean);
    if(cells.length<3)continue;
    const rank=Number(String(cells[0]).match(/^\d{1,4}$/)?.[0]);
    if(!Number.isFinite(rank)||rank<1)continue;
    const player=String(cells[1]||"").replace(/\*\*/g,"").trim();
    const position=normalizePosition(String(cells[2]||"").replace(/\*\*/g,"").trim());
    if(player.length>2)rows.push({rank,player,position});
  }
  return rows;
}

export function extractIdpShowRankings(text){
  const raw=[...parseHtmlTables(text),...parseMarkdownTables(text)];
  const unique=new Map();
  for(const row of raw){
    const key=row.player.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
    const prior=unique.get(key);
    if(key&&(!prior||row.rank<prior.rank))unique.set(key,row);
  }
  return [...unique.values()].sort((a,b)=>a.rank-b.rank);
}

async function fetchText(url,fetchImpl=fetch){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const res=await fetchImpl(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; FLL-TradeFinder/16.0; +https://netlify.com)","accept":"text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8"},redirect:"follow",signal:controller.signal});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    return {text:await res.text(),method:"direct"};
  }finally{clearTimeout(timer)}
}

export async function refreshIdpShow(opts={}){
  const now=new Date().toISOString();
  let page;
  try{
    page=await fetchText(SOURCE_URL,opts.fetchImpl||fetch);
  }catch{
    const jina=`https://r.jina.ai/http://${SOURCE_URL.replace(/^https?:\/\//,"")}`;
    page=await fetchText(jina,opts.fetchImpl||fetch);
    page.method="jina";
  }
  const rankings=extractIdpShowRankings(page.text);
  const uniquePlayers=new Set(rankings.map(x=>x.player.toLowerCase())).size;
  const valid=rankings.length>=75&&uniquePlayers>=40;
  return {
    source:"The IDP Show Combined",id:"combined-dynasty",status:valid?"refreshed":"failed",valid,
    format:"combined-offense-idp-dynasty",reducedWeight:false,
    players_extracted:uniquePlayers,ranking_rows:rankings.length,rankings,timestamp:now,
    stage:valid?"validated":"extract",error:valid?null:`Only ${rankings.length} validated ranking rows were extracted`,
    urls:[SOURCE_URL],diagnostics:{fetch_method:page.method,parser:"idpshow-table",unique_players_extracted:uniquePlayers,first_10:rankings.slice(0,10),validation_result:valid}
  };
}
