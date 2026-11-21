import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const start=source.indexOf('function readablePublishedInquirer(');
const end=source.indexOf('let inquirerArchiveRefreshInstalled=',start);
assert.ok(start>=0&&end>start,'Published Daily readback must be present');
const code=source.slice(start,end);
const edition=week=>({available:true,published_locked:true,season:2026,week,teams:Array.from({length:32},(_,i)=>({roster_id:i+1})),league_overview:{headline:'Week '+week}});
function reader(responses){
 const requested=[],context={console:{warn(){}},weeklyCache:null,invalidatePublishedInquirerCaches(){this.weeklyCache=null},
  fetch:async url=>{const week=Number(new URL(url,'https://ffl.invalid').searchParams.get('broadcast_week'));requested.push(week);const response=responses[week];if(response instanceof Error)throw response;return{ok:response!==undefined,json:async()=>response}},
  fetchPublishedInquirerArchive:async()=>[{season:2026,week:11},{season:2026,week:10}]};
 vm.createContext(context);
 vm.runInContext(code+';globalThis.verify=verifiedPublishedInquirer;globalThis.isReadable=readablePublishedInquirer;',context);
 return{verify:context.verify,isReadable:context.isReadable,requested,context};
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
 assert.match(source,/data-lh-inquirer-back>Open latest verified edition/);
 assert.match(source,/setInterval\(refreshPublishedInquirerIfAdvanced,60000\)/);
 assert.match(source,/window.addEventListener\('focus',refreshPublishedInquirerIfAdvanced\)/);
 assert.match(source,/fetchPublishedInquirerArchive\(\)/);
});
