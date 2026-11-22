// Durable, monotonic per-award, per-roster historical records.
// Never replace an actual first-observed timestamp with the timestamp of a
// later read or a losing score. Invalid/incomplete candidates cannot erase data.
export function validAwardHigh(row){
 const key=String(row?.award_key||''),roster=String(row?.roster_id||'');
 const score=row?.score==null?NaN:Number(row.score);
 return /^[a-z0-9-]+(?::[a-z0-9-]+)*$/.test(key)&&
   /^[1-9][0-9]*$/.test(roster)&&Number.isFinite(score)&&
   Math.abs(score)<1e8&&score!==-999999&&
   !/not enough data|unavailable|loading/i.test(String(row?.detail||''));
}
export function mergeAwardHighs(existing=[],observations=[],observedAt=new Date().toISOString()){
 if(!Number.isFinite(Date.parse(observedAt)))throw Error('Invalid award observation date');
 const byKey=new Map();
 const merge=(row,source)=>{
  if(!validAwardHigh(row))return;
  const key=String(row.award_key)+'|'+String(row.roster_id);
  const score=Number(row.score),current=byKey.get(key);
  if(current&&score<=current.score)return;
  const captured_at=source==='historical'&&Number.isFinite(Date.parse(row.captured_at))
   ?String(row.captured_at):String(row.captured_at&&Number.isFinite(Date.parse(row.captured_at))?
       row.captured_at:observedAt);
  byKey.set(key,{award_key:String(row.award_key),roster_id:String(row.roster_id),score,
   detail:String(row.detail||''),captured_at});
 };
 // Preserve the highest existing record independently of input order.
 for(const row of existing||[])merge(row,'historical');
 for(const row of observations||[])merge(row,'observation');
 return [...byKey.values()].sort((a,b)=>a.award_key.localeCompare(b.award_key)||
  Number(a.roster_id)-Number(b.roster_id));
}
export function highObservationsFromStandings(awards){
 if(!Array.isArray(awards))return[];
 const adjusted=new Set(['fleecer','fleeced','deal-maker','efficiency','big-swing',
  'trade-average','volume-wins','big-regret','balanced']);
 return awards.flatMap(award=>{
  const key=String(award?.key||'');
  const award_key=adjusted.has(key)?key+':trade-adjusted-v1':key;
  return (award?.standings||[]).map(r=>({
   award_key,roster_id:String(r?.roster_id||''),score:r?.score,detail:r?.detail
  })).filter(validAwardHigh);
 });
}
