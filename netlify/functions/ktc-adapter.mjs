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

function finiteNumber(...xs){for(const x of xs){const n=Number(x);if(Number.isFinite(n))return n}return null}
function ktcRank(row){return finiteNumber(row?.superflexValues?.rank,row?.superflexValue?.rank,row?.values?.superflex?.rank,row?.superflexRank,row?.superflex_rank)}
function ktcValue(row){return finiteNumber(row?.superflexValues?.value,row?.superflexValue?.value,row?.values?.superflex?.value,row?.superflexValue,row?.superflex_value)}
function normalizeKtcPlayers(players){
  const raw=[],excluded={draft:0,nonOffense:0};
  for(const row of players||[]){
    const position=String(row?.position||row?.pos||"").trim().toUpperCase();
    if(position==="RDP"){excluded.draft++;continue}
    if(!OFFENSE_POSITIONS.has(position)){excluded.nonOffense++;continue}
    const player=String(row?.playerName||row?.name||"").trim();
    if(!player)continue;
    raw.push({player,position,rank:ktcRank(row),value:ktcValue(row)});
  }
  const byName=new Map();
  for(const row of raw){
    const key=normalizePlayerName(row.player);if(!key)continue;
    const prior=byName.get(key);
    if(!prior||((Number.isFinite(row.rank)?row.rank:Infinity)<(Number.isFinite(prior.rank)?prior.rank:Infinity))||((row.value||-Infinity)>(prior.value||-Infinity)))byName.set(key,row);
  }
  const unique=[...byName.values()];
  const ranked=unique.filter(r=>Number.isFinite(r.rank)&&r.rank>=1&&r.rank<=MAX_SOURCE_RANK).sort((a,b)=>a.rank-b.rank);
  if(ranked.length>=300){
    const seenRank=new Set(),out=[];
    for(const r of ranked){if(seenRank.has(r.rank))continue;seenRank.add(r.rank);out.push({rank:r.rank,player:r.player,position:r.position})}
    if(out.length>=300)return{rows:out.slice(0,MAX_SOURCE_RANK),mode:"explicit-rank",excluded};
  }
  const valued=unique.filter(r=>Number.isFinite(r.value)&&r.value>0).sort((a,b)=>b.value-a.value||a.player.localeCompare(b.player)).slice(0,MAX_SOURCE_RANK);
  if(valued.length>=300)return{rows:valued.map((r,i)=>({rank:i+1,player:r.player,position:r.position,value:r.value})),mode:"derived-from-superflex-value",excluded};
  return{rows:ranked.map(r=>({rank:r.rank,player:r.player,position:r.position})),mode:"insufficient",excluded,valuedCount:valued.length};
}
function collectKtcPlayerArrays(text){
  const arrays=[];
  for(const name of ["playersArray","rankings","players"]){try{const a=extractAssignedArray(text,name);if(Array.isArray(a)&&a.length)arrays.push(a)}catch{}}
  return arrays.sort((a,b)=>b.length-a.length);
}
export function extractKtcSuperflexRankings(text){
  const arrays=collectKtcPlayerArrays(text);
  if(!arrays.length)throw new Error("KTC player ranking array was not found");
  let best=null;
  for(const players of arrays){
    const parsed=normalizeKtcPlayers(players);
    if(!best||parsed.rows.length>best.rows.length)best={...parsed,rawPlayers:players.length};
    if(parsed.rows.length>=300)break;
  }
  return {rows:best?.rows||[],rawPlayers:best?.rawPlayers||0,excludedDraftPicks:best?.excluded?.draft||0,excludedNonOffense:best?.excluded?.nonOffense||0,parserMode:best?.mode||"none",valuedCount:best?.valuedCount||0};
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
        parser:`ktc-resilient-${extracted.parserMode}`,
        raw_players:extracted.rawPlayers,
        max_source_rank:MAX_SOURCE_RANK,
        excluded_draft_picks:extracted.excludedDraftPicks,
        excluded_non_offense:extracted.excludedNonOffense,
        valued_rows:extracted.valuedCount||rows.length,
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
