import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
const start=ui.indexOf("let dailyWeekSelection="),end=ui.indexOf('let liveLeagueWeekRefreshInFlight=',start);
const latest={available:true,season:2026,week:11,teams:Array.from({length:32},(_,i)=>({roster_id:i+1}))};
const fixture=fetcher=>{const ctx={console,esc:String,inquirerPreviewMode:false,liveLeagueWeekCache:latest,fetch:fetcher};vm.createContext(ctx);vm.runInContext(ui.slice(start,end)+';globalThis.api={dailyWeekChoices,resolveDailyWeek,dailyEditionForWeek,dailyTradesForWeek,dailyWeekFilterHTML}',ctx);return ctx.api};
test('week options advance with verified completed week and never include future weeks',()=>{
 const a=fixture(async()=>{throw Error('unexpected')});
 assert.equal(a.dailyWeekChoices(latest).length,11);
 assert.equal(a.dailyWeekChoices({...latest,week:12})[0].key,'2026-12');
 assert.match(a.dailyWeekFilterHTML(latest),/Latest completed week/);
 assert.doesNotMatch(a.dailyWeekFilterHTML(latest),/2026 Week 12/);
});
test('historical lookup is exact and cannot replace latest week or accept mismatched data',async()=>{
 const calls=[],a=fixture(async url=>{calls.push(url);return{ok:true,json:async()=>({...latest,week:10})}});
 const old=await a.resolveDailyWeek(latest,'2026-10');assert.equal(old.week,10);assert.equal(old.historical_selection,true);
 assert.equal((await a.resolveDailyWeek(latest,'latest')).week,11);
 assert.equal((await a.resolveDailyWeek(latest,'2026-9')).available,false);
 assert.equal((await a.resolveDailyWeek(latest,'2026-12')).available,false);
 assert.equal(calls.length,2);
});
test('historical trade and newspaper selectors never substitute another week',async()=>{
 const a=fixture(async()=>({ok:true,json:async()=>({...latest,week:10})}));
 const old={season:2026,week:10};const trades=[{season:2026,week:10},{season:2026,week:11},{season:2025,week:10}];
 assert.equal(a.dailyTradesForWeek(trades,old,'2026-10').length,1);
 assert.equal((await a.dailyEditionForWeek(latest,old,[old],'2026-10')).week,10);
 assert.equal((await a.dailyEditionForWeek(latest,old,[],'2026-10')).available,false);
});
test('backend exact week route uses the finalized week validator without latest fallback',()=>{
 assert.match(hub,/latestCompletedLeagueWeek\(Number\(u.searchParams.get\('league_week'\)\)\)/);
 assert.match(hub,/const start=explicit\?requestedWeek:newest,end=explicit\?requestedWeek:/);
 assert.match(hub,/const finalized=await completedPublicationWeek\(week\)/);
 assert.match(ui,/playersOfWeekHTML\(leagueWeek\|\|w\)/);
 assert.match(ui,/selection!==dailyWeekSelection\)return/);
});

test('Daily week filter uses scoped Fleeced gold styling and a visible keyboard focus',()=>{
 const a=fixture(async()=>{throw Error('unexpected')});
 assert.match(a.dailyWeekFilterHTML(latest),/lh-daily-week-filter/);
 assert.match(ui,/\.lh-daily-week-filter select\[data-lh-daily-week\]\{[^}]*color:#e4b53f!important[^}]*border:1px solid rgba\(228,181,63,\.64\)/);
 assert.match(ui,/\.lh-daily-week-filter select\[data-lh-daily-week\]:focus-visible\{[^}]*outline:2px solid #ffd967/);
});
