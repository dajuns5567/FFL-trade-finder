import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const worker=readFileSync(new URL('../netlify/functions/inquirer-cutover-background.mjs',import.meta.url),'utf8');
const scheduler=readFileSync(new URL('../netlify/functions/inquirer-publish-scheduled.mjs',import.meta.url),'utf8');
const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
const config=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
test('production cutover requires exact owner-approved site, context and queue secret',()=>{
 assert.match(worker,/siteId!==SITE_ID/);
 assert.match(worker,/host===SITE_HOST/);
 assert.match(worker,/host===SITE_ID\+'\.netlify\.app'/);
 assert.match(worker,/!authorizedHost/);
 assert.match(worker,/context!=='production'/);
 assert.match(worker,/enabled!=='true'/);
 assert.match(worker,/inquirerQueueKeyMatches/);
 assert.match(worker,/req\.method!=='POST'/);
 assert.match(worker,/FORWARD_EDITORIAL_REVISION!==107/);
 assert.match(worker,/privatePreviewStoreName/);
 assert.match(scheduler,/isCurrentSite/);
 assert.match(scheduler,/verifiedNewSiteCutoverHistory/);
 assert.match(scheduler,/inquirer-cutover-background/);
 assert.match(scheduler,/publishingEnabled!=='true'/);
 assert.match(config,/CONTEXT==='deploy-preview'/);
});
test('private copies must pass cross-week audit before ANY create-only publication write',()=>{
 const copies=worker.indexOf('const [draft7,draft8]');
 const check=worker.indexOf('const independent=auditIndependentInquirerCopy');
 const lock=worker.indexOf('const locked=[draft7,draft8]');
 const firstWrite=worker.indexOf('const write=await store.setJSON(path,edition');
 assert.ok(copies>=0&&check>copies&&lock>check&&firstWrite>lock);
 assert.match(worker,/if\(!independent\.ok\)/);
 assert.match(worker,/if\(!isLockedInquirerEdition/);
 assert.match(worker,/if\(!completeFeature\(record\)\)/);
 assert.match(worker,/additionalLockedEditions:locked,persist:false,onlyAdditional:true/);
 assert.match(worker,/onlyIfNew:true/);
 assert.match(worker,/if\(!jsonEqual\(await store\.get\(path/);
});
test('historical archives remain unmodified and index commit is LAST',()=>{
 assert.match(worker,/verifiedNewSiteCutoverHistory/);
 assert.match(worker,/for\(const prior of oldAwards\.records\)/);
 assert.match(worker,/ensureLockedEditionIndexed\(store,edition,path,\{commitIndex:false\}\)/);
 const awards=worker.indexOf("store.setJSON('awards/weekly.json',packagePreview");
 const index=worker.indexOf("store.setJSON('broadcasts/index.json',nextIndex");
 const status=worker.indexOf("store.setJSON('inquirer/publication-status.json'");
 assert.ok(awards>=0&&index>awards&&status>index);
 assert.match(worker,/onlyIfMatch:awardsMeta\.etag/);
 assert.match(worker,/onlyIfMatch:metadata\.etag/);
 assert.match(hub,/weeklyAwards\(\{additionalLockedEditions=\[\],persist=true,onlyAdditional=false\}=\{\}\)/);
 assert.match(hub,/if\(persist&&\(missing\.length/);
 assert.match(hub,/ensureLockedEditionIndexed\(s,edition,key,\{commitIndex=true\}=\{\}\)/);
 assert.match(hub,/if\(!committed&&commitIndex\)/);
});
test('no manually called production endpoint can bypass unattended publication hold',()=>{
 assert.match(scheduler,/marker\?\.state==='running'/);
 assert.match(scheduler,/marker\?\.state==='error'/);
 assert.match(worker,/const priorStatus=await store\.get\(STATE/);
 assert.match(worker,/priorStatus\?\.state==='running'/);
 assert.match(worker,/priorStatus\?\.state==='completed'/);
 assert.match(worker,/inquirer\/publication-status\.json/);
 assert.doesNotMatch(worker,/weeklyReport\(/);
});

test('staged awards only compute approved Week 7–8 and preserve all prior award entries',()=>{
 assert.match(hub,/onlyAdditional\?\{reports:\[\]\}:await broadcastArchive\(\)/);
 assert.match(hub,/onlyAdditional\?\[\.\.\.records/);
 assert.match(worker,/onlyAdditional:true/);
});
