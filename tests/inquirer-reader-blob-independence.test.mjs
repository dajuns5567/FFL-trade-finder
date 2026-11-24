import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
const from=source.indexOf('async function broadcastArchive(){'),to=source.indexOf('function weeklyAwardStatRows(',from);
const runtime=source.slice(from,to);
const row=week=>({season:2026,week,key:'github-'+week});
const fixture=(blob)=>{const ctx={console,PRELOADED_BROADCASTS:new Map(),store:()=>{if(blob===null)throw Error('Blob outage');return{get:async()=>blob}},recoveredInquirerCatalog:async()=>({rows:[row(3),row(9)]}),githubPublishedInquirerIndex:async()=>({reports:[row(10),row(11)]}),githubPublishedInquirerEdition:async(s,w)=>Number(w)===11?{available:true,season:s,week:w,teams:Array.from({length:32})}:null,recoveredInquirerEdition:async(s,w)=>Number(w)===9?{available:true,season:s,week:w}:null,preloadedBroadcast:()=>null,isLockedInquirerEdition:()=>true};
 vm.createContext(ctx);vm.runInContext(runtime+';globalThis.archive=broadcastArchive;globalThis.edition=broadcastStored;',ctx);return ctx};
test('GitHub index remains visible during complete Netlify Blob failure',async()=>{
 const ctx=fixture(null),index=await ctx.archive();
 assert.deepEqual(Array.from(index.reports,x=>x.week),[3,9,10,11]);
 assert.equal((await ctx.edition(2026,11)).teams.length,32);
 assert.equal((await ctx.edition(2026,9)).week,9);
});
test('old Blob index cannot promote an orphaned Week 12 or override GitHub Week 11',async()=>{
 const ctx=fixture([{season:2026,week:11,key:'wrong'},{season:2026,week:12,key:'unverified'}]),index=await ctx.archive();
 assert.equal(index.reports.find(x=>x.week===11).key,'github-11');assert.equal(index.reports.some(x=>x.week===12),false);
 assert.equal((await ctx.edition(2026,12)).available,false);
});
