import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const config=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
const literal=config.match(/^\s*ignore = (".*")$/m)?.[1];
assert.ok(literal,'Netlify build.ignore must be present');
const command=JSON.parse(literal);

function exitCode({siteId,siteName,context,reviewId=''}) {
 const result=spawnSync('sh',['-c',command],{
  env:{...process.env,SITE_ID:siteId,SITE_NAME:siteName,CONTEXT:context,REVIEW_ID:reviewId},
  encoding:'utf8'
 });
 assert.equal(result.error,undefined,result.stderr);
 return result.status;
}
test('only canonical-site production and allowlisted previews build',()=>{
 const dest='fa33dfe4-8293-441e-8da0-25cc66fc984c';
 assert.equal(exitCode({siteId:dest,siteName:'precious-dango-fb4633',context:'deploy-preview',reviewId:'450'}),1);
 assert.equal(exitCode({siteId:dest,siteName:'precious-dango-fb4633',context:'deploy-preview',reviewId:'456'}),1);
 assert.equal(exitCode({siteId:dest,siteName:'precious-dango-fb4633',context:'deploy-preview',reviewId:'448'}),1);
 assert.equal(exitCode({siteId:dest,siteName:'precious-dango-fb4633',context:'deploy-preview',reviewId:'451'}),0);
 assert.equal(exitCode({siteId:dest,siteName:'precious-dango-fb4633',context:'production',reviewId:'450'}),1);
 assert.equal(exitCode({siteId:dest,siteName:'precious-dango-fb4633',context:'branch-deploy',reviewId:'450'}),0);
 assert.equal(exitCode({siteId:dest,siteName:'precious-dango-fb4633',context:''}),0);
});
test('previous accounts skip builds even for deploy-preview context',()=>{
 for(const [siteId,siteName] of [
  ['8776d155-bc7b-4dcd-bafc-3d70d3d51800','transcendent-manatee-2f0123'],
  ['3b9ae5bd-0d0f-4570-b2b7-89afae8a0e5f','gleaming-dodol-8dbc4a']
 ]){
  assert.equal(exitCode({siteId,siteName,context:'deploy-preview'}),0);
 }
});

test('site-restricted deployment contexts remain separate',()=>{
 assert.match(config,/e\.CONTEXT==='deploy-preview'/);
 assert.match(config,/\['448','450','456'\]/);
 assert.match(config,/e\.CONTEXT==='production'/);
});
