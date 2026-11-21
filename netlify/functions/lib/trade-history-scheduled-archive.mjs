// Independent, verified completed Sleeper trades for the scheduled refresh.
// This file is shared by the headless writer and read-only Netlify consumer.
// NEVER replace a previously verified trade or fabricate an absent week.
export const TRADE_HISTORY_ARCHIVE_SCHEMA=1;
export const TRADE_HISTORY_ARCHIVE_LEAGUE='1316867686394769408';

function strictWeek(value){
 const n=Number(value);
 return Number.isInteger(n)&&n>=1&&n<=18?n:null;
}
function cleanTrade(tx,week){
 if(tx?.type!=='trade'||tx?.status!=='complete')return null;
 const id=String(tx?.transaction_id||'').trim();
 const rosters=Array.isArray(tx?.roster_ids)?tx.roster_ids.map(Number):[];
 const timestamp=Number(tx?.status_updated||tx?.created);
 if(!id||!strictWeek(week)||rosters.length<2||rosters.length>32||
   rosters.some(n=>!Number.isInteger(n)||n<1||n>32)||
   new Set(rosters).size!==rosters.length||!Number.isFinite(timestamp)||timestamp<=0)
  throw Error('invalid completed Sleeper trade record (fail closed)');
 const adds=tx?.adds&&typeof tx.adds==='object'&&!Array.isArray(tx.adds)?
  Object.fromEntries(Object.entries(tx.adds).map(([pid,rid])=>[String(pid),Number(rid)])):{};
 if(Object.values(adds).some(n=>!rosters.includes(n)))
  throw Error('completed trade has unverified receiving roster');
 const draftPicks=(Array.isArray(tx?.draft_picks)?tx.draft_picks:[]).map(p=>{
  const season=Number(p?.season),round=Number(p?.round),owner=Number(p?.owner_id),original=Number(p?.roster_id);
  if(!Number.isInteger(season)||season<2020||season>2100||!Number.isInteger(round)||round<1||round>10||
     !rosters.includes(owner)||!Number.isInteger(original)||original<1||original>32)
   throw Error('incomplete completed-trade draft pick ownership');
  return{season:String(season),round,owner_id:owner,roster_id:original};
 });
 return{transaction_id:id,type:'trade',status:'complete',created:Number(tx.created)||timestamp,
  status_updated:timestamp,roster_ids:rosters,adds,draft_picks:draftPicks};
}
export function validateScheduledTradeArchive(raw,{leagueId=TRADE_HISTORY_ARCHIVE_LEAGUE,season}={}){
 if(!raw||raw.schema!==TRADE_HISTORY_ARCHIVE_SCHEMA||String(raw.league_id)!==String(leagueId)||
    !Number.isInteger(Number(raw.season))||
    (season!==undefined&&Number(raw.season)!==Number(season))||
    !strictWeek(raw.checked_through_week)||
    !Number.isFinite(Date.parse(String(raw.checked_at||'')))||
    !raw.transactions_by_week||typeof raw.transactions_by_week!=='object'||
    Array.isArray(raw.transactions_by_week))
  throw Error('invalid scheduled completed-trade archive metadata');
 const weeks={},ids=new Set();
 for(let week=1;week<=Number(raw.checked_through_week);week++){
  const rows=raw.transactions_by_week[String(week)];
  if(!Array.isArray(rows))throw Error('scheduled completed-trade archive missing week '+week);
  weeks[String(week)]=rows.map(row=>{
   const tx=cleanTrade(row,week);
   if(!tx)throw Error('non-completed trade in scheduled archive');
   const id=tx.transaction_id;
   if(ids.has(id))throw Error('duplicate completed trade in scheduled archive '+id);
   ids.add(id);
   return tx;
  });
 }
 for(const key of Object.keys(raw.transactions_by_week)){
  if(!strictWeek(key)||Number(key)>Number(raw.checked_through_week))
   throw Error('scheduled completed-trade archive contains future week');
 }
 return{schema:TRADE_HISTORY_ARCHIVE_SCHEMA,league_id:String(leagueId),
  season:Number(raw.season),checked_through_week:Number(raw.checked_through_week),
  checked_at:String(raw.checked_at),transactions_by_week:weeks};
}
export function mergeScheduledTradeArchive(existing,capture){
 if(!capture?.ok||!Array.isArray(capture.failed_weeks)||capture.failed_weeks.length)
  throw Error('refusing to archive incomplete Sleeper trade poll');
 const current=validateScheduledTradeArchive({
  schema:1,league_id:capture.league_id,season:capture.season,
  checked_through_week:capture.checked_through_week,checked_at:capture.checked_at,
  transactions_by_week:capture.transactions_by_week
 },{leagueId:TRADE_HISTORY_ARCHIVE_LEAGUE});
 const prior=existing?validateScheduledTradeArchive(existing,{season:current.season}):null;
 if(prior&&current.checked_through_week<prior.checked_through_week)
  throw Error('scheduled trade archive cannot roll back completed weeks');
 const merged={...current,transactions_by_week:{}};
 let added=0;
 const seen=new Set();
 for(let week=1;week<=current.checked_through_week;week++){
  const old=prior?.transactions_by_week[String(week)]||[];
  const next=current.transactions_by_week[String(week)]||[];
  const byId=new Map(old.map(x=>[x.transaction_id,x]));
  for(const tx of next){
   if(!byId.has(tx.transaction_id)){byId.set(tx.transaction_id,tx);added++}
  }
  for(const tx of byId.values()){
   if(seen.has(tx.transaction_id))throw Error('same trade found across multiple weeks');
   seen.add(tx.transaction_id);
  }
  merged.transactions_by_week[String(week)]=[...byId.values()].sort((a,b)=>
   a.status_updated-b.status_updated||a.transaction_id.localeCompare(b.transaction_id));
 }
 return{snapshot:merged,added,changed:!prior||added>0||
   prior.checked_through_week!==current.checked_through_week};
}
