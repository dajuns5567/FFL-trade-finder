const token=process.env.NETLIFY_AUTH_TOKEN||process.env.NETLIFY_BLOBS_TOKEN||'';
const repository=String(process.env.GITHUB_REPOSITORY||'dajuns5567/FFL-trade-finder').toLowerCase();
const targetSha=String(process.env.GITHUB_SHA||'').trim();
const branch=String(process.env.VALUE_HISTORY_DEPLOY_BRANCH||'main').trim()||'main';
const api='https://api.netlify.com/api/v1';

if(!token)throw new Error('NETLIFY_AUTH_TOKEN or NETLIFY_BLOBS_TOKEN is required to resolve the active Netlify site');

const headers={authorization:`Bearer ${token}`,accept:'application/json','user-agent':'Fleeced-Value-History-Site-Resolver/1.0'};

async function netlify(path){
  const r=await fetch(`${api}${path}`,{headers,cache:'no-store'});
  if(!r.ok)throw new Error(`Netlify ${r.status}: ${await r.text()}`);
  return r.json();
}

function normRepo(s){
  return String(s||'').toLowerCase().replace(/^git\+/, '').replace(/\.git$/,'').replace(/^https?:\/\/github\.com\//,'').replace(/^git@github\.com:/,'').replace(/^github\.com\//,'').replace(/^\/+|\/+$/g,'');
}
function siteMatchesRepo(site){
  const candidates=[site?.build_settings?.repo_url,site?.build_settings?.repo_path,site?.repo?.repo_path,site?.repo?.repo_url];
  return candidates.some(x=>normRepo(x)===repository);
}
function deployTime(d){return new Date(d?.published_at||d?.updated_at||d?.created_at||0).getTime()||0}
function siteUrl(site,deploy){
  const raw=site?.ssl_url||site?.url||deploy?.ssl_url||deploy?.url||'';
  if(!raw)throw new Error(`Resolved Netlify site ${site?.id||'unknown'} has no URL`);
  return raw.replace(/\/$/,'')+'/';
}

const sites=[];
for(let page=1;page<=20;page++){
  const batch=await netlify(`/sites?per_page=100&page=${page}`);
  if(!Array.isArray(batch)||!batch.length)break;
  sites.push(...batch);
  if(batch.length<100)break;
}
const candidates=sites.filter(siteMatchesRepo);
if(!candidates.length)throw new Error(`No Netlify sites accessible to this token are linked to ${repository}`);

const deployRows=[];
for(const site of candidates){
  let deploys=[];
  try{deploys=await netlify(`/sites/${encodeURIComponent(site.id)}/deploys?per_page=100`)}catch(e){console.warn(`Could not inspect deploys for ${site.id}:`,String(e?.message||e));continue}
  for(const d of Array.isArray(deploys)?deploys:[]){
    if(String(d?.state||'').toLowerCase()!=='ready')continue;
    if(String(d?.context||'').toLowerCase()!=='production')continue;
    if(String(d?.branch||'')!==branch)continue;
    deployRows.push({site,deploy:d,exact:!!targetSha&&String(d?.commit_ref||d?.commit_ref_full||'')===targetSha,time:deployTime(d)});
  }
}
if(!deployRows.length)throw new Error(`No ready production Netlify deploys for ${repository} on branch ${branch}`);

deployRows.sort((a,b)=>(Number(b.exact)-Number(a.exact))||(b.time-a.time));
const chosen=deployRows[0],url=siteUrl(chosen.site,chosen.deploy),siteId=String(chosen.site.id);
const result={ok:true,repository,branch,target_sha:targetSha||null,matched_target_sha:chosen.exact,site_id:siteId,site_name:chosen.site.name||null,site_url:url,deploy_id:chosen.deploy.id||null,deploy_commit_ref:chosen.deploy.commit_ref||null,deploy_published_at:chosen.deploy.published_at||chosen.deploy.updated_at||chosen.deploy.created_at||null};
console.log(JSON.stringify(result,null,2));
if(process.env.GITHUB_OUTPUT){
  const fs=await import('node:fs');
  fs.appendFileSync(process.env.GITHUB_OUTPUT,`site_id=${siteId}\nsite_url=${url}\ndeploy_id=${String(chosen.deploy.id||'')}\nmatched_target_sha=${chosen.exact?'true':'false'}\n`);
}
