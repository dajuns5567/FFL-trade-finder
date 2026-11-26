import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const header=readFileSync(new URL('../fleeced-header-v512.js',import.meta.url),'utf8');
const slice=(src,a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+1);assert(i>=0&&j>i);return src.slice(i,j)};
const edition={available:true,season:2026,week:11,league_overview:{headline:'Recap headline'},teams:[{roster_id:1,team_name:'Team A',manager_name:'GM A',points:100,opponent_points:90}]};
function fixture(){
 const listeners={},section={dataset:{},hidden:false,addEventListener:(type,fn)=>{listeners[type]=fn}};
 const draws=[],scrolls=[];
 const ctx={console,openBroadcastTeam:'',openReporterArchive:'',currentView:'daily',dailyWeekSelection:'latest',weeklyCache:edition,broadcastArchive:[{season:2026,week:11}],inquirerPreviewMode:false,reporterArchiveCache:{},liveLeagueWeekCache:edition,
  document:{getElementById:()=>section},render:async view=>{ctx.currentView=view;draws.push(view);ctx.weeklyCache=edition},showWeeklyArticle:w=>draws.push(w.week),scrollToInquirerTop:()=>scrolls.push('top'),scrollToInquirerArticle:()=>scrolls.push('article'),latestPublishedInquirerRow:rows=>rows[0],fetch:async()=>({json:async()=>edition}),
  dailyTradesForWeek:x=>x,hindsightDelta:()=>null,archiveFiltersHTML:()=>'<div>archive controls</div>',reporterArchiveHTML:()=>'',leagueOverviewArticle:()=>'<article>FULL RECAP</article>',teamArticle:()=>'<article>FULL TEAM COLUMN</article>',esc:String,dailyWeekFilterHTML:()=>'<select data-lh-daily-week></select>',playersOfWeekHTML:()=>'<div>Players of the Week</div>',spotlightBlock:()=>'<div>Manager Spotlight</div>'};
 vm.createContext(ctx);
 const helpers=slice(ui,'let inquirerNavigationGeneration=0;','function scrollToInquirerTop()');
 const reset=slice(ui,'function returnToLeagueHubHome()','function careerRankingsHTML(');
 const wire=slice(ui,'function wireSection(s)','async function refreshLeagueHubSharedDataIfVisible()');
 vm.runInContext(helpers+reset+wire+';globalThis.api={wireSection,dailyHTML,loadArchivedEdition,openInquirerFromShortcut};',ctx);
 ctx.api.wireSection(section);
 const event=(type,attr,dataset={},value='')=>listeners[type]({target:{dataset,value,closest:sel=>sel==='['+attr+']'?{dataset,value}:null}});
 const html=()=>ctx.api.dailyHTML([],[],edition,{},edition,edition);
 return {ctx,section,event,html,draws,scrolls};
}
function closed(f){assert.equal(f.ctx.openBroadcastTeam,'');assert.equal(f.ctx.openReporterArchive,'');const html=f.html();assert.match(html,/Open Full Inquirer/);assert.doesNotMatch(html,/FULL RECAP|FULL TEAM COLUMN|data-lh-inquirer-back/);assert.match(html,/Trade Wire/);assert.match(html,/Players of the Week/);assert.match(html,/Manager Spotlight/)}
test('Daily starts collapsed, re-entry and every week change close the report',()=>{
 const f=fixture();closed(f);
 for(const article of ['__league__','1']){
  f.ctx.openBroadcastTeam=article;f.ctx.openReporterArchive='desk';
  f.event('click','data-lh-view',{lhView:'daily'});closed(f);
  f.ctx.openBroadcastTeam=article;f.ctx.openReporterArchive='desk';
  f.event('change','data-lh-daily-week',{},'2026-10');closed(f);assert.equal(f.ctx.dailyWeekSelection,'2026-10');
 }
 f.ctx.openBroadcastTeam='1';f.event('change','data-lh-daily-week',{},'latest');closed(f);
});
test('late archive response cannot reopen after Daily entry or week change',async()=>{
 for(const action of ['daily','week']){
  const f=fixture();let resolve;f.ctx.fetch=()=>new Promise(r=>{resolve=r});
  const pending=f.ctx.api.loadArchivedEdition(2026,10,'1');
  if(action==='daily')f.event('click','data-lh-view',{lhView:'daily'});else f.event('change','data-lh-daily-week',{},'2026-10');
  resolve({json:async()=>({...edition,week:10})});await pending;closed(f);assert(!f.draws.includes(10));
 }
});
test('explicit full Inquirer, team selection, and archive remain available',async()=>{
 const f=fixture();await f.ctx.api.openInquirerFromShortcut();assert.match(f.html(),/FULL RECAP/);
 f.event('change','data-lh-broadcast-article',{},'1');assert.match(f.html(),/FULL TEAM COLUMN/);
 f.event('click','data-lh-inquirer-back');closed(f);
 await f.ctx.api.loadArchivedEdition(2026,11,'1');assert.match(f.html(),/FULL TEAM COLUMN/);
});
test('header Daily never queues a delayed close or open; explicit Inquirer dispatches only its own intent',()=>{
 const actions=[],daily={click:()=>actions.push('daily'),dispatchEvent:e=>actions.push(e.type)};
 const ctx={navigateTab:(id,fn)=>fn(),waitFor:(s,fn)=>fn(daily),activeTab:()=> 'leagueHub',scrollToEl:()=>{},$:()=>null,CustomEvent:class{constructor(type){this.type=type}}};
 vm.createContext(ctx);vm.runInContext(slice(header,'function openFleecedDaily()','function runMenuAction(action)')+';openFleecedDaily();openInquirer();',ctx);
 assert.deepEqual(actions,['daily','fll:open-inquirer']);
});
test('normal hub entry resets navigation; explicitly requested editorial preview still opens',()=>{
 assert.match(ui,/activate\('leagueHub'\);if\(currentView==='daily'&&\(!inquirerPreviewMode\|\|window\.__inquirerPreviewOpened\)\)resetInquirerNavigation\(\);render\(currentView\)/);
 assert.match(ui,/openBroadcastTeam='__league__';b.click\(\);window\.__inquirerPreviewOpened=true/);
});
