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
test('only PR #501 on the verified successor site builds as a Deploy Preview',()=>{
 const id='a516be3b-6c65-4f54-a9fb-23c5361bf3d2',name='animated-dasik-3de74a';
 assert.equal(exitCode({siteId:id,siteName:name,context:'deploy-preview',reviewId:'501'}),1);
 assert.equal(exitCode({siteId:id,siteName:name,context:'deploy-preview',reviewId:'499'}),0);
 assert.equal(exitCode({siteId:id,siteName:name,context:'deploy-preview',reviewId:'500'}),0);
 assert.equal(exitCode({siteId:'11111111-1111-4111-8111-111111111111',siteName:name,context:'deploy-preview',reviewId:'501'}),0);
 assert.equal(exitCode({siteId:id,siteName:name,context:'production',reviewId:'501'}),0);
 assert.equal(exitCode({siteId:id,siteName:name,context:'branch-deploy',reviewId:'501'}),0);
});
test('current and previous Netlify accounts never build even with copied approval',()=>{
 for(const [siteId,siteName] of [
  ['fa33dfe4-8293-441e-8da0-25cc66fc984c','precious-dango-fb4633'],
  ['8776d155-bc7b-4dcd-bafc-3d70d3d51800','transcendent-manatee-2f0123'],
  ['3b9ae5bd-0d0f-4570-b2b7-89afae8a0e5f','gleaming-dodol-8dbc4a']
 ])assert.equal(exitCode({siteId,siteName,context:'deploy-preview',reviewId:'501',approvedSiteId:siteId}),0);
});
test('handoff ignores production, branch deploys and unrelated preview PRs',()=>{
 assert.match(config,/e\.CONTEXT==='deploy-preview'/);
 assert.match(config,/String\(e\.REVIEW_ID\)==='501'/);
 assert.match(config,/a516be3b-6c65-4f54-a9fb-23c5361bf3d2/);
 assert.doesNotMatch(config,/e\.CONTEXT==='production'/);
});
