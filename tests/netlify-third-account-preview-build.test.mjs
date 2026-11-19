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
test('only PR #499 can build on verified next Netlify account as deploy-preview',()=>{
 const siteId='a516be3b-6c65-4f54-a9fb-23c5361bf3d2',siteName='animated-dasik-3de74a';
 assert.equal(exitCode({siteId,siteName,context:'deploy-preview',reviewId:'499'}),1);
 for(const reviewId of ['448','450','466','500','501'])
  assert.equal(exitCode({siteId,siteName,context:'deploy-preview',reviewId}),0);
 assert.equal(exitCode({siteId,siteName,context:'production',reviewId:'499'}),0);
 assert.equal(exitCode({siteId,siteName,context:'branch-deploy',reviewId:'499'}),0);
 assert.equal(exitCode({siteId:'11111111-1111-4111-8111-111111111111',siteName,context:'deploy-preview',reviewId:'499'}),0);
});
test('previous accounts skip builds even for deploy-preview context',()=>{
 for(const [siteId,siteName] of [
  ['8776d155-bc7b-4dcd-bafc-3d70d3d51800','transcendent-manatee-2f0123'],
  ['3b9ae5bd-0d0f-4570-b2b7-89afae8a0e5f','gleaming-dodol-8dbc4a']
 ]){
  assert.equal(exitCode({siteId,siteName,context:'deploy-preview'}),0);
 }
});

test('production cutover never spends deploy preview credits',()=>{
 assert.match(config,/e\.CONTEXT==='deploy-preview'/);
 assert.match(config,/String\(e\.REVIEW_ID\)==='499'/);
 assert.match(config,/a516be3b-6c65-4f54-a9fb-23c5361bf3d2/);
 assert.doesNotMatch(config,/e\.CONTEXT==='production'/);
});
