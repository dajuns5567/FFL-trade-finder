// Read-only completed-trade verification during every scheduled Value History
// wake. This does not write snapshots or publish anything to production.
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {liveTradeWeekLimit} from '../netlify/functions/lib/trade-history-live-source.mjs';
const API='https://api.sleeper.app/v1';
const LEAGUE='1316867686394769408';
async function json(url,fetchImpl){
  const response=await fetchImpl(url,{cache:'no-store',headers:{accept:'application/json','user-agent':'Fleeced-Scheduled-Completed-Trades/1.0'}});
  if(!response.ok)throw Error('Sleeper API returned '+response.status+' for '+url.split('/').slice(-2).join('/'));
  return response.json();
}
export async function checkScheduledCompletedTrades({fetchImpl=fetch,leagueId=LEAGUE}={}){
  const id=String(leagueId);
  if(!/^\d{10,22}$/.test(id))throw Error('invalid Sleeper league ID');
  const [league,clock]=await Promise.all([
    json(API+'/league/'+id,fetchImpl),
    json(API+'/state/nfl',fetchImpl).catch(()=>null)
  ]);
  const season=Number(league?.season),through=liveTradeWeekLimit(clock,season);
  if(!Number.isInteger(season)||season<2024||through<1||through>18)throw Error('invalid Sleeper league season or week');
  const completed=new Map(),failedWeeks=[];
  // Limit concurrency to six weekly calls to avoid stampeding Sleeper.
  for(let start=1;start<=through;start+=6){
    const indices=Array.from({length:Math.min(6,through-start+1)},(_,i)=>start+i);
    const settled=await Promise.allSettled(indices.map(week=>json(API+'/league/'+id+'/transactions/'+week,fetchImpl)));
    for(let i=0;i<indices.length;i++){
      const week=indices[i],answer=settled[i];
      if(answer.status!=='fulfilled'||!Array.isArray(answer.value)){failedWeeks.push(week);continue}
      for(const tx of answer.value){
        if(tx?.type!=='trade'||tx?.status!=='complete')continue;
        const key=String(tx.transaction_id||week+'|'+tx.created+'|'+(tx.roster_ids||[]).join(','));
        if(!completed.has(key))completed.set(key,{
          id:key,week,created:Number(tx.status_updated||tx.created)||0,
          roster_ids:Array.isArray(tx.roster_ids)?tx.roster_ids.map(Number):[]
        });
      }
    }
  }
  const result={ok:failedWeeks.length===0,source:'sleeper-live-transactions',
    league_id:id,season,checked_through_week:through,failed_weeks:failedWeeks,
    completed_trade_count:completed.size,latest_completed_trade:[...completed.values()]
      .sort((a,b)=>b.created-a.created)[0]||null,checked_at:new Date().toISOString()};
  if(failedWeeks.length)throw Error('Scheduled completed-trade poll incomplete: '+JSON.stringify(result));
  return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  checkScheduledCompletedTrades().then(result=>{
    console.log(JSON.stringify({event:'scheduled-completed-trade-check',...result},null,2));
  }).catch(error=>{
    console.error('Scheduled completed-trade verification failed:',String(error?.stack||error));
    process.exitCode=1;
  });
}
