// Merge a verified completed week's Sleeper stats and immutable weekly archive.
// Never replace fresh Sleeper rows with older historical rows, but retain
// archived player IDs missing from the latest partial live response.
export function mergeCompletedWeeklyAwardStats(live,archived){
 const rows=new Map();
 const add=(payload,liveSource)=>{
  const entries=Array.isArray(payload)?payload.map((row,i)=>[String(row?.player_id||row?.id||i),row]):
   Object.entries(payload||{});
  for(const [key,raw] of entries){
   const id=String(raw?.player_id||raw?.id||key),stats=raw?.stats&&typeof raw.stats==='object'?raw.stats:raw;
   if(!id||!stats||typeof stats!=='object'||!Object.keys(stats).length)continue;
   // A partial live row must not wipe an archived scorer with empty fields.
   if(liveSource||!rows.has(id))rows.set(id,stats);
  }
 };
 add(archived,false);
 add(live,true);
 return Object.fromEntries(rows);
}
