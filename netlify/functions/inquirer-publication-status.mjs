import {getStore} from '@netlify/blobs';

// Internal diagnostics only. Never expose staged manuscripts or credentials.
export default async function inquirerPublicationStatus(req){
 const expected=globalThis.Netlify?.env?.get('FLEECED_INQUIRER_QUEUE_KEY')||process.env.FLEECED_INQUIRER_QUEUE_KEY||'';
 if(req.method!=='GET'||!expected||req.headers.get('x-fleeced-queue-key')!==expected)
  return new Response('Forbidden',{status:403});
 const s=getStore('fleeced-league-hub',{consistency:'strong'});
 const [stage,idx,edition,managerCache,status]=await Promise.all([
  s.get('inquirer/editorial-staging/2026/week-05.json',{type:'json'}).catch(()=>null),
  s.get('broadcasts/index.json',{type:'json'}).catch(()=>[]),
  s.get('broadcasts/2026/week-05.json',{type:'json'}).catch(()=>null),
  s.get('managers/history-cache.json',{type:'json'}).catch(()=>null),
  s.get('inquirer/publication-status.json',{type:'json'}).catch(()=>null)
 ]);
 const response={
  schema_version:1,season:2026,week:5,
  published:edition?.available===true&&Array.isArray(edition?.teams)&&edition.teams.length===32,
  indexed:Array.isArray(idx)&&idx.some(x=>Number(x.season)===2026&&Number(x.week)===5),
  team_count:edition?.teams?.length||0,
  manager_cache_present:!!managerCache?.career?.length,
  stage_present:!!stage,
  stage_generated_at:stage?.generated_at||null,
  stage_audit_ok:stage?.audit?.ok??null,
  stage_quality_ok:stage?.generation_quality?.ok??null,
  stage_issue_count:(stage?.audit?.issues?.length||0)+(stage?.generation_quality?.issues?.length||0),
  stage_issue_codes:[...(stage?.audit?.issues||[]),...(stage?.generation_quality?.issues||[])].slice(0,20).map(x=>typeof x==='string'?x:String(x?.code||x?.reason||'issue')),
  worker_status:status||null
 };
 return new Response(JSON.stringify(response),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}
