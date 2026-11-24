// Exercise the exact reader deployed on the currently published Netlify site.
// This is a local contract test, not a claim of authenticated live HTTP access.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
export async function verifyDeployedInquirerCompatibility({deployedRoot,localFetch,expectedWeek,expectedSeason}){
 if(!deployedRoot)throw Error('Deployed source checkout required');
 const absolute=path.resolve(deployedRoot);
 const load=relative=>import(pathToFileURL(path.join(absolute,relative)).href);
 const {githubPublishedInquirerIndex,githubPublishedInquirerEdition}=await load('netlify/functions/lib/inquirer-github-published.mjs');
 const {inspectCanonicalArchive}=await load('netlify/functions/lib/inquirer-legacy-history.mjs');
 const hub=await fs.readFile(path.join(absolute,'netlify/functions/league-hub.mjs'),'utf8');
 const browser=await fs.readFile(path.join(absolute,'league-hub-v451.js'),'utf8');
 const start=hub.indexOf('async function broadcastArchive(){'),end=hub.indexOf('function weeklyAwardStatRows(',start);
 if(start<0||end<=start)throw Error('Exact deployed archive reader functions not found');
 const source=hub.slice(start,end);
 const ctx={console,PRELOADED_BROADCASTS:new Map(),store:()=>({get:async()=>null}),
  recoveredInquirerCatalog:async()=>({rows:[]}),preloadedBroadcast:()=>null,
  recoveredInquirerEdition:async()=>null,
  githubPublishedInquirerIndex:()=>githubPublishedInquirerIndex(localFetch,{refresh:true}),
  githubPublishedInquirerEdition:(season,week)=>githubPublishedInquirerEdition(season,week,localFetch),
  isLockedInquirerEdition:(edition,season,week)=>inspectCanonicalArchive(edition,season,week).ok};
 vm.createContext(ctx);
 vm.runInContext(source+';globalThis.archive=broadcastArchive;globalThis.edition=broadcastStored;',ctx);
 const archive=await ctx.archive(),latest=archive.reports.at(-1);
 if(Number(latest?.week)!==expectedWeek||Number(latest?.season)!==expectedSeason)throw Error('Deployed backend would not select latest edition');
 const direct=await ctx.edition(expectedSeason,expectedWeek);
 if(!inspectCanonicalArchive(direct,expectedSeason,expectedWeek).ok||direct.teams.length!==32)throw Error('Deployed backend rejects new publication');
 // Execute exactly the selection/fetch functions deployed in the real site.
 // Seed the old cached edition to prove the browser advances automatically.
 const names=['latestPublishedInquirerRow','fetchPublishedInquirerArchive','weekly'];
 const ui=names.map(name=>{
  const line=browser.split('\n').find(x=>new RegExp('^(?:async )?function '+name+'\\(').test(x));
  if(!line)throw Error('Deployed browser function missing: '+name);
  return line;
 }).join('\n');
 const requested=[];
 let invalidations=0;
 const uiCtx={URL,Response,console,inquirerPreviewMode:false,
  weeklyCache:{available:true,season:expectedSeason,week:expectedWeek-1},
  invalidatePublishedInquirerCaches:()=>{invalidations++},
  fetch:async input=>{
   const url=new URL(input,'https://local.invalid');
   requested.push(url.search);
   if(url.searchParams.get('broadcast_archive')==='1')return new Response(JSON.stringify(await ctx.archive()));
   if(url.searchParams.has('broadcast_week'))return new Response(JSON.stringify(await ctx.edition(Number(url.searchParams.get('broadcast_season')),Number(url.searchParams.get('broadcast_week')))));
   throw Error('Unexpected deployed browser request '+input);
  }};
 vm.createContext(uiCtx);vm.runInContext(ui+';globalThis.selectWeekly=weekly;',uiCtx);
 const result=await uiCtx.selectWeekly();
 if(Number(result.week)!==expectedWeek||result.teams.length!==32||invalidations!==1||requested.length!==2)throw Error('Deployed browser failed to advance from prior cached week');
 await uiCtx.selectWeekly();
 if(invalidations!==1||requested.length!==3)throw Error('Deployed browser does not retain current edition safely');
 return{deployed_backend_verified:true,deployed_browser_selection_verified:true,deployed_week:expectedWeek,teams:result.teams.length};
}
