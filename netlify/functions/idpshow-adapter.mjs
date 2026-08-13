const SOURCE_URL="https://www.theidpshow.com/p/combined-idp-offense-dynasty-rankings-fantasy-football";
const EMBED_URL="https://datawrapper.dwcdn.net/gNM2r/1/";
const TIMEOUT_MS=7000;

const normalizePosition=value=>{
  const p=String(value||"").trim().toUpperCase();
  return ["DL","LB","DB"].includes(p)?"IDP":p;
};

function parseCsv(text){
  const rows=[];let row=[],cell="",quoted=false;
  const source=String(text||"");
  for(let i=0;i<=source.length;i++){
    const ch=source[i]??"\n";
    if(quoted){
      if(ch==='"'&&source[i+1]==='"'){cell+='"';i++;}
      else if(ch==='"')quoted=false;
      else cell+=ch;
    }else if(ch==='"')quoted=true;
    else if(ch===','){row.push(cell);cell="";}
    else if(ch==='\n'){
      row.push(cell.replace(/\r$/,""));cell="";
      if(row.some(x=>String(x).trim()))rows.push(row);
      row=[];
    }else cell+=ch;
  }
  return rows;
}

export function extractIdpShowRankings(text){
  const csv=parseCsv(text);
  if(csv.length<2)return [];
  const header=csv[0].map(x=>String(x).trim().toLowerCase());
  const rankIndex=header.findIndex(x=>/^rank$|overall.*rank|rank.*overall/.test(x));
  const playerIndex=header.findIndex(x=>/player|name/.test(x));
  const posIndex=header.findIndex(x=>/^pos$|position/.test(x));
  if(rankIndex<0||playerIndex<0)return [];
  const unique=new Map();
  for(const cells of csv.slice(1)){
    const rank=Number(String(cells[rankIndex]||"").match(/\d{1,4}/)?.[0]);
    const player=String(cells[playerIndex]||"").trim();
    const position=normalizePosition(posIndex>=0?cells[posIndex]:"");
    if(!Number.isFinite(rank)||rank<1||!player)continue;
    const key=player.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
    const prior=unique.get(key);
    if(key&&(!prior||rank<prior.rank))unique.set(key,{rank,player,position});
  }
  return [...unique.values()].sort((a,b)=>a.rank-b.rank).slice(0,250);
}

async function fetchText(url,fetchImpl=fetch,accept="text/plain,*/*;q=0.8"){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const res=await fetchImpl(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; FFL-TradeFinder/16.0; +https://netlify.com)",accept},redirect:"follow",signal:controller.signal});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }finally{clearTimeout(timer)}
}

function discoverCsvUrls(embedHtml){
  const found=[];
  for(const match of String(embedHtml||"").matchAll(/(?:https?:)?\/\/[^\s"'<>]+\.csv(?:\?[^\s"'<>]*)?|[^\s"'<>]+\.csv(?:\?[^\s"'<>]*)?/gi)){
    let value=match[0].replace(/\\\//g,"/");
    if(value.startsWith("//"))value=`https:${value}`;
    else if(value.startsWith("/"))value=new URL(value,EMBED_URL).href;
    else if(!/^https?:\/\//i.test(value))value=new URL(value,EMBED_URL).href;
    found.push(value);
  }
  const candidates=[
    ...found,
    new URL("dataset.csv",EMBED_URL).href,
    new URL("data.csv",EMBED_URL).href
  ];
  return [...new Set(candidates)];
}

export async function refreshIdpShow(opts={}){
  const now=new Date().toISOString();
  const fetchImpl=opts.fetchImpl||fetch;
  let embedHtml="";
  try{embedHtml=await fetchText(EMBED_URL,fetchImpl,"text/html,application/xhtml+xml,*/*;q=0.8");}
  catch(error){
    return {source:"The IDP Show Combined",id:"combined-dynasty",status:"failed",valid:false,format:"combined-offense-idp-dynasty",reducedWeight:false,players_extracted:0,ranking_rows:0,rankings:[],timestamp:now,stage:"fetch",error:`Datawrapper embed fetch failed: ${String(error?.message||error)}`,urls:[SOURCE_URL],diagnostics:{embed_url:EMBED_URL,validation_result:false}};
  }

  const attempted=[];
  let rankings=[];let dataUrl=null;
  for(const candidate of discoverCsvUrls(embedHtml)){
    try{
      const text=await fetchText(candidate,fetchImpl,"text/csv,text/plain,*/*;q=0.8");
      const parsed=extractIdpShowRankings(text);
      attempted.push({url:candidate,rows:parsed.length,status:"ok"});
      if(parsed.length>rankings.length){rankings=parsed;dataUrl=candidate;}
      if(parsed.length>=75)break;
    }catch(error){attempted.push({url:candidate,rows:0,status:String(error?.message||error)});}
  }

  const uniquePlayers=new Set(rankings.map(x=>x.player.toLowerCase())).size;
  const valid=rankings.length>=75&&uniquePlayers>=75;
  return {
    source:"The IDP Show Combined",id:"combined-dynasty",status:valid?"refreshed":"failed",valid,
    format:"combined-offense-idp-dynasty",reducedWeight:false,
    players_extracted:uniquePlayers,ranking_rows:rankings.length,rankings,timestamp:now,
    stage:valid?"validated":"extract",error:valid?null:`Only ${rankings.length} validated ranking rows were extracted from Datawrapper`,
    urls:[SOURCE_URL],diagnostics:{fetch_method:"datawrapper-discovery",embed_url:EMBED_URL,data_url:dataUrl,attempted,parser:"idpshow-datawrapper-csv",unique_players_extracted:uniquePlayers,first_10:rankings.slice(0,10),validation_result:valid}
  };
}
