// Post-push acceptance: prove the public GitHub newspaper reader can fetch
// the exact SHA-256-bound issue that the unattended publisher just committed.
// This is intentionally read-only; verification cannot mutate the archive.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {githubPublishedInquirerIndex,githubPublishedInquirerEdition} from '../netlify/functions/lib/inquirer-github-published.mjs';

export async function verifyGithubInquirerReadback({
 archiveRoot,fetcher=fetch,attempts=9,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))
}={}){
 if(!archiveRoot)throw Error('GitHub archive checkout required for post-publication readback');
 const local=JSON.parse(await fs.readFile(path.join(archiveRoot,'forward/index.json'),'utf8'));
 if(local.schema_version!==1||!Array.isArray(local.reports))throw Error('Local published index invalid');
 const expected=local.reports.at(-1)||null;
 if(!expected)return{state:'no-forward-editions',verified:true};
 if(!/^[a-f0-9]{64}$/.test(String(expected.sha256||'')))throw Error('Missing expected digest');
 let failure=null;
 for(let attempt=1;attempt<=attempts;attempt++){
  try{
   // Bypass CDN/intermediary caches while retaining the actual public branch
   // and exact site reader contract. A fetcher can be injected for offline CI.
   const freshFetch=(url,options={})=>fetcher(url+(url.includes('?')?'&':'?')+
    'readback='+attempt+'-'+Date.now(),{...options,cache:'no-store'});
   const publicIndex=await githubPublishedInquirerIndex(freshFetch,{refresh:true});
   const entry=publicIndex.editions.get(Number(expected.week));
   if(!entry||entry.sha256!==expected.sha256)
    throw Error('Public reader index does not yet contain the committed digest for Week '+expected.week);
   const published=await githubPublishedInquirerEdition(expected.season,expected.week,freshFetch);
   if(!published||Number(published.week)!==Number(expected.week)||
      Number(published.season)!==Number(expected.season)||
      published.teams?.length!==32||published.published_locked!==true)
    throw Error('Published edition failed public reader acceptance');
   return{state:'readable',verified:true,season:Number(expected.season),
    week:Number(expected.week),sha256:expected.sha256,attempt};
  }catch(error){
   failure=error;
   if(attempt<attempts)await pause(15000);
  }
 }
 throw Error('GitHub-native Inquirer publication was not publicly readable after push: '+
  String(failure?.message||failure));
}

// Independently read the actual public site, not a mocked Netlify function.
 // The browser obtains these two exact endpoints, in this order.
export async function verifyLiveInquirerSite({archiveRoot,site='https://animated-dasik-3de74a.netlify.app',
 fetcher=fetch,attempts=5,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 if(!archiveRoot)throw Error('Local verified publication ledger required');
 const ledger=JSON.parse(await fs.readFile(path.join(archiveRoot,'forward/index.json'),'utf8'));
 const row=ledger.reports?.at(-1);
 if(!row)return{state:'no-forward-editions',verified:true};
 const raw=await fs.readFile(path.join(archiveRoot,row.path));
 const {createHash}=await import('node:crypto');
 if(createHash('sha256').update(raw).digest('hex')!==row.sha256)throw Error('Local edition digest mismatch');
 const expected=JSON.parse(raw.toString('utf8'));
 const signature=edition=>JSON.stringify({season:Number(edition?.season),week:Number(edition?.week),
  revision:Number(edition?.editorial_revision),generated:edition?.generated_at,
  recap:edition?.league_overview?.headline,
  teams:(edition?.teams||[]).map(t=>[String(t.roster_id),t.inquirer_article?.headline]).sort((a,b)=>a[0].localeCompare(b[0]))});
 let last;
 for(let attempt=1;attempt<=attempts;attempt++){
  try{
   const get=async query=>{
    const url=new URL('/.netlify/functions/league-hub',site);
    url.search=query+'&readback='+attempt+'-'+Date.now();
    const response=await fetcher(url.href,{cache:'no-store',headers:{accept:'application/json'},signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('Live site '+query+' HTTP '+response.status);
    return response.json();
   };
   const archive=await get('broadcast_archive=1');
   const rows=archive?.reports;
   if(!Array.isArray(rows))throw Error('Site archive unavailable');
   const latest=rows.slice().sort((a,b)=>Number(b.season)-Number(a.season)||Number(b.week)-Number(a.week))[0];
   if(Number(latest?.season)!==Number(row.season)||Number(latest?.week)!==Number(row.week))
    throw Error('Live site archive latest week differs from verified publication: expected '+row.week);
   const edition=await get('broadcast_season='+row.season+'&broadcast_week='+row.week);
   if(edition?.available!==true||edition?.published_locked!==true||edition?.teams?.length!==32||
     new Set(edition.teams.map(t=>String(t.roster_id))).size!==32||
     edition.teams.some(t=>!t.inquirer_article?.headline)||!edition.league_overview?.headline||
     signature(edition)!==signature(expected))throw Error('Live site does not display the exact verified edition identity');
   return{state:'site-visible',verified:true,site,season:Number(row.season),week:Number(row.week),teams:32,attempt};
  }catch(error){last=error;if(attempt<attempts)await pause(15000)}
 }
 throw Error('GitHub publication not verified on actual site: '+String(last?.message||last));
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const root=process.env.INQUIRER_GITHUB_ARCHIVE_ROOT||process.argv[2];
 verifyGithubInquirerReadback({archiveRoot:root}).then(async result=>{
  console.info('github-inquirer-post-push-readback',JSON.stringify(result));
  if(process.env.INQUIRER_VERIFY_LIVE_SITE==='1'){
   const live=await verifyLiveInquirerSite({archiveRoot:root});
   console.info('github-inquirer-live-site-readback',JSON.stringify(live));
  }
 }).catch(error=>{console.error(error);process.exitCode=1});
}
