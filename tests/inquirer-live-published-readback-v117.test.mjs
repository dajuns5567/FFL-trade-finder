import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const start=source.indexOf('function readablePublishedInquirer(');
const end=source.indexOf('let inquirerArchiveRefreshInstalled=',start);
assert.ok(start>=0&&end>start,'Published Daily readback must be present');
const code=source.slice(start,end);
const selectRow=source.slice(source.indexOf('function latestPublishedInquirerRow('),source.indexOf('function inquirerRowIsNewer('));
assert.match(selectRow,/function latestPublishedInquirerRow/);
const edition=week=>({available:true,published_locked:true,season:2026,week,teams:Array.from({length:32},(_,i)=>({roster_id:i+1})),league_overview:{headline:'Week '+week}});
function reader(responses){
 const requested=[],context={console:{warn(){}},weeklyCache:null,openBroadcastTeam:'',inquirerPreviewMode:false,invalidatePublishedInquirerCaches(){this.weeklyCache=null},
  fetch:async url=>{const week=Number(new URL(url,'https://ffl.invalid').searchParams.get('broadcast_week'));requested.push(week);const response=responses[week];if(response instanceof Error)throw response;return{ok:response!==undefined,json:async()=>response}},
  fetchPublishedInquirerArchive:async()=>[{season:2026,week:11},{season:2026,week:10}]};
 vm.createContext(context);
 vm.runInContext(selectRow+'\n'+code+';globalThis.verify=verifiedPublishedInquirer;globalThis.isReadable=readablePublishedInquirer;globalThis.weeklyRead=weekly;',context);
 return{verify:context.verify,isReadable:context.isReadable,weekly:context.weeklyRead,requested,context};
}
test('latest fully readable locked newspaper wins even when archive index order is reversed',async()=>{
 const r=reader({10:edition(10),11:edition(11)});
 const result=await r.verify([{season:2026,week:10},{season:2026,week:11}],{preserveSelection:true});
 assert.equal(result.week,11);assert.deepEqual(r.requested,[11]);
});
test('unreadable latest edition never blanks verified prior published issue',async()=>{
 const r=reader({10:edition(10),11:{available:false,season:2026,week:11}});
 const result=await r.verify([{season:2026,week:11},{season:2026,week:10}],{preserveSelection:true});
 assert.equal(result.week,10);assert.deepEqual(r.requested,[11,10]);
});
test('temporary network failure on newest entry uses verified predecessor without inventing a week',async()=>{
 const r=reader({10:edition(10),11:new Error('transient outage')});
 assert.equal((await r.verify([{season:2026,week:11},{season:2026,week:10}],{preserveSelection:true})).week,10);
});
test('invalid identity or missing 32 team feature cannot masquerade as published edition',async()=>{
 const r=reader({11:{...edition(11),week:10},10:{...edition(10),teams:edition(10).teams.slice(0,31)}});
 await assert.rejects(()=>r.verify([{season:2026,week:11},{season:2026,week:10}],{preserveSelection:true}),/No verified published newspaper/);
});
test('Daily UI visibly announces newer indexed edition and offers latest verified navigation',()=>{
 assert.match(source,/newerAvailable=.*inquirerRowIsNewer\(newestArchived,w\)/);
 assert.match(source,/const newestArchived=latestVerifiedPublishedRow/);
 assert.match(source,/data-lh-inquirer-back>Open latest verified edition/);
 assert.match(source,/setInterval\(refreshPublishedInquirerIfAdvanced,60000\)/);
 assert.match(source,/window.addEventListener\('focus',refreshPublishedInquirerIfAdvanced\)/);
 assert.match(source,/fetchPublishedInquirerArchive\(\)/);
});

test('a selected historical article stays on its requested week through a normal Daily refresh',async()=>{
 const r=reader({10:edition(10),11:edition(11)});
 r.context.weeklyCache=edition(10);r.context.openBroadcastTeam='__league__';
 const result=await r.weekly();
 assert.equal(result.week,10);assert.deepEqual(r.requested,[]);
 assert.equal(r.context.weeklyCache.week,10);
});
test('default Fleeced Daily view advances to newly verified published week',async()=>{
 const r=reader({10:edition(10),11:edition(11)});
 r.context.weeklyCache=edition(10);
 assert.equal((await r.weekly()).week,11);
 assert.equal(r.context.weeklyCache.week,11);
});
test('archive index downtime keeps the last verified issue instead of a blank page',async()=>{
 const r=reader({});
 r.context.weeklyCache=edition(10);
 r.context.fetchPublishedInquirerArchive=async()=>{throw Error('archive temporary outage')};
 assert.equal((await r.weekly()).week,10);
});
test('a new-week notice is never offered on index entry alone without verified full-edition readback',()=>{
 assert.match(source,/latestVerifiedPublishedRow=\{season:Number\(edition\.season\),week:Number\(edition\.week\)\}/);
 assert.match(source,/const newestArchived=latestVerifiedPublishedRow/);
 assert.doesNotMatch(source,/New Fleeced! Inquirer edition indexed:/);
});

test('opening Daily from a historic article keeps a verified fallback until the new index responds',()=>{
 assert.match(source,/function returnToLeagueHubHome\(\)\{openBroadcastTeam='';render\('daily'\)/);
 assert.doesNotMatch(source,/function returnToLeagueHubHome\(\)\{openBroadcastTeam='';weeklyCache=null/);
});
test('optional trades and manager feed errors do not blank a published Daily newspaper',()=>{
 assert.match(source,/trades\(\)\.catch\(error=>\{console\.warn\('inquirer-optional-trade-panel-unavailable'/);
 assert.match(source,/managers\(\)\.catch\(error=>\{console\.warn\('inquirer-optional-manager-panel-unavailable'/);
 assert.match(source,/return\{trades:\[\]\}/);
});
