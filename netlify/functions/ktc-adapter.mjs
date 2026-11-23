const KTC_URL="https://keeptradecut.com/dynasty-rankings?format=2";
const KTC_FALLBACK_URL="https://keeptradecut.com/dynasty-rankings";
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

// Read only a literal JSON array placed immediately after an assignment.
 // Never jump ahead to the next unrelated '[' after JSON.parse(...).
function extractAssignedArray(text,variableName){
 const source=String(text||"");
 const pattern=new RegExp("(?:\\b(?:var|let|const)\\s+|\\bwindow\\.\\s*)?\\b"+variableName+"\\s*=\\s*","g");
 let match;
 while((match=pattern.exec(source))){
  const start=match.index+match[0].length;
  if(source[start]!=="[")continue;
  const raw=balancedJson(source,start,"[","]");
  if(!raw)continue;
  try{const data=JSON.parse(raw);if(Array.isArray(data))return data}catch{}
 }
 return null;
}
function balancedJson(source,start,open,close){
 if(source[start]!==open)return null;
 let depth=0,quoted=false,escaped=false;
 for(let i=start;i<source.length;i++){
  const ch=source[i];
  if(quoted){
   if(escaped)escaped=false;
   else if(ch==="\\\\")escaped=true;
   else if(ch==='"')quoted=false;
  }else if(ch==='"')quoted=true;
  else if(ch===open)depth++;
  else if(ch===close&&--depth===0)return source.slice(start,i+1);
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
// KTC has shipped the dynasty player universe as a JSON script, a literal
// playersArray, and nested app bootstrap JSON. Read actual JSON rather than
// evaluating page scripts. Only player-shaped arrays enter normalization.
function playerShape(row){
 return row&&typeof row==="object"&&
  typeof (row.playerName??row.name)==="string"&&
  OFFENSE_POSITIONS.has(String(row.position??row.pos??"").toUpperCase());
}
function collectKtcPlayerArrays(text){
 const source=String(text||""),candidates=[],seen=new Set();
 const add=(players,parser)=>{
  if(!Array.isArray(players)||players.length<300||seen.has(players))return;
  const sample=players.slice(0,Math.min(30,players.length));
  if(sample.filter(playerShape).length<Math.min(5,sample.length))return;
  seen.add(players);candidates.push({players,parser});
 };
 const searchJson=(root,parser)=>{
  const stack=[root],visited=new Set();
  while(stack.length&&visited.size<10000){
   const node=stack.pop();
   if(!node||typeof node!=="object"||visited.has(node))continue;
   visited.add(node);
   if(Array.isArray(node)){
    add(node,parser);
    // Large player arrays are terminal. Do not walk thousands of player objects.
    if(node.length>100)continue;
    for(const x of node)if(x&&typeof x==="object")stack.push(x);
   }else{
    for(const val of Object.values(node))if(val&&typeof val==="object")stack.push(val);
   }
  }
 };
 const scripts=/<script\\b([^>]*)>([\\s\\S]*?)<\\/script\\s*>/gi;
 let match;
 while((match=scripts.exec(source))){
  const attrs=match[1],body=match[2].trim();
  // KTC's own ktc-players data script and normal JSON/Next.js bootstraps.
  const id=(attrs.match(/\\bid\\s*=\\s*["']([^"']+)["']/i)||[])[1]||"";
  const type=(attrs.match(/\\btype\\s*=\\s*["']([^"']+)["']/i)||[])[1]||"";
  if(!/^(ktc-players|__NEXT_DATA__|__NUXT_DATA__)$/i.test(id)&&
     !/application\\/(?:json|ld\\+json)/i.test(type))continue;
  if(body.length>10000000||!body||!/[\\[{]/.test(body[0]))continue;
  try{searchJson(JSON.parse(body),"embedded-json:"+id)}catch{}
 }
 for(const name of ["playersArray","rankings","players"]){
  const literal=extractAssignedArray(source,name);
  if(literal)add(literal,"inline-array:"+name);
 }
 // Some KTC builds embed an object in a bootstrap variable instead of the
 // JSON script. The object must be strict JSON and still meet player checks.
 for(const name of ["__INITIAL_STATE__","__NEXT_DATA__","rankingData","ktcData"]){
  const marker=new RegExp("(?:\\bwindow\\.\\s*)?\\b"+name+"\\s*=\\s*","g");
  let item;
  while((item=marker.exec(source))){
   const start=item.index+item[0].length;
   if(source[start]!=="{")continue;
   const raw=balancedJson(source,start,"{","}");
   if(!raw)continue;
   try{searchJson(JSON.parse(raw),"bootstrap-json:"+name)}catch{}
  }
 }
 return candidates.sort((a,b)=>b.players.length-a.players.length);
}
export function extractKtcSuperflexRankings(text){
  const arrays=collectKtcPlayerArrays(text);
  if(!arrays.length)throw new Error("KTC player ranking array was not found");
  let best=null;
  for(const candidate of arrays){
    const parsed=normalizeKtcPlayers(candidate.players);
    if(!best||parsed.rows.length>best.rows.length)
      best={...parsed,rawPlayers:candidate.players.length,extractionMethod:candidate.parser};
    if(parsed.rows.length>=300)break;
  }
  return {rows:best?.rows||[],rawPlayers:best?.rawPlayers||0,excludedDraftPicks:best?.excluded?.draft||0,excludedNonOffense:best?.excluded?.nonOffense||0,parserMode:best?.mode||"none",extractionMethod:best?.extractionMethod||null,valuedCount:best?.valuedCount||0,embeddedPlayers:arrays.find(x=>x.parser==="embedded-json:ktc-players")?.players.length||0};
}
export async function refreshKtc(opts={}){
 const now=new Date().toISOString(),attempts=[];
 for(const url of [KTC_URL,KTC_FALLBACK_URL]){
  try{
   const html=await fetchText(url,opts.fetchImpl||fetch,opts.timeoutMs||TIMEOUT_MS);
   const extracted=extractKtcSuperflexRankings(html),rows=extracted.rows;
   const uniqueRanks=new Set(rows.map(row=>row.rank));
   const uniquePlayers=new Set(rows.map(row=>normalizePlayerName(row.player)));
   const valid=rows.length>=300&&uniqueRanks.size===rows.length&&
     uniquePlayers.size===rows.length&&
     rows.every(row=>Number.isInteger(row.rank)&&row.rank>=1&&row.rank<=MAX_SOURCE_RANK);
   attempts.push({url,valid,ranking_rows:rows.length,parser:extracted.extractionMethod,
     response_chars:html.length});
   if(!valid)continue;
   return{
    source:"KTC",id:"ktc",status:"refreshed",valid:true,
    format:"dynasty-superflex",reducedWeight:true,
    players_extracted:uniquePlayers.size,ranking_rows:rows.length,rankings:rows,
    timestamp:now,stage:"validated",error:null,
    urls:[url],diagnostics:{
     parser:"ktc-resilient-"+extracted.parserMode,
     extraction_method:extracted.extractionMethod,
     raw_players:extracted.rawPlayers,embedded_players:extracted.embeddedPlayers,
     max_source_rank:MAX_SOURCE_RANK,
     excluded_draft_picks:extracted.excludedDraftPicks,
     excluded_non_offense:extracted.excludedNonOffense,
     valued_rows:extracted.valuedCount||rows.length,
     first_10:rows.slice(0,10),validation_result:true,
     attempts
    }
   };
  }catch(error){
   attempts.push({url,valid:false,error:String(error?.message||error)});
  }
 }
 return{
  source:"KTC",id:"ktc",status:"failed",valid:false,
  format:"dynasty-superflex",reducedWeight:true,
  players_extracted:0,ranking_rows:0,rankings:[],
  timestamp:now,stage:"extract",
  error:"KTC dynasty Superflex rankings could not be validated; previous verified consensus must be retained",
  urls:[KTC_URL,KTC_FALLBACK_URL],diagnostics:{attempts,validation_result:false}
 };
}
