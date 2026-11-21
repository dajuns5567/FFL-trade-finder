import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import schedule from '../netlify/functions/inquirer-publish-scheduled.mjs';
import worker from '../netlify/functions/inquirer-publish-background.mjs';

const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const scheduler=source('../netlify/functions/inquirer-publish-scheduled.mjs');
const publisher=source('../netlify/functions/inquirer-publish-background.mjs');
const hub=source('../netlify/functions/league-hub.mjs');
const siteId='a516be3b-6c65-4f54-a9fb-23c5361bf3d2';
const hostname='animated-dasik-3de74a.netlify.app';

test('2026-11-21 verified V101 Netlify site identity is recognized by scheduler, worker and independent-copy gate',()=>{
 assert.match(scheduler,/siteId==='a516be3b-6c65-4f54-a9fb-23c5361bf3d2'/);
 assert.match(scheduler,/host==='animated-dasik-3de74a\.netlify\.app'/);
 assert.match(publisher,/siteId==='a516be3b-6c65-4f54-a9fb-23c5361bf3d2'/);
 assert.match(publisher,/host==='animated-dasik-3de74a\.netlify\.app'/);
 assert.match(hub,/publicationSiteId==='a516be3b-6c65-4f54-a9fb-23c5361bf3d2'/);
 assert.match(hub,/publicationHost==='animated-dasik-3de74a\.netlify\.app'/);
 assert.match(hub,/const independentCopy=currentPublisherSite&&week>=9\?/);
});
test('newest site publisher stays disabled without explicit restore authorization',async()=>{
 const result=await schedule(new Request('https://'+hostname+'/.netlify/functions/inquirer-publish-scheduled'));
 const resultJson=await result.json();
 assert.equal(resultJson.queued,false);
 assert.match(resultJson.reason,/Replacement site is preview-only pending verified archive migration/);
 const denied=await worker(new Request('https://'+hostname+'/.netlify/functions/inquirer-publish-background',{
  method:'POST',headers:{'x-fleeced-queue-key':'untrusted'}}));
 assert.equal(denied.status,403);
 assert.match(await denied.text(),/Publication disabled on replacement site/);
});
test('latest site branch deployments are nonwriting even without CONTEXT environment',async()=>{
 const host='inquirer-review--'+hostname;
 const denied=await worker(new Request('https://'+host+'/.netlify/functions/inquirer-publish-background',{
  method:'POST',headers:{'x-fleeced-queue-key':'untrusted'}}));
 assert.equal(denied.status,403);
 assert.match(await denied.text(),/Preview deployment cannot publish/);
 const res=await schedule(new Request('https://'+host+'/.netlify/functions/inquirer-publish-scheduled'));
 assert.equal((await res.json()).queued,false);
});
test('replacement-site publisher still checks verified original Weeks 3–6 plus index, awards before writing',()=>{
 const scheduledStart=scheduler.indexOf('if(isNewestSite){');
 const schedulerChecks=scheduler.slice(scheduledStart,scheduledStart+1600);
 assert.match(schedulerChecks,/verifiedNewSiteCutoverHistory/);
 const workerStart=publisher.indexOf('if(isNewestSite){');
 const workerChecks=publisher.slice(workerStart,workerStart+2100);
 assert.match(workerChecks,/verifiedNewSiteCutoverHistory/);
 assert.match(workerChecks,/if\(!checked\.ready\|\|!autoCutover\.ready\)/);
 assert(worker.indexOf("replacement&&enabled!=='true'")<worker.indexOf("const statusStore=getStore("));
 assert(worker.indexOf('if(isNewestSite){')<worker.indexOf("await statusStore.setJSON('inquirer/publication-status.json'"));
});
test('current site identity does not inherit legacy site-only Week 7–8 cutover worker',()=>{
 assert.match(scheduler,/const isCurrentSite=site==='precious-dango-fb4633'/);
 assert.match(scheduler,/if\(isCurrentSite\)\{/);
 assert.match(publisher,/const isCurrentSite=siteId==='fa33dfe4-8293-441e-8da0-25cc66fc984c'/);
 assert.doesNotMatch(scheduler,/const isCurrentSite=site==='animated-dasik/);
 assert.match(scheduler,/if\(isReplacement&&publishingEnabled!=='true'\)/);
});
