// Disposable archive checkout only; no write credentials, git push, or deployment.
import fs from 'node:fs/promises';
import path from 'node:path';
import {runGithubInquirerPublisher,verifyForwardPublicationLedger,inquirerPublicationPlan} from './publish-inquirer-github-native.mjs';
import {githubPublishedInquirerIndex,githubPublishedInquirerEdition} from '../netlify/functions/lib/inquirer-github-published.mjs';
import {verifyDeployedInquirerCompatibility} from './verify-deployed-inquirer-compatibility.mjs';
const root=path.resolve(process.env.INQUIRER_GITHUB_ARCHIVE_ROOT||'../history/inquirer-archive');
const indexFile=path.join(root,'forward/index.json');
const readIndex=()=>fs.readFile(indexFile,'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return{schema_version:1,reports:[]};throw e});
let result;
try{
 const before=await readIndex();
 result=await runGithubInquirerPublisher({archiveRoot:root});
 console.log('INQUIRER_SHADOW_RESULT '+JSON.stringify(result));
 if(!['completed','up-to-date'].includes(result.state))throw Error('Shadow cannot certify publication: '+JSON.stringify(result));
 const after=await readIndex();
 await verifyForwardPublicationLedger(after,root);
 for(const row of before.reports){if(!after.reports.some(x=>JSON.stringify(x)===JSON.stringify(row)))throw Error('Existing published entry changed')}
 if(result.state==='completed'&&after.reports.length!==before.reports.length+1)throw Error('Exactly one new completed edition must be staged');
 const localFetch=async url=>{
  const file='forward/'+url.split('/forward/').at(-1).split('?')[0];
  if(!/^forward\/(index\.json|2026\/week-\d{2}\.json)$/.test(file))throw Error('Unexpected reader path '+file);
  try{return new Response(await fs.readFile(path.join(root,file)),{status:200})}
  catch(e){if(e.code==='ENOENT')return new Response('',{status:404});throw e}
 };
 const index=await githubPublishedInquirerIndex(localFetch,{refresh:true});
 const latest=index.reports.slice().sort((a,b)=>b.season-a.season||b.week-a.week)[0];
 if(!latest)throw Error('No edition independently readable');
 const edition=await githubPublishedInquirerEdition(latest.season,latest.week,localFetch);
 if(!edition||edition.teams.length!==32||!edition.league_overview?.headline)throw Error('Reader rejected staged edition');
 if(result.state==='completed'&&latest.week!==result.week)throw Error('Reader did not advance to candidate week');
 if(result.state==='completed'){
  const nextClock=latest.week+1;
  // This second invocation uses only a fixed, explicitly simulated clock.
  // It must return before any matchup or valuation source is fetched.
  const sameClock=async url=>{
   if(url.endsWith('/state/nfl'))return new Response(JSON.stringify({season:latest.season,week:nextClock}));
   if(/\/league\/1316867686394769408$/.test(url))return new Response(JSON.stringify({season:String(latest.season)}));
   throw Error('Idempotent publication unexpectedly read '+url);
  };
  const replay=await runGithubInquirerPublisher({archiveRoot:root,fetcher:sameClock});
  if(replay.state!=='up-to-date'||replay.through_week!==latest.week||JSON.stringify(await readIndex())!==JSON.stringify(after))throw Error('Same-week scheduled replay did not preserve archive');
  const future=inquirerPublicationPlan({season:latest.season,current:Math.min(18,nextClock+1),index:after});
  if(latest.week<17&&(future.state!=='due'||future.week!==latest.week+1))throw Error('Next-week scheduled progression failed');
  result={...result,same_week_replay_verified:true,next_week_eligible_on_clock_advance:latest.week<17?future.week:null};
 }
 if(process.env.INQUIRER_DEPLOYED_SOURCE_ROOT){
  const compatibility=await verifyDeployedInquirerCompatibility({deployedRoot:process.env.INQUIRER_DEPLOYED_SOURCE_ROOT,localFetch,expectedWeek:latest.week,expectedSeason:latest.season});
  result={...result,...compatibility};
 }
 result={...result,reader_verified:true,visible_week:latest.week,teams:edition.teams.length,editorial_revision:edition.editorial_revision,previous_issues_preserved:true};
 console.log('INQUIRER_SHADOW_ACCEPTED '+JSON.stringify(result));
}catch(error){result={...result,reader_verified:false,error:String(error?.stack||error)};console.error(result.error);process.exitCode=1}
finally{await fs.mkdir('.tmp',{recursive:true});await fs.writeFile('.tmp/inquirer-shadow-result.json',JSON.stringify(result,null,2)+'\n')}
