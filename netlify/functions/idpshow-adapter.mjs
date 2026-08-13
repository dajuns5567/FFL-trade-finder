const SOURCE_URL="https://www.theidpshow.com/p/combined-idp-offense-dynasty-rankings-fantasy-football";
const EMBED_URL="https://datawrapper.dwcdn.net/gNM2r/1/";
const TIMEOUT_MS=7000;

const normalizePosition=value=>{
  const p=String(value||"").trim().toUpperCase();
  return ["DL","LB","DB"].includes(p)?"IDP":p;
};

const normalizePlayerName=value=>String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();

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
  const rows=[];
  for(const cells of csv.slice(1)){
    const rank=Number(String(cells[rankIndex]||"").match(/\d{1,4}/)?.[0]);
    const player=String(cells[playerIndex]||"").trim();
    const position=normalizePosition(posIndex>=0?cells[posIndex]:"");
    if(!Number.isFinite(rank)||rank<1||!player)continue;
    rows.push({rank,player,position});
  }
  return rows.sort((a,b)=>a.rank-b.rank).slice(0,250);
}

function validateRankings(rankings){
  const rows=Array.isArray(rankings)?rankings:[];
  const rankMap=new Map();
  const nameMap=new Map();
  for(const row of rows){
    const rank=Number(row.rank);
    if(!Number.isFinite(rank))continue;
    if(!rankMap.has(rank))rankMap.set(rank,[]);
    rankMap.get(rank).push(row.player);
    const key=normalizePlayerName(row.player);
    if(key){
      if(!nameMap.has(key))nameMap.set(key,[]);
      nameMap.get(key).push({rank,player:row.player,position:String(row.position||"").toUpperCase()});
    }
  }

  const ranks=[...rankMap.keys()].sort((a,b)=>a-b);
  const minRank=ranks[0]??null;
  const maxRank=ranks.at(-1)??null;
  const missing=[];
  if(minRank===1&&maxRank!=null){
    for(let rank=1;rank<=maxRank;rank++)if(!rankMap.has(rank))missing.push(rank);
  }

  const duplicateRanks=[...rankMap.entries()]
    .filter(([,players])=>players.length>1)
    .map(([rank,players])=>({rank,players}));

  const duplicatePlayers=[...nameMap.entries()]
    .filter(([,entries])=>entries.length>1)
    .map(([normalized,entries])=>({normalized,player:entries[0].player,entries,ranks:entries.map(x=>x.rank)}));

  const allowedDualRolePlayers=[];
  const blockingDuplicatePlayers=[];
  for(const duplicate of duplicatePlayers){
    const entries=duplicate.entries;
    const idpEntries=entries.filter(x=>x.position==="IDP");
    const offenseEntries=entries.filter(x=>x.position&&x.position!=="IDP");
    const allowed=entries.length===2&&idpEntries.length===1&&offenseEntries.length===1;
    if(allowed){
      allowedDualRolePlayers.push({
        player:duplicate.player,
        ranks:duplicate.ranks,
        positions:entries.map(x=>x.position)
      });
    }else{
      blockingDuplicatePlayers.push(duplicate);
    }
  }

  const contiguous=minRank===1&&missing.length===0;
  const valid=rows.length>=75&&contiguous&&duplicateRanks.length===0&&blockingDuplicatePlayers.length===0;
  return {valid,minRank,maxRank,missing,duplicateRanks,duplicatePlayers,allowedDualRolePlayers,blockingDuplicatePlayers};
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
  const candidates=[...found,new URL("dataset.csv",EMBED_URL).href,new URL("data.csv",EMBED_URL).href];
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
  let validation={valid:false,minRank:null,maxRank:null,missing:[],duplicateRanks:[],duplicatePlayers:[],allowedDualRolePlayers:[],blockingDuplicatePlayers:[]};
  for(const candidate of discoverCsvUrls(embedHtml)){
    try{
      const text=await fetchText(candidate,fetchImpl,"text/csv,text/plain,*/*;q=0.8");
      const parsed=extractIdpShowRankings(text);
      const checked=validateRankings(parsed);
      attempted.push({
        url:candidate,rows:parsed.length,min_rank:checked.minRank,max_rank:checked.maxRank,
        missing_ranks:checked.missing,duplicate_ranks:checked.duplicateRanks,
        allowed_dual_role_players:checked.allowedDualRolePlayers,
        blocking_duplicate_players:checked.blockingDuplicatePlayers,status:"ok"
      });
      if(parsed.length>rankings.length){rankings=parsed;dataUrl=candidate;validation=checked;}
      if(checked.valid)break;
    }catch(error){attempted.push({url:candidate,rows:0,status:String(error?.message||error)});}
  }

  const uniquePlayers=new Set(rankings.map(x=>normalizePlayerName(x.player)).filter(Boolean)).size;
  const valid=validation.valid;
  let error=null;
  if(!valid){
    if(validation.missing.length)error=`Ranking sequence is not contiguous; missing ranks: ${validation.missing.join(", ")}`;
    else if(validation.duplicateRanks.length)error=`Duplicate source ranks detected: ${validation.duplicateRanks.map(x=>x.rank).join(", ")}`;
    else if(validation.blockingDuplicatePlayers.length)error=`Invalid duplicate player row: ${validation.blockingDuplicatePlayers.map(x=>`${x.player} at ranks ${x.ranks.join("/")}`).join("; ")}`;
    else error=`Only ${rankings.length} validated ranking rows were extracted from Datawrapper`;
  }
  return {
    source:"The IDP Show Combined",id:"combined-dynasty",status:valid?"refreshed":"failed",valid,
    format:"combined-offense-idp-dynasty",reducedWeight:false,
    players_extracted:uniquePlayers,ranking_rows:rankings.length,rankings,timestamp:now,
    stage:valid?"validated":"extract",error,
    urls:[SOURCE_URL],diagnostics:{
      fetch_method:"datawrapper-discovery",embed_url:EMBED_URL,data_url:dataUrl,attempted,
      parser:"idpshow-datawrapper-csv-dual-role",unique_players_extracted:uniquePlayers,
      ranking_rows:rankings.length,min_rank:validation.minRank,max_rank:validation.maxRank,
      missing_ranks:validation.missing,duplicate_ranks:validation.duplicateRanks,
      allowed_dual_role_players:validation.allowedDualRolePlayers,
      blocking_duplicate_players:validation.blockingDuplicatePlayers,
      rank_sequence_contiguous:validation.missing.length===0&&validation.minRank===1,
      first_10:rankings.slice(0,10),rows_198_208:rankings.filter(x=>x.rank>=198&&x.rank<=208),validation_result:valid
    }
  };
}
