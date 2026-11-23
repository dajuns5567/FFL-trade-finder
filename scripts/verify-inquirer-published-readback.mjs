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

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const root=process.env.INQUIRER_GITHUB_ARCHIVE_ROOT||process.argv[2];
 verifyGithubInquirerReadback({archiveRoot:root}).then(result=>
  console.info('github-inquirer-post-push-readback',JSON.stringify(result))
 ).catch(error=>{console.error(error);process.exitCode=1});
}
