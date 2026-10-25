import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isTrustedWeeklyAwardCache} from '../netlify/functions/league-hub.mjs';
import publishInquirerInBackground,{hasCompleteWeekFeaturePackage} from '../netlify/functions/inquirer-publish-background.mjs';
import {FORWARD_EDITORIAL_REVISION} from '../netlify/functions/inquirer-editorial-v31.mjs';
const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
const pub=readFileSync(new URL('../netlify/functions/inquirer-publish-background.mjs',import.meta.url),'utf8');
const ui=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const source=readFileSync(new URL('../netlify/functions/inquirer-editorial-v31.mjs',import.meta.url),'utf8');

test('only ONE forward editorial writer remains in both production and private previews',()=>{
 assert.match(hub,/applyInquirerEditorialV31\(\{season,week/);
 assert.match(hub,/for\(const salt of \[5,0,1,2,3,4\]\)/);
 assert.match(hub,/const q=evaluateInquirerEditionQuality\(candidate,previousBroadcast\)/);
 assert.match(hub,/const a=inspectEditionBeforePublication\(candidate\)/);
 assert.match(hub,/if\(q\.ok&&a\.ok\)/);
 assert.match(source,new RegExp('FORWARD_EDITORIAL_REVISION='+FORWARD_EDITORIAL_REVISION+'\\b'));
 assert.match(hub,/preview_editorial_audit:audit,preview_generation_quality:quality/);
});
test('previous published copy can neither be invented nor overwritten after partial failure',()=>{
 assert.match(hub,/isLockedInquirerEdition\(stored,season,w\)/);
 assert.match(hub,/isLockedInquirerEdition\(previousBroadcast,season,week-1\)/);
 assert.doesNotMatch(hub,/previousBroadcast=previousStored\?\{\.\.\.previousStored,published_locked:true\}/);
 assert.match(hub,/if\(!previewReadOnly\)await ensureLockedEditionIndexed\(s,stored,key\)/);
 const index=hub.indexOf('async function ensureLockedEditionIndexed');
 const commit=hub.indexOf("await s.setJSON('broadcasts/index.json',next)",index);
 const articles=hub.indexOf('await syncReporterArchives(s,edition,key)',index);
 assert.ok(index>=0&&articles>index&&commit>articles,'derived files must commit before archive index');
});
test('Week 5+ publication includes locked award package or remains retryable',()=>{
 assert.match(pub,/report\?\.available===true&&report\?\.published_locked===true/);
 assert.match(pub,/await weeklyAwards\(\)/);
 assert.match(pub,/record\?\.players_of_week/);
 assert.match(pub,/Array\.isArray\(record\?\.manager_awards\)/);
 assert.match(pub,/awardsError/);
 assert.match(pub,/completed\?'completed':'waiting'/);
 assert.match(pub,/available:completed,newsroom_available:/);
});
test('the reader never labels old Players of the Week as the current newspaper week',()=>{
 assert.match(ui,/function playersOfWeekHTML\(w,data=weeklyAwardsCache\)/);
 assert.match(ui,/rec=rows\.find\(r=>Number\(r\.season\)===season&&Number\(r\.week\)===week\)\|\|null/);
 assert.match(ui,/function managerWeeklyBadgesHTML/);
 assert.match(ui,/function spotlightBlock/);
 assert.match(ui,/function weeklyAwardCardsHTML/);
});

test('never certify old locked Week5 awards or incomplete player/scorer badges',()=>{
 const valid={season:2026,week:5,newsroom_editorial_revision:39,newsroom_engine:'v31-forward',
  players_of_week:{offense:{player_id:'O1'},defense:{player_id:'D1'}},
  manager_awards:[{type:'highest-scorer',roster_id:'1'},{type:'lowest-scorer',roster_id:'2'}]};
 assert.equal(isTrustedWeeklyAwardCache(valid,2026,5),true);
 assert.equal(isTrustedWeeklyAwardCache({...valid,newsroom_editorial_revision:14},2026,5),false);
 assert.equal(isTrustedWeeklyAwardCache({...valid,newsroom_engine:'legacy'},2026,5),false);
 assert.equal(isTrustedWeeklyAwardCache({...valid,players_of_week:{offense:{player_id:'O1'},defense:null}},2026,5),false);
 assert.equal(isTrustedWeeklyAwardCache({...valid,manager_awards:[{type:'hot-seat'}]},2026,5),false);
 assert.equal(isTrustedWeeklyAwardCache({...valid,week:6},2026,5),false);
 assert.equal(isTrustedWeeklyAwardCache({...valid,season:2027,week:1,newsroom_editorial_revision:14},2027,1),false);
 assert.equal(isTrustedWeeklyAwardCache({...valid,season:2027,week:1},2027,1),true);
 assert.match(hub,/const verified=await Promise\.all\(missing\.map/);
 assert.match(hub,/isLockedInquirerEdition\(edition,p\.season,p\.week\)/);
 assert.match(hub,/const missing=pairs\.filter\(p=>!byKey\.has/);
 assert.match(pub,/record\?\.players_of_week\?\.offense\?\.player_id/);
 assert.match(pub,/record\?\.players_of_week\?\.defense\?\.player_id/);
 assert.match(pub,/record\.newsroom_engine==='v31-forward'/);
});
test('awards cache never forces reading every published multi-megabyte manuscript on every visit',()=>{
 const start=hub.indexOf('export async function weeklyAwards()');
 const end=hub.indexOf('async function draftAwards()',start);
 assert.ok(start>0&&end>start);
 const code=hub.slice(start,end);
 assert.match(code,/if\(missing\.length\)\{/);
 assert.match(code,/Promise\.all\(missing\.map/);
 assert.doesNotMatch(code,/Promise\.all\(pairs\.map/);
});

test('scheduled publisher must repair pending Week 5 awards before generating Week 6',()=>{
 const start=hub.indexOf('export async function weeklyReport(req)');
 const end=hub.indexOf('export async function',start+20);
 const code=end>start?hub.slice(start,end):hub.slice(start);
 assert.match(code,/enforceFeatureContinuity=req\.method==='POST'/);
 assert.match(code,/saved=await s\.get\('awards\/weekly\.json'/);
 assert.match(code,/if\(enforceFeatureContinuity&&\(season>2026\|\|\(season===2026&&w>=5\)\)\)/);
 assert.match(code,/isTrustedWeeklyAwardCache\(award,season,w\)/);
 assert.match(code,/return stored;/);
 assert.match(code,/if\(!previewReadOnly\)await ensureLockedEditionIndexed/);
});

test('publisher completion cannot be claimed without the matching locked newsroom and all weekly features',()=>{
 const report={available:true,published_locked:true,season:2026,week:5};
 const award={season:2026,week:5,newsroom_editorial_revision:39,newsroom_engine:'v31-forward',
  players_of_week:{offense:{player_id:'O1'},defense:{player_id:'D1'}},
  manager_awards:[{type:'highest-scorer',roster_id:'1'},{type:'lowest-scorer',roster_id:'2'}]};
 const complete={records:[award]};
 assert.equal(hasCompleteWeekFeaturePackage(report,complete),true);
 assert.equal(hasCompleteWeekFeaturePackage({...report,published_locked:false},complete),false);
 assert.equal(hasCompleteWeekFeaturePackage({...report,available:false},complete),false);
 assert.equal(hasCompleteWeekFeaturePackage(report,null),false);
 assert.equal(hasCompleteWeekFeaturePackage(report,{records:[]}),false);
 assert.equal(hasCompleteWeekFeaturePackage(report,{records:[{...award,week:6}]}),false);
 assert.equal(hasCompleteWeekFeaturePackage(report,{records:[{...award,season:2027}]}),false);
 assert.equal(hasCompleteWeekFeaturePackage(report,{records:[{...award,newsroom_editorial_revision:14}]}),false);
 assert.equal(hasCompleteWeekFeaturePackage(report,{records:[{...award,newsroom_engine:'legacy'}]}),false);
 assert.equal(hasCompleteWeekFeaturePackage(report,{records:[{...award,players_of_week:{offense:{player_id:'O1'},defense:null}}]}),false);
 assert.equal(hasCompleteWeekFeaturePackage(report,{records:[{...award,manager_awards:[]}]}),false);
 assert.match(pub,/hasCompleteWeekFeaturePackage\(report,awards\)/);
 assert.match(pub,/const completed=!reportError&&!awardsError&&!report\?\.review_required&&hasCompleteWeekFeaturePackage\(report,awards\)/);
});

test('private archive-to-preview link keeps an explicitly requested week instead of misleadingly opening another week',()=>{
 assert.match(ui,/const inquirerPreviewEntryUrl=/);
 assert.match(ui,/inquirerPreviewRequestedWeek\?'&preview_week='\+inquirerPreviewRequestedWeek/);
 assert.match(ui,/Open the private Inquirer manuscript preview/);
 assert.doesNotMatch(ui,/Open the private Week 5 manuscript preview/);
});

test('editorial evolution removes known repeated jokes but still rewrites last-week copy',()=>{
 assert.match(source,/else out=intro\+' '/);
 assert.doesNotMatch(source,/No need to romanticize it:/);
 assert.doesNotMatch(source,/Monday will have questions:/);
});

test('replacement publisher kill switch is enforced in worker as well as scheduler',()=>{
 assert.match(pub,/inquirer-background-replacement-publisher-held/);
 assert.match(pub,/replacement&&enabled!=='true'/);
 assert.ok(pub.indexOf("replacement&&enabled!=='true'")<pub.indexOf('await statusStore.setJSON('));
});

test('private deploy previews cannot invoke publishing worker even with valid queue credentials',()=>{
 assert.match(pub,/inquirer-background-preview-write-held/);
 assert.match(pub,/deploy-\(\?:preview\|branch\)-/);
 assert.ok(pub.indexOf('inquirer-background-preview-write-held')<pub.indexOf('const expected='));
});

test('preview publish worker returns 403 without touching blob stores',async()=>{
 const response=await publishInquirerInBackground(new Request('https://deploy-preview-402--transcendent-manatee-2f0123.netlify.app/.netlify/functions/inquirer-publish-background',{method:'POST',headers:{'x-fleeced-queue-key':'not-a-secret'}}));
 assert.equal(response.status,403);
 assert.match(await response.text(),/Preview deployment cannot publish/);
});
