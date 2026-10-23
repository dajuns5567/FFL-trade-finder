// Read-only after-import verifier for the single canonical Week5 edition.
// No writes, repair-on-read, network, approval generation or deployment.
import {editorialCopyDigest} from '../netlify/functions/inquirer-publication-guard.mjs';
import {inspectCanonicalArchive} from '../netlify/functions/lib/inquirer-legacy-history.mjs';
import {hasCompleteWeekFeaturePackage,hasCompleteManagerSpotlightCache} from '../netlify/functions/inquirer-publish-background.mjs';
import {WEEK5_RELEASE_KEY} from './inquirer-week5-release-authorization.mjs';
export async function inspectWeek5Readback(store,expectedDigest){
 const failures=[];
 if(!store||typeof store.get!=='function')throw new Error('An explicit read-only storage adapter is required');
 const read=async key=>{
  try{return await store.get(key,{type:'json'})}
  catch(error){failures.push('storage-unavailable:'+key);return null}
 };
 const edition=await read(WEEK5_RELEASE_KEY);
 if(!inspectCanonicalArchive(edition,2026,5).ok)
  failures.push('canonical-edition-not-verified');
 const digest=editorialCopyDigest(edition);
 if(!expectedDigest||digest!==expectedDigest)
  failures.push('approved-editorial-digest-does-not-match-stored-copy');
 const index=await read('broadcasts/index.json');
 if(!Array.isArray(index)||!index.some(x=>Number(x?.season)===2026&&Number(x?.week)===5&&x?.key===WEEK5_RELEASE_KEY))
  failures.push('canonical-broadcast-index-incomplete');
 const overview=await read('inquirer/league-overview/2026/week-05.json');
 if(!overview||!edition?.league_overview||Object.entries(edition.league_overview).some(
   ([key,value])=>JSON.stringify(overview[key])!==JSON.stringify(value)))
  failures.push('recap-is-not-exact-approved-copy');
 const reporters=edition?.reporters||[];
 if(reporters.length!==4)failures.push('reporter-directory-incomplete');
 for(const reporter of reporters){
  const rid=String(reporter.id),listed=await read('inquirer/reporters/'+rid+'/index.json');
  const members=(edition?.teams||[]).filter(t=>t?.inquirer_article?.reporter?.id===rid);
  if(members.length!==8)failures.push('reporter-distribution-mismatch:'+rid);
  if(!Array.isArray(listed?.articles))failures.push('reporter-index-missing:'+rid);
  for(const t of members){
   const key='inquirer/reporters/'+rid+'/articles/2026/week-05-roster-'+String(t.roster_id).padStart(2,'0')+'.json';
   if(!listed?.articles?.some(a=>Number(a.season)===2026&&Number(a.week)===5&&
     String(a.roster_id)===String(t.roster_id)&&a.article_key===key))
    failures.push('reporter-index-entry-missing:'+rid+':'+t.roster_id);
   const saved=await read(key);
   if(!saved||Object.entries(t.inquirer_article||{}).some(
     ([field,value])=>JSON.stringify(saved[field])!==JSON.stringify(value)))
    failures.push('reporter-article-does-not-match:'+rid+':'+t.roster_id);
  }
 }
 const awards=await read('awards/weekly.json');
 if(!hasCompleteWeekFeaturePackage(edition,awards))
  failures.push('weekly-awards-or-badges-incomplete');
 const spotlight=await read('managers/history-cache.json');
 if(!hasCompleteManagerSpotlightCache(edition,spotlight))
  failures.push('manager-spotlight-cache-incomplete');
 return{ok:failures.length===0,failures,week:5,season:2026,approved_digest:expectedDigest,
  stored_digest:digest,checked_reporter_articles:(edition?.teams||[]).length,
  writes_performed:0};
}
