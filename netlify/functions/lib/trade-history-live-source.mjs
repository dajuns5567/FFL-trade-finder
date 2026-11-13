// Completed trade history must never stop at the last GitHub Sleeper audit.
// Retain immutable historical audit rows and append confirmed live completions.
// No guessed trades, draft results, values, or overwrites of audited records.
const tradeIdentity=(tx,week)=>String(tx?.transaction_id||'').trim()||
  String(week)+'|'+String(tx?.created||'')+'|'+(Array.isArray(tx?.roster_ids)?tx.roster_ids.map(String).sort().join(','):'');
export function liveTradeWeekLimit(nflState,season){
 const current=Number(nflState?.season),week=Number(nflState?.week);
 return current===Number(season)&&Number.isInteger(week)&&week>=1?
  Math.min(18,week):18;
}
export function mergeCompletedTradeAuditWeeks(audited,live){
 const out={},keys=new Set([...Object.keys(audited||{}),...Object.keys(live||{})]);
 for(const week of keys){
  const byId=new Map();
  for(const tx of Array.isArray(audited?.[week])?audited[week]:[]){
   byId.set(tradeIdentity(tx,week),tx);
  }
  for(const tx of Array.isArray(live?.[week])?live[week]:[]){
   const id=tradeIdentity(tx,week),prior=byId.get(id);
   // A historical completed trade is immutable. A transaction that became
   // complete since the last audit should use its now-confirmed live record.
   if(!prior||prior?.status!=='complete'&&tx?.status==='complete')
    byId.set(id,{...tx,__live_trade:true});
  }
  out[week]=[...byId.values()];
 }
 return out;
}
