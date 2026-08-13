const PLAYERS_URL="https://www.fanranked.com/api/players?mode=football_dynasty_sf";
const MARKET_URL="https://www.fanranked.com/api/football/market-values?format=superflex";
const SOURCE_URL="https://www.fanranked.com/football/dynasty-rankings";
const TIMEOUT_MS=7000;
const MAX_PLAYERS=300;
const OFFENSE_POSITIONS=new Set(["QB","RB","WR","TE"]);

async function fetchJson(url,fetchImpl=fetch){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const res=await fetchImpl(url,{headers:{
      "user-agent":"Mozilla/5.0 (compatible; FFL-TradeFinder/16.0; +https://netlify.com)",
      "accept":"application/json,text/plain,*/*;q=0.8"
    },redirect:"follow",signal:controller.signal});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }finally{clearTimeout(timer)}
}

function isOffensePlayer(player){
  const positions=Array.isArray(player?.positions)?player.positions:[];
  return positions.some(position=>OFFENSE_POSITIONS.has(String(position||"").toUpperCase()));
}

export function buildFanRankedMarketRows(playersPayload,marketPayload){
  const players=Array.isArray(playersPayload)?playersPayload:[];
  const values=Array.isArray(marketPayload?.values)?marketPayload.values:[];
  const byId=new Map(players.map(player=>[String(player?.id||""),player]));
  const rows=[];
  for(const entry of values){
    const playerId=String(entry?.playerId||"");
    const rank=Number(entry?.rank);
    if(!playerId||playerId.startsWith("pick:")||!Number.isFinite(rank)||rank<1||rank>MAX_PLAYERS)continue;
    const player=byId.get(playerId);
    if(!player||!isOffensePlayer(player))continue;
    const name=String(player?.name||"").trim();
    if(!name)continue;
    rows.push({rank,player:name});
  }
  rows.sort((a,b)=>a.rank-b.rank||a.player.localeCompare(b.player));
  return rows;
}

export async function refreshFanRanked(opts={}){
  const now=new Date().toISOString();
  const fetchImpl=opts.fetchImpl||fetch;
  try{
    const [playersPayload,marketPayload]=await Promise.all([
      fetchJson(PLAYERS_URL,fetchImpl),
      fetchJson(MARKET_URL,fetchImpl)
    ]);
    const rows=buildFanRankedMarketRows(playersPayload,marketPayload);
    const uniqueNames=new Set(rows.map(row=>row.player.toLowerCase())).size;
    const ranks=rows.map(row=>row.rank);
    const duplicateRanks=[...new Set(ranks.filter((rank,index)=>ranks.indexOf(rank)!==index))];
    const missingRanks=[];
    if(ranks.length){
      const max=Math.min(MAX_PLAYERS,Math.max(...ranks));
      const rankSet=new Set(ranks);
      for(let rank=1;rank<=max;rank++)if(!rankSet.has(rank))missingRanks.push(rank);
    }
    const valid=rows.length>=200&&duplicateRanks.length===0&&missingRanks.length===0;
    const error=valid?null:
      duplicateRanks.length?`Duplicate market ranks detected: ${duplicateRanks.slice(0,10).join(", ")}`:
      missingRanks.length?`Market ranking sequence is not contiguous; missing ranks: ${missingRanks.slice(0,10).join(", ")}`:
      `Only ${rows.length} validated FanRanked market rows were extracted`;
    return {
      source:"FanRanked",
      id:"fanranked",
      status:valid?"refreshed":"failed",
      valid,
      format:"dynasty-superflex-ppr-market",
      reducedWeight:false,
      players_extracted:uniqueNames,
      ranking_rows:rows.length,
      rankings:rows,
      timestamp:now,
      stage:valid?"validated":"extract",
      error,
      urls:[SOURCE_URL],
      diagnostics:{
        players_url:PLAYERS_URL,
        market_url:MARKET_URL,
        ranking_field:"market rank",
        ignored_field:"consensusRank",
        max_players:MAX_PLAYERS,
        unique_players_extracted:uniqueNames,
        duplicate_ranks:duplicateRanks,
        missing_ranks:missingRanks,
        first_10:rows.slice(0,10),
        validation_result:valid
      }
    };
  }catch(error){
    return {
      source:"FanRanked",id:"fanranked",status:"failed",valid:false,
      format:"dynasty-superflex-ppr-market",reducedWeight:false,
      players_extracted:0,ranking_rows:0,rankings:[],timestamp:now,
      stage:"fetch",error:String(error?.message||error),urls:[SOURCE_URL],
      diagnostics:{players_url:PLAYERS_URL,market_url:MARKET_URL,ranking_field:"market rank",ignored_field:"consensusRank",max_players:MAX_PLAYERS,validation_result:false}
    };
  }
}
