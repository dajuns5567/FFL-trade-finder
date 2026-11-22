// Read-only cross-site release contract. A new PR cannot silently select an
// older static runtime or sever a completed-week refresh/read path.
// Intentionally validates SOURCES, not guesses at dynamic player valuations.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export const CRITICAL_ASSETS=[
 'sleeper-history-client-v22.js',
 'trade-value-normalization-v139.js',
 'draft-pick-rankings-v527.js',
 'modeled-player-values-v319.js',
 'ui-player-values-v139.js',
 'ui-runtime-values-v140.js',
 'trade-select-all-v165.js',
 'trade-selection-sync-v534.js',
 // Targeted acquisition modules must be tracked independently of the compiled Finder.
 // PR #585 restores their combination; a later release cannot silently roll back one.
 'trade-specific-blank-router-v325.js',
 'trade-specific-max-tier-add-v300.js',
 'trade-specific-tier-up-v282.js',
 'trade-specific-add-assets-v282.js',
 'trade-specific-max-value-v279.js',
 'trade-specific-player-v232.js',
 'trade-finder-v256-compiled.js',
 'trade-runtime-v256-compiled.js',
 'trade-evaluator-any-team-v184.js',
 'trade-recommended-pick-ownership-v301.js',
 'value-history-v276.js',
 'league-hub-v451.js'
];
const must=(condition,reason)=>{if(!condition)throw new Error(reason)};
const read=(root,filename)=>fs.readFileSync(path.join(root,filename),'utf8');
const distinct=a=>new Set(a).size===a.length;
const numbered=(v)=>/^\d+$/.test(String(v??''))?Number(v):null;
export function injectedScripts(text){
 return [...String(text).matchAll(/<script\b[^>]*\bsrc=(["'])([^"']+)\1[^>]*>/gi)]
  .map(m=>{const [pathname,query='']=m[2].split('?');
    return{pathname,version:new URLSearchParams(query).get('v')||'',url:m[2]}})
  .filter(x=>x.pathname.startsWith('/'));
}
export function compareVersionAssets(before,after,{critical=CRITICAL_ASSETS}={}){
 const old=injectedScripts(before),fresh=injectedScripts(after);
 must(distinct(fresh.map(x=>x.pathname)),'Duplicate site script paths can overwrite newer runtime');
 const oldMap=new Map(old.map(x=>[x.pathname,x]));
 const newMap=new Map(fresh.map(x=>[x.pathname,x]));
 for(const filename of critical){
  const oldRow=old.find(x=>path.posix.basename(x.pathname)===filename);
  const newRow=fresh.find(x=>path.posix.basename(x.pathname)===filename);
  must(newRow,'Critical site subsystem removed or silently replaced: '+filename);
  if(oldRow){
   const prev=numbered(oldRow.version),next=numbered(newRow.version);
   if(prev!==null&&next!==null)
    must(next>=prev,'Site asset version rolled backward: '+filename+' ('+prev+' -> '+next+')');
   must(!(prev!==null&&next===null),'Site asset cache version erased: '+filename);
  }
 }
 for(const [pathname,oldRow] of oldMap){
  const next=newMap.get(pathname);
  if(!next)continue;
  const prevN=numbered(oldRow.version),nextN=numbered(next.version);
  if(prevN!==null&&nextN!==null)
   must(nextN>=prevN,'Runtime script reverted to older cache key: '+pathname);
 }
 const src=JSON.stringify(fresh);
 // Targeted Finder routing relies on the exact installed module order.
 // The complementary outgoing-asset helper is introduced only by the isolated
 // Finder restoration; once present it must load before targeted engines.
 const orderedFinder=[
  'trade-specific-blank-router-v325.js',
  'trade-specific-max-tier-add-v300.js',
  'trade-specific-tier-up-v282.js',
  'trade-specific-add-assets-v282.js',
  'trade-specific-max-value-v279.js',
  'trade-specific-player-v232.js',
  'trade-finder-v256-compiled.js'
 ];
 const positions=orderedFinder.map(filename=>fresh.findIndex(x=>path.posix.basename(x.pathname)===filename));
 must(positions.every(x=>x>=0),'Targeted Finder router or search module removed');
 must(positions.every((x,i)=>i===0||x>positions[i-1]),'Targeted Finder runtime load order changed');
 const complement=fresh.findIndex(x=>path.posix.basename(x.pathname)==='trade-add-assets-complement-v1.js');
 if(complement>=0)must(complement>positions[0]&&complement<positions[1],
  'Finder complementary-asset helper must load before targeted search engines');
 must(src.indexOf('trade-value-normalization-v139.js')<src.indexOf('trade-finder-v256-compiled.js'),
  'Canonical valuations must initialize before Trade Finder');
 must(src.indexOf('modeled-player-values-v319.js')<src.indexOf('value-history-v276.js'),
  'Canonical player values must initialize before market and value history');
 return{scripts:fresh.length,critical:critical.length,versions_checked:[...oldMap.keys()].filter(x=>newMap.has(x)).length};
}
// A changed asset with the old ?v= key can leave a user's browser on the
// previous JavaScript indefinitely even though GitHub and Netlify are green.
// Compare the actual file bytes against the PR base; no arbitrary timestamps.
export function verifyCacheKeysForChangedAssets(beforeHtml,afterHtml,changed,{critical=CRITICAL_ASSETS}={}){
 const prior=new Map(injectedScripts(beforeHtml).map(x=>[x.pathname,x]));
 const next=new Map(injectedScripts(afterHtml).map(x=>[x.pathname,x]));
 const bumped=[];
 for(const filename of critical){
  const pathname='/'+filename,old=prior.get(pathname),now=next.get(pathname);
  if(!old||!now||!changed(filename))continue;
  const oldVersion=numbered(old.version),newVersion=numbered(now.version);
  must(oldVersion!==null&&newVersion!==null&&newVersion>oldVersion,
   'Changed critical script served with stale cache key: '+filename+
   ' ('+old.version+' -> '+now.version+')');
  bumped.push({filename,from:oldVersion,to:newVersion});
 }
 return bumped;
}
export function checkRuntimeContracts(sources){
 const {toml,site,hub,history,news,publisher}=sources;
 must(/from\s*=\s*"\/"/.test(toml)&&/to\s*=\s*"\/\.netlify\/functions\/site-v29"/.test(toml),
  'Root route no longer serves canonical V29 runtime');
 must(/cache-control['"]?\s*:\s*['"]no-store/.test(site),'Site entry response lost no-store');
 must(/league_latest=1/.test(hub),'League Hub lost independent completed-week Sleeper refresh');
 must(/broadcast_archive=1/.test(hub),'League Hub lost Inquirer publication index polling');
 must(/setInterval\(refreshPublishedInquirerIfAdvanced,\s*60000\)/.test(hub),
  'New Inquirer edition is not polled while site remains open');
 must(/setInterval\(refreshLiveLeagueWeekIfAdvanced,\s*60000\)/.test(hub),
  'Fleeced Daily completed-week polling removed');
 must(/weekly_awards=1/.test(hub),'Weekly award read path removed');
 must(/tradeHistoryFetch\(\{force:true\}\)/.test(history),
  'Trade History stopped fetching fresh Sleeper trades on site open');
 must(/setInterval\(refreshVisibleTradeHistory,TRADE_HISTORY_REFRESH_MS\)/.test(history),
  'Visible Trade History stopped periodic refreshing');
 must(/marketFetch\(\)/.test(history)&&/\?market=1/.test(history),
  'Market Dashboard stopped requesting canonical market history');
 must(/marketInsightsFetch\(force\)/.test(history)&&/\?market_insights=1/.test(history),
  'Market Intelligence no longer refreshes from the live history endpoint');
 must(/scheduleSnapshot\(0,snapshotSourceFromUrl\(\)\)/.test(history),
  'Canonical Player Value History snapshot stopped running on site opening');
 must(/marketCache=null;[\s\S]{0,250}teamNetCache.clear\(\)/.test(history),
  'Canonical refresh no longer invalidates stale market and team caches');
 must(/fll:canonical-values-ready/.test(history),
  'Current Player Values stopped propagating to live history consumers');
 must(/player_scoring=1/.test(history),'Milestones endpoint lost scoring request');
 must(/scoring_milestones/.test(history),'Player All-Time Milestones read path removed');
 must(/weeklyAwards/.test(news)&&/latestCompletedLeagueWeek/.test(news),
  'League Hub backend lost award or independent completed-week endpoint');
 must(/githubPublishedInquirerIndex/.test(news)&&/githubPublishedInquirerEdition/.test(news),
  'Inquirer archive/index no longer available to site');
 must(/export async function githubPublishedInquirerIndex/.test(publisher)&&
    /sha256/.test(publisher),'SHA-256 locked GitHub newspaper reader removed');
 return{verified_paths:17};
}
export async function auditSite({root=process.cwd(),baseRef=null}={}){
 const sitePath='netlify/functions/site-v29.mjs',priorPath='netlify/functions/site-v17.mjs';
 // A full render tests the effective V17 -> V29 composition, not individual
 // source strings. Inspect the same HTML Netlify serves at "/".
 const {default:site}=await import(pathToFileURL(path.join(root,sitePath)).href);
 const response=await site();
 must(response.ok,'Site loader returned HTTP '+response.status);
 const html=await response.text();
 must(!/Site loader failed:/.test(html),'Site delivered stale recovery loader failure');
 const before=baseRef?(()=>{const old=(filename)=>execFileSync('git',['show',baseRef+':'+filename],
    {cwd:root,encoding:'utf8'});return old(priorPath)+old(sitePath)})():null;
 // Verify the real previous byte contents of all critical browser assets.
 // A changed script requires a new key, not simply a nondecreasing key.
 const bumped=before?verifyCacheKeysForChangedAssets(before,html,filename=>{
  try{return execFileSync('git',['show',baseRef+':'+filename],{cwd:root}) .compare(
    fs.readFileSync(path.join(root,filename)))!==0}
  catch{return false}
 }):[];

 const result=compareVersionAssets(
  before?before:html,html);
 const scripts=injectedScripts(html);
 for(const x of scripts){
  const filename=path.join(root,x.pathname.slice(1));
  must(fs.existsSync(filename),'Rendered site references missing script: '+x.pathname);
 }
 must(distinct(scripts.map(x=>x.pathname)),'Rendered duplicate JS asset paths');
 const contracts=checkRuntimeContracts({
  toml:read(root,'netlify.toml'),
  site:read(root,sitePath),
  hub:read(root,'league-hub-v451.js'),
  history:read(root,'value-history-v276.js'),
  news:read(root,'netlify/functions/league-hub.mjs'),
  publisher:read(root,'netlify/functions/lib/inquirer-github-published.mjs')
 });
 // Existing page contract is still required: all major functional sections
 // remain accessible after the dynamic HTML loader has composed them.
 for(const id of ['findShop','updateBtn'])
  must(html.includes('id="'+id+'"'),'Rendered trade control missing: '+id);
 return{...result,...contracts,bumped_assets:bumped,rendered_scripts:scripts.length,base:baseRef||'self'};
}
const cli=process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname;
if(cli){
 const base=process.env.SITE_VERSION_BASE_REF||process.argv[2]||null;
 auditSite({baseRef:base}).then(x=>console.log('site-release-regression-guard',JSON.stringify(x)))
  .catch(e=>{console.error('site-release-regression-guard FAIL:',e.message);process.exitCode=1});
}
