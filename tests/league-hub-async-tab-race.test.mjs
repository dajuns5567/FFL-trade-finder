import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const start=source.indexOf('let leagueHubRenderGeneration=0;');
const end=source.indexOf('\nfunction wireSection',start);
assert.ok(start>=0&&end>start,'extract the actual installed async League Hub renderer');
const hallHelper=source.slice(source.indexOf('async function collectHallRowsV659('),source.indexOf('function hallHTML('));
const section=hallHelper+source.slice(start,end);
function fixture(){
 let resolveFirst;
 const pendingFirst=new Promise(resolve=>resolveFirst=resolve);
 let requests=0;
 const host={style:{minHeight:''},innerHTML:'',getBoundingClientRect:()=>({height:500})};
 const tabs=['daily','awards','hall','managers'].map(v=>({
  dataset:{lhView:v},classList:{toggle(className,active){this.active=active}}
 }));
 const context={
  currentView:'daily',selectedManagerId:'',inquirerPreviewMode:false,
  window:{scrollY:0,innerHeight:700,scrollTo(){}},
  document:{getElementById:()=>host,querySelectorAll:()=>tabs},
  requestAnimationFrame:fn=>fn(),
  trades:()=>++requests===1?pendingFirst:Promise.resolve({trades:[]}),
  managers:async()=>({current:[],career:[]}),
  weekly:async()=>({available:false}),drafts:async()=>({draft_picks:[]}),
  weeklyAwards:async()=>({records:[]}),liveLeagueWeek:async()=>null,
  reporterDirectory:async()=>({reporters:[]}),
  fetchPublishedInquirerArchive:async()=>[],
  fetch:async()=>({ok:true,json:async()=>({reports:[]})}),
  teamTradeStats:()=>[],currentAwards:()=>[],
  awardsHTML:()=>'<section data-test="awards">Awards page</section>',
  hallHTML:()=>'<section data-test="hall">Hall page</section>',
  syncAwards:()=>{},inquirerPreviewPollAttempts:0,
  spotlightWeek:async()=>null,dailyHTML:()=>'<section data-test="daily">Daily page</section>',
  captureAllTimeHighsOnSiteOpen:()=>Promise.resolve(),
  esc:String,performance:{now:()=>0},console,setTimeout,Number,String,Math,Array,Object,Promise
 };
 vm.createContext(context);
 vm.runInContext(section+';globalThis.testRender=render',context);
 return{context,host,tabs,resolveFirst};
}
test('a delayed Daily response must not override the selected Awards page',async()=>{
 const f=fixture();
 const old=f.context.testRender('daily');
 await f.context.testRender('awards');
 assert.match(f.host.innerHTML,/data-test="awards"/);
 f.resolveFirst({trades:[]});
 await old;
 assert.match(f.host.innerHTML,/data-test="awards"/);
 assert.equal(f.tabs.find(x=>x.dataset.lhView==='awards').classList.active,true);
});
test('a delayed Daily response must not override Hall of Fleeced either',async()=>{
 const f=fixture();
 const old=f.context.testRender('daily');
 await f.context.testRender('hall');
 f.resolveFirst({trades:[]});
 await old;
 assert.match(f.host.innerHTML,/data-test="hall"/);
});
test('guards reject late data and failed responses for all tab branches',()=>{
 assert.match(section,/requestGeneration=\+\+leagueHubRenderGeneration/);
 assert.ok((section.match(/requestGeneration!==leagueHubRenderGeneration\|\|currentView!==view/g)||[]).length>=7);
 assert.match(section,/catch\(error\)\{if\(requestGeneration!==leagueHubRenderGeneration/);
 assert.match(section,/if\(view==='awards'\)/);
 assert.match(section,/if\(view==='hall'\)/);
 assert.match(section,/if\(view==='managers'\|\|view==='career'\)/);
});
