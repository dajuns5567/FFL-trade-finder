import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedReplacementHistory,verifiedNewSiteCutoverHistory,verifiedWeekNineAutopublishCutoverHistory} from '../netlify/functions/lib/inquirer-replacement-archive-gate.mjs';
const kinds=['lede','players','management','hot-seat','cool-throne','value','sentiment','outlook'];
const beats=['lead','standings','players','decisions','league','outlook'];
function edition(week){
 return{available:true,published_locked:true,season:2026,week,inquirer_version:31,editorial_revision:14,
  teams:Array.from({length:32},(_,i)=>({
   roster_id:String(i+1),inquirer_article:{headline:'Specific Team '+(i+1)+' Week '+week+' article',
    reporter:{id:'reporter-'+Math.floor(i/8)},
    sections:kinds.map(kind=>({kind,heading:'The '+kind,paragraphs:['Reported facts']}))}})),
  league_overview:{headline:'Week '+week+' full recap',sections:[
   {blocks:beats.map(kind=>({kind,heading:kind,paragraphs:['Reported analysis']}))},
   {heading:'Desk two',paragraphs:['Some prose']},{heading:'Desk three',paragraphs:['Some prose']},
   {heading:'Desk four',paragraphs:['Some prose']}
  ]}};
}
test('replacement bootstrap requires both original locked weeks with correct years/roster count',()=>{
 const w3=edition(3),w4=edition(4);
 assert.equal(verifiedReplacementHistory(w3,w4).ready,true);
 assert.equal(verifiedReplacementHistory(null,w4).ready,false);
 assert.equal(verifiedReplacementHistory(w3,null).ready,false);
 assert.equal(verifiedReplacementHistory({...w3,published_locked:false},w4).ready,false);
 assert.equal(verifiedReplacementHistory(w3,{...w4,season:2027}).ready,false);
 assert.equal(verifiedReplacementHistory(w3,{...w4,teams:w4.teams.slice(0,31)}).ready,false);
});
test('replacement cutover rejects the old Week 5 regression that omitted approved desks',()=>{
 const w3=edition(3),w4=edition(4);
 w4.teams[0].inquirer_article.sections=w4.teams[0].inquirer_article.sections.filter(s=>s.kind!=='cool-throne');
 assert.equal(verifiedReplacementHistory(w3,w4).ready,false);
 w4.teams[0].inquirer_article.sections=kinds.map(kind=>({kind,heading:kind}));
 w4.league_overview.sections[0].blocks.pop();
 assert.equal(verifiedReplacementHistory(w3,w4).ready,false);
});
test('scheduled publisher never starts from a missing status before verifying original historical migration',()=>{
 const source=readFileSync(new URL('../netlify/functions/inquirer-publish-scheduled.mjs',import.meta.url),'utf8');
 const replacement=source.indexOf("if(isReplacement&&publishingEnabled!=='true')");
 const verify=source.indexOf('verifiedReplacementHistory(week3,week4)');
 const seed=source.indexOf("if(status===null)status={state:'waiting',season:2026,week:4,editorial_revision:0}");
 const decision=source.indexOf('inquirerScheduleDecision({status,nfl:current');
 assert.ok(replacement>0&&verify>replacement&&seed>verify&&decision>seed);
 assert.match(source,/Netlify\?\.env\?\.get\?\.\('FLEECED_ENABLE_NEW_SITE_PUBLISHER'\)/);
 assert.match(source,/context=globalThis\.Netlify\?\.env\?\.get\?\.\('CONTEXT'\)/);
 assert.match(source,/siteId==='8776d155-bc7b-4dcd-bafc-3d70d3d51800'/);
 assert.match(source,/if\(!status\|\|typeof status!=='object'\)return skip/);
});


test('new account cutover is blocked until locked Weeks 3–6, archive index and Week 6 awards are all present',()=>{
 const w3=edition(3),w4=edition(4);
 const w5={...edition(5),editorial_revision:95,editorial_generation:{engine:'v31-forward'}};
 const w6={...edition(6),editorial_revision:97,editorial_generation:{engine:'v31-forward'}};
 const index=[5,6].map(week=>({season:2026,week}));
 const awards={records:[{season:2026,week:6,newsroom_engine:'v31-forward',
  newsroom_editorial_revision:97,players_of_week:{offense:{player_id:'123'},defense:{player_id:'456'}},
  manager_awards:[{type:'highest-scorer'},{type:'lowest-scorer'}]}]};
 const valid={week3:w3,week4:w4,week5:w5,week6:w6,index,awards};
 assert.equal(verifiedNewSiteCutoverHistory(valid).ready,true);
 assert.equal(verifiedNewSiteCutoverHistory({...valid,week6:null}).ready,false);
 assert.equal(verifiedNewSiteCutoverHistory({...valid,week6:{...w6,published_locked:false}}).ready,false);
 assert.equal(verifiedNewSiteCutoverHistory({...valid,week5:{...w5,season:2027}}).ready,false);
 assert.equal(verifiedNewSiteCutoverHistory({...valid,index:index.slice(0,1)}).ready,false);
 assert.equal(verifiedNewSiteCutoverHistory({...valid,awards:{records:[]}}).ready,false);
 assert.equal(verifiedNewSiteCutoverHistory({...valid,awards:{records:[{...awards.records[0],manager_awards:[]}]}}).ready,false);
 assert.equal(verifiedNewSiteCutoverHistory({...valid,week3:{...w3,published_locked:false}}).ready,false);
});
test('new-account scheduler and worker both enforce owner enable flag and post-Week-6 continuity',()=>{
 const scheduled=readFileSync(new URL('../netlify/functions/inquirer-publish-scheduled.mjs',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../netlify/functions/inquirer-publish-background.mjs',import.meta.url),'utf8');
 assert.match(scheduled,/siteId==='3b9ae5bd-0d0f-4570-b2b7-89afae8a0e5f'/);
 assert.match(worker,/siteId==='3b9ae5bd-0d0f-4570-b2b7-89afae8a0e5f'/);
 assert.match(scheduled,/if\(isReplacement&&publishingEnabled!=='true'\)/);
 assert.match(worker,/if\(replacement&&enabled!=='true'\)/);
 assert.match(scheduled,/verifiedNewSiteCutoverHistory\(\{week3,week4,week5,week6,index,awards\}\)/);
 assert.match(worker,/verifiedNewSiteCutoverHistory\(\{week3,week4,week5,week6,index,awards\}\)/);
 const preflight=worker.indexOf('if(isNewestSite){');
 const writes=worker.indexOf("await statusStore.setJSON('inquirer/publication-status.json'");
 assert.ok(preflight>0&&writes>preflight,'worker must inspect locked archives before ANY status write');
 assert.match(scheduled,/status=\{state:'completed',available:true,season:2026,week:isCurrentSite\?8:6/);
 assert.match(worker,/gleaming-dodol-8dbc4a.netlify.app/);
 assert.match(worker,/Preview deployment cannot publish/);
});

test('new Netlify account is recognized but gated behind owner activation and Weeks 7–8 archive',()=>{
 const scheduler=readFileSync(new URL('../netlify/functions/inquirer-publish-scheduled.mjs',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../netlify/functions/inquirer-publish-background.mjs',import.meta.url),'utf8');
 for(const source of [scheduler,worker]){
  assert.match(source,/fa33dfe4-8293-441e-8da0-25cc66fc984c/);
  assert.match(source,/verifiedWeekNineAutopublishCutoverHistory/);
 }
 assert.match(scheduler,/week:isCurrentSite\?8:6/);
 assert.match(scheduler,/publishingEnabled!=='true'/);
 assert.match(worker,/enabled!=='true'/);
 const config=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
 assert.match(config,/CONTEXT==='production'/);
});
test('Week 9 unattended cutover never substitutes private drafts for locked Weeks 7 and 8',()=>{
 const week7={...edition(7),editorial_revision:107,editorial_generation:{engine:'v31-forward'}};
 const week8={...edition(8),editorial_revision:107,editorial_generation:{engine:'v31-forward'}};
 const index=[{season:2026,week:7},{season:2026,week:8}];
 const awards={records:[{season:2026,week:8,newsroom_engine:'v31-forward',
  players_of_week:{offense:{player_id:'A'},defense:{player_id:'B'}},
  manager_awards:[{type:'highest-scorer'},{type:'lowest-scorer'}]}]};
 const valid={week7,week8,index,awards};
 assert.equal(verifiedWeekNineAutopublishCutoverHistory(valid).ready,true);
 assert.equal(verifiedWeekNineAutopublishCutoverHistory({...valid,week7:null}).ready,false);
 assert.equal(verifiedWeekNineAutopublishCutoverHistory({...valid,week8:{...week8,published_locked:false}}).ready,false);
 assert.equal(verifiedWeekNineAutopublishCutoverHistory({...valid,index:index.slice(0,1)}).ready,false);
 assert.equal(verifiedWeekNineAutopublishCutoverHistory({...valid,awards:{records:[]}}).ready,false);
});
