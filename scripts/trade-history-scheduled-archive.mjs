// Scheduled main-only persist of complete Sleeper trades to GitHub's existing
// value-history-data branch. Writes ONLY trade-history/<season>/latest.json.
// It does not mutate valuation snapshots, audited transactions, or production.
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {checkScheduledCompletedTrades} from './trade-history-scheduled-check.mjs';
import {mergeScheduledTradeArchive} from '../netlify/functions/lib/trade-history-scheduled-archive.mjs';

const REPO='dajuns5567/FFL-trade-finder',DATA_BRANCH='value-history-data';
export async function archiveScheduledCompletedTrades({
 fetchImpl=fetch,token=process.env.GITHUB_TOKEN,
 repository=process.env.GITHUB_REPOSITORY,ref=process.env.GITHUB_REF
}={}){
 if(repository!==REPO||ref!=='refs/heads/main'||!token)
  throw Error('trade archival requires authorized main job and GitHub token');
 const current=await checkScheduledCompletedTrades({fetchImpl,includeTransactions:true});
 if(!current.ok||current.failed_weeks?.length)throw Error('incomplete scheduled Sleeper poll');
 const path='trade-history/'+current.season+'/latest.json';
 const url='https://api.github.com/repos/'+REPO+'/contents/'+path;
 const headers={authorization:'Bearer '+token,accept:'application/vnd.github+json',
  'user-agent':'FFL-Scheduled-TradeArchive/1.0','x-github-api-version':'2022-11-28'};
 const get=await fetchImpl(url+'?ref='+DATA_BRANCH,{headers,cache:'no-store'});
 let prior=null,sha=null;
 if(get.status===200){
  const item=await get.json();
  if(!item||typeof item.content!=='string'||!item.sha)throw Error('malformed stored trade archive');
  sha=item.sha;
  prior=JSON.parse(Buffer.from(item.content.replace(/\s/g,''),'base64').toString('utf8'));
 }else if(get.status!==404)throw Error('trade archive GitHub read failed '+get.status);
 const merged=mergeScheduledTradeArchive(prior,current);
 if(!merged.changed){
  const count=Object.values(merged.snapshot.transactions_by_week).reduce((n,week)=>n+week.length,0);
  return{ok:true,changed:false,added:0,trade_count:count,checked_through_week:current.checked_through_week};
 }
 const bytes=Buffer.from(JSON.stringify(merged.snapshot,null,2)+'\n','utf8');
 const payload={message:'Archive verified completed Sleeper trades through week '+current.checked_through_week,
  branch:DATA_BRANCH,content:bytes.toString('base64'),...(sha?{sha}:{})};
 const put=await fetchImpl(url,{method:'PUT',headers:{...headers,'content-type':'application/json'},
  body:JSON.stringify(payload)});
 if(!put.ok)throw Error('trade archive GitHub write failed '+put.status);
 const saved=await put.json();
 if(!saved?.commit?.sha)throw Error('trade archive save missing commit confirmation');
 const count=Object.values(merged.snapshot.transactions_by_week).reduce((n,week)=>n+week.length,0);
 return{ok:true,changed:true,added:merged.added,trade_count:count,
  checked_through_week:current.checked_through_week,archive_commit:saved.commit.sha};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 archiveScheduledCompletedTrades().then(result=>{
  console.log(JSON.stringify({event:'scheduled-completed-trades-durable-archive',...result},null,2));
 }).catch(e=>{
  console.error('Scheduled trade archival failed:',String(e?.stack||e));
  process.exitCode=1;
 });
}
