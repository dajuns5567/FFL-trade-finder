const KTC_URL="https://keeptradecut.com/dynasty-rankings";
const TIMEOUT_MS=7000;
const MAX_SOURCE_RANK=500;
const OFFENSE_POSITIONS=new Set(["QB","RB","WR","TE"]);

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

async function fetchText(url,fetchImpl=fetch,timeoutMs=TIMEOUT_MS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const res=await fetchImpl(url,{headers:{
      "user-agent":"Mozilla/5.0 (compatible; FLL-TradeFinder/16.0; +https://netlify.com)",
      "accept":"text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"
    },redirect:"follow",signal:controller.signal});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }finally{clearTimeout(timer)}
}

function extractAssignedArray(text,variableName){
  const source=String(text||"");
  const marker=new RegExp(`(?:var|let|const|window\\.)?\\s*${variableName}\\s*=\\s*`);
  const match=marker.exec(source);
  if(!match)return null;
  const start=source.indexOf("[",match.index+match[0].length);
  if(start<0)return null;
  let depth=0,quoted=false,escaped=false;
  for(let i=start;i<source.length;i++){
    const ch=source[i];
    if(quoted){
      if(escaped)escaped=false;
      else if(ch==="\\")escaped=true;
      else if(ch==='"')quoted=false;
      continue;
    }
    if(ch==='"'){quoted=true;continue}
    if(ch==="[")depth++;
    else if(ch==="]"&&--depth===0)return JSON.parse(source.slice(start,i+1));
  }
  return null;
}

export function extractKtcSuperflexRankings(text){
  const players=extractAssignedArray(text,"playersArray");
  if(!Array.isArray(players))throw new Error("KTC playersArray was not found");

  const sourceRows=[];
  let excludedDraftPicks=0;
  let excludedNonOffense=0;
  for(const row of players){
    const rank=Number(row?.superflexValues?.rank);
    if(!Number.isFinite(rank)||rank<1||rank>MAX_SOURCE_RANK)continue;
    const position=String(row?.position||"").trim().toUpperCase();
    if(position==="RDP"){excludedDraftPicks++;continue}
    if(!OFFENSE_POSITIONS.has(position)){excludedNonOffense++;continue}
    const player=String(row?.playerName||"").trim();
    if(!player)continue;
    sourceRows.push({rank,player,position});
  }

  const unique=new Map();
  for(const row of sourceRows){
    const key=normalizePlayerName(row.player);
    if(!key)continue;
    const prior=unique.get(key);
    if(!prior||row.rank<prior.rank)unique.set(key,row);
  }
  const rows=[...unique.values()].sort((a,b)=>a.rank-b.rank);
  return {rows,rawPlayers:players.length,excludedDraftPicks,excludedNonOffense};
}

export async function refreshKtc(opts={}){
  const now=new Date().toISOString();
  try{
    const text=await fetchText(KTC_URL,opts.fetchImpl||fetch,opts.timeoutMs||TIMEOUT_MS);
    const extracted=extractKtcSuperflexRankings(text);
    const rows=extracted.rows;
    const uniqueRanks=new Set(rows.map(row=>row.rank));
    const uniquePlayers=new Set(rows.map(row=>normalizePlayerName(row.player)));
    const valid=rows.length>=300&&uniqueRanks.size===rows.length&&uniquePlayers.size===rows.length&&rows.every(row=>row.rank>=1&&row.rank<=MAX_SOURCE_RANK);
    return {
      source:"KTC",id:"ktc",status:valid?"refreshed":"failed",valid,
      format:"dynasty-superflex",reducedWeight:true,
      players_extracted:uniquePlayers.size,ranking_rows:rows.length,rankings:rows,
      timestamp:now,stage:valid?"validated":"extract",
      error:valid?null:`Only ${rows.length} unique offensive Superflex rankings were extracted from KTC's top ${MAX_SOURCE_RANK} source ranks`,
      urls:[KTC_URL],
      diagnostics:{
        parser:"ktc-playersArray-superflexValues-rank",
        raw_players:extracted.rawPlayers,
        max_source_rank:MAX_SOURCE_RANK,
        excluded_draft_picks:extracted.excludedDraftPicks,
        excluded_non_offense:extracted.excludedNonOffense,
        first_10:rows.slice(0,10),
        validation_result:valid
      }
    };
  }catch(error){
    return {
      source:"KTC",id:"ktc",status:"failed",valid:false,
      format:"dynasty-superflex",reducedWeight:true,
      players_extracted:0,ranking_rows:0,rankings:[],timestamp:now,
      stage:"fetch",error:String(error?.message||error),urls:[KTC_URL]
    };
  }
}
