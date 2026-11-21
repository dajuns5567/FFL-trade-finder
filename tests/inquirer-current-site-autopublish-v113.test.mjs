import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ACTIVE_INQUIRER_SITE_ID,ACTIVE_INQUIRER_SITE_NAME,inquirerPublisherSite} from '../netlify/functions/lib/inquirer-publisher-site.mjs';
import {CUTOVER_SITE_ID,cutoverRuntimeHoldReason} from '../netlify/functions/lib/inquirer-cutover-runtime.mjs';

const active={siteId:ACTIVE_INQUIRER_SITE_ID,siteName:ACTIVE_INQUIRER_SITE_NAME,
 host:ACTIVE_INQUIRER_SITE_ID+'.netlify.app',context:'production'};
test('only the actual current Netlify account is eligible for unattended publication',()=>{
 assert.equal(inquirerPublisherSite(active).active,true);
 assert.equal(inquirerPublisherSite({host:ACTIVE_INQUIRER_SITE_ID+'.netlify.app',context:'production'}).active,true);
 assert.equal(inquirerPublisherSite({siteId:'not-the-site',host:ACTIVE_INQUIRER_SITE_ID+'.netlify.app',context:'production'}).active,false);
 assert.equal(CUTOVER_SITE_ID,ACTIVE_INQUIRER_SITE_ID);
 assert.equal(inquirerPublisherSite({...active,context:'deploy-preview'}).active,false);
 assert.equal(inquirerPublisherSite({...active,context:'branch-deploy'}).active,false);
 assert.equal(inquirerPublisherSite({...active,host:'deploy-preview-555--'+ACTIVE_INQUIRER_SITE_NAME+'.netlify.app'}).active,false);
 for(const siteId of ['fa33dfe4-8293-441e-8da0-25cc66fc984c','3b9ae5bd-0d0f-4570-b2b7-89afae8a0e5f','8776d155-bc7b-4dcd-bafc-3d70d3d51800']){
  assert.equal(inquirerPublisherSite({...active,siteId}).active,false,'retired account cannot write: '+siteId);
 }
 assert.equal(inquirerPublisherSite({...active,siteId:'random'}).active,false);
 assert.equal(inquirerPublisherSite({siteId:'random',host:ACTIVE_INQUIRER_SITE_NAME+'.netlify.app'}).active,false,
  'a forged Host must not override SITE_ID');
});

test('Netlify cutover worker refuses wrong-account, preview and publisher-disabled writes',()=>{
 const run=(obj)=>cutoverRuntimeHoldReason({...active,enabled:'true',...obj});
 assert.equal(run({context:'production',siteId:ACTIVE_INQUIRER_SITE_ID}),null);
 assert.equal(run({context:'production',siteId:'fa33dfe4-8293-441e-8da0-25cc66fc984c'}),'wrong-site');
 assert.equal(run({context:'deploy-preview'}),'not-production');
 assert.equal(run({enabled:'false'}),'publisher-disabled');
});

test('scheduled Inquirer poll checks current site before any restored-history or publication writes',()=>{
 const source=readFileSync('netlify/functions/inquirer-publish-scheduled.mjs','utf8');
 assert.match(source,/inquirerPublisherSite\(\{siteId,siteName:site,host,context\}\)/);
 assert.match(source,/if\(!route\.active\)return skip\(route\.reason\)/);
 assert.match(source,/publishingEnabled!=='true'/);
 assert.match(source,/verifiedReplacementHistory/);
 assert.match(source,/verifiedNewSiteCutoverHistory/);
 assert.match(source,/verifiedWeekNineAutopublishCutoverHistory/);
 assert.match(source,/inquirerScheduleDecision/);
 assert.match(source,/resolveInquirerQueueCredential/);
 assert.match(source,/bootstrap:isCurrentSite/);
 assert.match(source,/if\(\!configuredKey&&\!isCurrentSite\)/);
});

test('background worker independently checks same site identity, queue key, locked archive and feature package',()=>{
 const source=readFileSync('netlify/functions/inquirer-publish-background.mjs','utf8');
 assert.match(source,/inquirerPublisherSite\(\{siteId,siteName,host,context\}\)/);
 assert.match(source,/if\(!route\.active\)/);
 assert.match(source,/if\(replacement&&enabled!=='true'\)/);
 assert.match(source,/inquirerQueueKeyMatches\(expected,req\.headers\.get\('x-fleeced-queue-key'\)\)/);
 assert.match(source,/verifiedNewSiteCutoverHistory/);
 assert.match(source,/verifiedWeekNineAutopublishCutoverHistory/);
 assert.match(source,/hasCompleteWeekFeaturePackage\(report,awards\)/);
 assert.match(source,/published_locked===true/);
});

test('latest account has separately isolated preview diagnostics without any production renderer override',()=>{
 const source=readFileSync('netlify/functions/lib/inquirer-preview-diagnostics.mjs','utf8');
 assert.match(source,/animated-dasik-3de74a/);
 assert.match(source,/deploy-preview-\\d+/); // exact numbered preview host remains mandatory
 assert.match(source,/privatePreviewStoreName/);
});
