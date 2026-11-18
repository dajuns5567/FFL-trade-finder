import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const scheduled=readFileSync(new URL('../netlify/functions/inquirer-publish-scheduled.mjs',import.meta.url),'utf8');
const worker=readFileSync(new URL('../netlify/functions/inquirer-publish-background.mjs',import.meta.url),'utf8');

test('new unregistered Netlify SITE_ID is rejected before recognizing old hostnames',()=>{
 for(const [name,source] of [['scheduler',scheduled],['worker',worker]]){
  assert.match(source,/const registeredSiteIds=new Set\(/,name);
  assert.match(source,/if\(siteId&&!registeredSiteIds\.has\(siteId\)\)/,name);
  assert.ok(source.indexOf('if(siteId&&!registeredSiteIds.has(siteId))')<
    source.indexOf('const isCurrentSite='),name+' must reject new IDs before known-host fallback');
  for(const id of [
   'fa33dfe4-8293-441e-8da0-25cc66fc984c',
   '3b9ae5bd-0d0f-4570-b2b7-89afae8a0e5f',
   '8776d155-bc7b-4dcd-bafc-3d70d3d51800'
  ])assert.ok(source.includes(id),name+' previously approved site still present');
 }
});
test('unknown host or name is fail-closed and new-site activation remains gated',()=>{
 assert.match(scheduled,/if\(!isReplacement\)return skip\('Unrecognized Netlify site:/);
 assert.match(worker,/if\(!replacement\)\{/);
 assert.match(scheduled,/if\(isReplacement&&publishingEnabled!=='true'\)/);
 assert.match(worker,/if\(replacement&&enabled!=='true'\)/);
 assert.match(scheduled,/verifiedNewSiteCutoverHistory/);
 assert.match(worker,/verifiedNewSiteCutoverHistory/);
 assert.match(scheduled,/verifiedWeekNineAutopublishCutoverHistory/);
 assert.match(worker,/verifiedWeekNineAutopublishCutoverHistory/);
});
test('both entry points refuse deploy previews and branch deploys',()=>{
 for(const source of [scheduled,worker]){
  assert.match(source,/context==='deploy-preview'/);
  assert.match(source,/context==='branch-deploy'/);
 }
});
