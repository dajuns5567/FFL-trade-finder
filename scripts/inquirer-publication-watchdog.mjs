import {pathToFileURL} from 'node:url';

const PUBLIC_HEALTH='https://precious-dango-fb4633.netlify.app/.netlify/functions/league-hub?publication_health=1';
const ISSUE_TITLE='[Inquirer watchdog] Published weekly edition missing or inconsistent';
const REPO='dajuns5567/FFL-trade-finder';

// Pure classifier: a successful scheduler request does not count as publication.
// Never flag a week that Sleeper still considers in progress, and give normal
// finalization time before escalating a healthy, merely pending background job.
export function classifyInquirerPublicationHealth(h,{now=new Date()}={}){
 if(!h||h.schema_version!==1)return{state:'alert',reason:'Publication health endpoint missing or unrecognized',target:null};
 const target=h.newest_nfl_completed_week_candidate||null;
 const latest=h.latest_public||null;
 const status=h.publisher||{};
 const key=target?target.season+'-'+String(target.week).padStart(2,'0'):null;
 if(!h.reader_verified)return{state:'alert',reason:'Latest indexed Inquirer is not fully reader-visible: '+(h.readback_failure||'unknown'),target:key};
 if(status.state==='editorial-hold'||status.state==='error')
  return{state:'alert',reason:'Automated publisher is in '+status.state+': '+(status.reason||'details unavailable'),target:key};
 if(status.state==='running'){
  const started=Date.parse(status.started_at||'');
  // Netlify background functions have a hard 15-minute budget. After a
  // larger grace period, a stuck or terminated worker is actionable.
  if(Number.isFinite(started)&&now.getTime()-started>25*60*1000)
   return{state:'alert',reason:'Background publishing has exceeded its expected completion window',target:key};
  return{state:'pending',reason:'Background publisher is running',target:key};
 }
 if(status.state==='completed'&&status.available===true&&latest&&
    Number(status.season)===Number(latest.season)&&Number(status.week)>Number(latest.week))
  return{state:'alert',reason:'Publication marked complete but the reader archive is behind',target:key};
 if(!target)return{state:'pending',reason:'Sleeper NFL week not available',target:null};
 if(h.caught_up_to_nfl_clock===true)return{state:'healthy',reason:'Latest finished NFL week is verified reader-visible',target:key};
 // The scheduler follows Sleeper's NFL week clock, which can advance before
 // all last-week data is finalized. Escalate a lasting lag Thursday onward.
 // Also escalate immediately if the publisher has explicitly failed.
 const day=now.getUTCDay(),hour=now.getUTCHours();
 const late=day===4&&hour>=12||day===5||day===6||day===0;
 if(late)return{state:'alert',reason:'Finished NFL week is absent from the verified public archive beyond the normal finalization window',target:key};
 return{state:'pending',reason:'Newly finished NFL week is awaiting normal finalization or background publication',target:key};
}

async function github(path,method='GET',body){
 const token=process.env.GITHUB_TOKEN;
 if(!token)throw Error('GITHUB_TOKEN required for durable Inquirer incident tracking');
 const res=await fetch('https://api.github.com/repos/'+REPO+path,{
  method,headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28','content-type':'application/json'},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)
 });
 if(!res.ok)throw Error('GitHub '+method+' '+path+' returned '+res.status);
 return res.json();
}
async function existingIncident(){
 const rows=await github('/issues?state=all&per_page=100');
 return rows.find(x=>!x.pull_request&&x.title===ISSUE_TITLE&&x.state==='open')||
  rows.find(x=>!x.pull_request&&x.title===ISSUE_TITLE)||null;
}
async function monitor(){
 let health;
 try{
  const response=await fetch(PUBLIC_HEALTH,{cache:'no-store',
   headers:{accept:'application/json'},signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  health=await response.json();
 }catch(error){
  health={schema_version:0,error:String(error?.message||error)};
 }
 const verdict=classifyInquirerPublicationHealth(health);
 const existing=await existingIncident();
 const details=[
  'This incident is maintained automatically by the Inquirer publication watchdog.',
  'Do not republish or overwrite an approved edition to clear this incident.',
  '',
  '**State:** '+verdict.state,
  '**Target:** '+(verdict.target||'unknown'),
  '**Reason:** '+verdict.reason,
  '**Latest verified archive:** '+(health?.latest_public?health.latest_public.season+' Week '+health.latest_public.week:'unavailable'),
  '**Publisher:** '+(health?.publisher?.state||'unavailable'),
  '**Checked (UTC):** '+new Date().toISOString(),
  '',
  'Only a complete locked edition, four reporter archives, recap and weekly awards',
  'may clear this incident. An HTTP 200 scheduler or HTTP 202 background queue is insufficient.'
 ].join('\n');
 if(verdict.state==='alert'){
  if(!existing||existing.state!=='open'){
   await github('/issues','POST',{title:ISSUE_TITLE,body:details});
   console.error('inquirer-watchdog-alert: opened publication incident',verdict);
  }else{
   const last=(existing.body||'').match(/\*\*Reason:\*\* (.*)/)?.[1]||'';
   const priorTarget=(existing.body||'').match(/\*\*Target:\*\* (.*)/)?.[1]||'';
   if(last!==verdict.reason||priorTarget!==(verdict.target||'unknown'))
    await github('/issues/'+existing.number,'PATCH',{body:details});
   console.error('inquirer-watchdog-alert: existing incident',verdict);
  }
  return;
 }
 if(verdict.state==='healthy'&&existing?.state==='open'){
  await github('/issues/'+existing.number,'PATCH',{state:'closed',body:details+'\n\nRecovered automatically; verified public edition visible.'});
  console.info('inquirer-watchdog-recovered',verdict);
 }else console.info('inquirer-watchdog-'+verdict.state,verdict);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 monitor().catch(err=>{console.error('inquirer-watchdog-failed',err);process.exitCode=1});
