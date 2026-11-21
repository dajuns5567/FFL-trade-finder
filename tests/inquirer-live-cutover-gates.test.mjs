import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {originalInquirerRestoreGate,ORIGINAL_INQUIRER_RESTORE_SITE_ID} from '../netlify/functions/lib/inquirer-archive-restore-runtime.mjs';
import restoreHandler from '../netlify/functions/inquirer-original-archive-restore-background.mjs';

const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const scheduler=source('../netlify/functions/inquirer-publish-scheduled.mjs');
const background=source('../netlify/functions/inquirer-publish-background.mjs');
const restoration=source('../netlify/functions/inquirer-original-archive-restore-background.mjs');
const good={siteId:ORIGINAL_INQUIRER_RESTORE_SITE_ID,context:'production',
 host:'animated-dasik-3de74a.netlify.app',enabled:'true',approved:'true'};

test('production identity and independent owner restoration authorization both required',()=>{
 assert.equal(originalInquirerRestoreGate(good).allowed,true);
 for(const invalid of [
  {...good,siteId:'fa33dfe4-8293-441e-8da0-25cc66fc984c'},
  {...good,context:'deploy-preview'},
  {...good,context:'branch-deploy'},
  {...good,context:''},
  {...good,enabled:''},
  {...good,approved:''},
  {...good,host:'deploy-preview-568--animated-dasik-3de74a.netlify.app'},
  {...good,host:'review--animated-dasik-3de74a.netlify.app'}
 ])assert.equal(originalInquirerRestoreGate(invalid).allowed,false,JSON.stringify(invalid));
});
test('restoration route denies unauthenticated and preview attempts before any Blob store access',async()=>{
 const request=new Request('https://deploy-preview-568--animated-dasik-3de74a.netlify.app/.netlify/functions/inquirer-original-archive-restore-background',{
  method:'POST',headers:{'x-fleeced-queue-key':'untrusted'}
 });
 const response=await restoreHandler(request,{deploy:{context:'deploy-preview'}});
 assert.equal(response.status,403);
 assert.match(await response.text(),/disabled/);
 assert(restoration.indexOf('originalInquirerRestoreGate(')<restoration.indexOf('getStore('));
 assert(restoration.indexOf('inquirerQueueKeyMatches(')<restoration.indexOf("store.setJSON(markerKey,running"));
});
test('scheduler queues original archive recovery before any normal weekly job, and never on a preview',()=>{
 const restore=scheduler.indexOf('if(siteId===ORIGINAL_INQUIRER_RESTORE_SITE_ID){');
 const legacy=scheduler.indexOf('if(isCurrentSite){',restore);
 const weekly=scheduler.indexOf("const url=new URL('/.netlify/functions/inquirer-publish-background',req.url)");
 assert(restore>0&&restore<legacy&&legacy<weekly);
 assert.match(scheduler,/FLEECED_INQUIRER_ARCHIVE_RESTORE_APPROVED/);
 assert.match(scheduler,/marker\?\.state==='running'/);
 assert.match(scheduler,/marker\?\.state==='error'/);
 assert.match(scheduler,/if\(resp.status!==202\)return skip/);
 assert(scheduler.indexOf("host.includes('--')")<restore);
});
test('completed Week 2 cursor can only advance after verified original restore without masking an editorial hold',()=>{
 assert.match(scheduler,/const originalRestoredSite=siteId===ORIGINAL_INQUIRER_RESTORE_SITE_ID/);
 assert.match(scheduler,/Number\(status.week\)<9&&status.state==='completed'&&status.available===true/);
 assert.match(scheduler,/week:originalRestoredSite\?9:isCurrentSite\?8:6/);
 assert.match(scheduler,/if\(status.state==='editorial-hold'/);
});
test('live publisher independently verifies Week 9 original award-backed lock and cutover marker before status writes',()=>{
 const preflight=background.indexOf("if(isRestoredSite&&checked.ready&&autoCutover.ready)");
 const write=background.indexOf("await statusStore.setJSON('inquirer/publication-status.json'");
 assert(preflight>0&&preflight<write);
 assert.match(background,/originalMarker\?\.state!=='completed'/);
 assert.match(background,/originalMarker.verified_weeks.join\(','\)!=='3,4,5,6,7,8,9'/);
 assert.match(background,/isLockedInquirerEdition\(nine,2026,9\)/);
 assert.match(background,/hasCompleteWeekFeaturePackage\(nine,awards\)/);
 assert.match(background,/inquirer-new-site-original-week9-archive-hold/);
});
test('original restore only changes canonical 3-9 keys, archive index and awards; never publishes Week 10',()=>{
 assert.match(restoration,/applyApprovedImmutableInquirerRestore/);
 assert.match(restoration,/inspectPublisherArchiveReadiness/);
 assert.match(restoration,/state:'completed',season:2026,through_week:9/);
 assert.doesNotMatch(restoration,/setJSON\('inquirer\/publication-status\.json'/);
 assert.doesNotMatch(restoration,/setJSON\('broadcasts\/2026\/week-10\.json'/);
 assert.match(restoration,/original_weeks_unchanged:true,unpublished_week_10_excluded:true/);
});
