const tokens=[process.env.NETLIFY_BLOBS_TOKEN,process.env.NETLIFY_AUTH_TOKEN].map(x=>String(x||'').trim()).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i);
const repository=String(process.env.GITHUB_REPOSITORY||'dajuns5567/FFL-trade-finder').toLowerCase();
const targetSha=String(process.env.GITHUB_SHA||'').trim();
const branch=String(process.env.VALUE_HISTORY_DEPLOY_BRANCH||'main').trim()||'main';
const api='https://api.netlify.com/api/v1';

if(!tokens.length)throw new Error('NETLIFY_AUTH_TOKEN or NETLIFY_BLOBS_TOKEN is required to resolve the active Netlify site');

let activeToken=null;
async function netlify(path){
  const candidates=activeToken?[activeToken,...tokens.filter(token=>token!==activeToken)]:tokens;
  let last=null;
  for(const token of candidates){
    const r=await fetch(`${api}${path}`,{headers:{authorization:`Bearer ${token}`,accept:'application/json','user-agent':'Fleeced-Value-History-Site-Resolver/1.0'},cache:'no-store'});
    if(r.ok){activeToken=token;return r.json()}
    const body=await r.text();
    last=new Error(`Netlify ${r.status}: ${body}`);
    if(r.status!==401&&r.status!==403)throw last;
  }
  throw last||new Error('Netlify site resolution failed');
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

const expectedSiteId=String(process.env.VALUE_HISTORY_PRODUCTION_SITE_ID||'').trim();
if(!expectedSiteId)throw new Error('ARCHIVE_SITE_GUARD: VALUE_HISTORY_PRODUCTION_SITE_ID is required');
const site=await netlify('/sites/'+encodeURIComponent(expectedSiteId));
const deploys=await netlify('/sites/'+encodeURIComponent(expectedSiteId)+'/deploys?per_page=100');
const {selectArchiveProductionSite}=await import('./select-archive-production-site.mjs');
const result=selectArchiveProductionSite([site],{[expectedSiteId]:deploys},{repository,branch,expectedSiteId,targetSha});
console.log(JSON.stringify(result,null,2));
if(process.env.GITHUB_OUTPUT){
 const fs=await import('node:fs');
 fs.appendFileSync(process.env.GITHUB_OUTPUT,`site_id=${result.site_id}\nsite_url=${result.site_url}\ndeploy_id=${result.deploy_id}\nmatched_target_sha=${result.matched_target_sha?'true':'false'}\n`);
}
