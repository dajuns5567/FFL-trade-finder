import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const begin=source.indexOf('function latestPublishedInquirerRow(');
const end=source.indexOf('async function weeklyAwards(',begin);
assert.ok(begin>=0&&end>begin,'the published archive refresh logic must be present');
const implementation=source.slice(begin,end);
const edition=week=>({available:true,season:2026,week,teams:Array.from({length:32},(_,i)=>({roster_id:i+1})),league_overview:{headline:'Week '+week+' verified recap'}});
function harness(initialRows){
 const state={rows:initialRows,editions:{6:edition(6),7:edition(7),8:edition(8)},requests:[],renders:0,visible:true};
 const fetch=async url=>{
  state.requests.push(String(url));
  const match=String(url).match(/broadcast_week=(\d+)/);
  return{ok:true,json:async()=>match?state.editions[Number(match[1])]:{reports:state.rows}};
 };
 const sandbox={fetch,console,document:{hidden:false,getElementById:()=>({hidden:false})},window:{addEventListener(){}},setInterval(){},
  currentView:'daily',inquirerPreviewMode:false,openBroadcastTeam:'',managerCache:null,
  broadcastArchive:initialRows.slice(),render:async()=>{state.renders++}};
 const module=vm.runInNewContext(`(function(){
  let weeklyCache=null,spotlightWeeklyCache=null,weeklyAwardsCache=null,reporterArchiveCache={};
  let inquirerArchiveRefreshInstalled=false,inquirerArchiveRefreshInFlight=false;
  ${implementation.replace("let inquirerArchiveRefreshInstalled=false,inquirerArchiveRefreshInFlight=false;","")}
  return {weekly,refreshPublishedInquirerIfAdvanced,latestPublishedInquirerRow,inquirerRowIsNewer,
   getCache:()=>weeklyCache,setCache:value=>weeklyCache=value,
   getArchive:()=>broadcastArchive,setArchive:rows=>broadcastArchive=rows};
 })()`,sandbox);
 return{state,module,sandbox};
}
const row=week=>({season:2026,week,key:'broadcasts/2026/week-'+String(week).padStart(2,'0')+'.json'});
test('newly indexed week is loaded without a site deployment or browser restart',async()=>{
 const h=harness([row(6)]);const first=await h.module.weekly();
 assert.equal(first.week,6);
 h.state.rows=[row(6),row(7)];
 const next=await h.module.weekly();
 assert.equal(next.week,7);
 assert.notEqual(next,first);
 assert.equal(h.state.requests.filter(x=>x.includes('broadcast_week=7')).length,1);
 assert.equal((await h.module.weekly()).week,7);
 assert.equal(h.state.requests.filter(x=>x.includes('broadcast_week=7')).length,1,'do not re-download an unchanged multi-MB manuscript');
 h.state.rows=[row(6),row(7),row(8)];
 assert.equal((await h.module.weekly()).week,8);
});
test('publication index chooses greatest season and week, not array insertion order',()=>{
 const h=harness([]);
 const latest=h.module.latestPublishedInquirerRow([row(8),row(6),row(7),{season:2025,week:18}]);
 assert.equal(latest.week,8);
 assert.equal(h.module.inquirerRowIsNewer({season:2027,week:1},{season:2026,week:18}),true);
 assert.equal(h.module.inquirerRowIsNewer(row(6),row(7)),false);
});
test('an incomplete broadcast is never displayed as the newest newspaper',async()=>{
 const h=harness([row(6)]);await h.module.weekly();
 h.state.rows=[row(6),row(7)];
 h.state.editions[7]={available:true,season:2026,week:7,teams:[{roster_id:1}],league_overview:{headline:'Incomplete'}};
 await assert.rejects(h.module.weekly(),/not fully readable/);
 assert.equal(h.module.getCache().week,6);
});
test('an active League Hub automatically discovers a published week and invalidates stale cache',async()=>{
 const h=harness([row(6)]);await h.module.weekly();
 h.state.rows=[row(6),row(7)];
 await h.module.refreshPublishedInquirerIfAdvanced();
 assert.equal(h.state.renders,1);
 assert.equal(h.module.getCache(),null);
 assert.equal(h.module.latestPublishedInquirerRow(h.module.getArchive()).week,7);
 await h.module.refreshPublishedInquirerIfAdvanced();
 assert.equal(h.state.renders,1,'no repeated render without new archive entries');
});
test('preview manuscripts are not published by the reader and daily archive refresh is read-only',()=>{
 assert.match(source,/if\(inquirerPreviewMode\)return loadInquirerPreview\(\)/);
 assert.match(source,/setInterval\(refreshPublishedInquirerIfAdvanced,60000\)/);
 assert.match(source,/document\.addEventListener\('visibilitychange'/);
 assert.match(source,/window\.addEventListener\('focus',refreshPublishedInquirerIfAdvanced\)/);
 assert.match(source,/installed=true;installInquirerArchiveRefresh\(\)/);
 assert.match(source,/async function fetchPublishedInquirerArchive\(\)/);
 assert.doesNotMatch(implementation,/fetch\([^\n]*method:'POST'/);
});
