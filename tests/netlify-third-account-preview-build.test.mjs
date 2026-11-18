import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const config=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
const literal=config.match(/^\s*ignore = (".*")$/m)?.[1];
assert.ok(literal,'Netlify build.ignore must be present');
const command=JSON.parse(literal);

function exitCode({siteId,siteName,context,reviewId='',approvedSiteId=''}) {
 const result=spawnSync('sh',['-c',command],{
  env:{...process.env,SITE_ID:siteId,SITE_NAME:siteName,CONTEXT:context,REVIEW_ID:reviewId,
    FLEECED_NEXT_NETLIFY_PREVIEW_SITE_ID:approvedSiteId},
  encoding:'utf8'
 });
 assert.equal(result.error,undefined,result.stderr);
 return result.status;
}
test('only the explicitly opted-in replacement site may build preview PR #501',()=>{
 const id='11111111-1111-4111-8111-111111111111',name='fleeced-next-preview';
 assert.equal(exitCode({siteId:id,siteName:name,context:'deploy-preview',reviewId:'501',approvedSiteId:id}),1);
 assert.equal(exitCode({siteId:id,siteName:name,context:'deploy-preview',reviewId:'501'}),0);
 assert.equal(exitCode({siteId:id,siteName:name,context:'deploy-preview',reviewId:'499',approvedSiteId:id}),0);
 assert.equal(exitCode({siteId:id,siteName:name,context:'deploy-preview',reviewId:'500',approvedSiteId:id}),0);
 assert.equal(exitCode({siteId:id,siteName:name,context:'deploy-preview',reviewId:'501',approvedSiteId:'22222222-2222-4222-8222-222222222222'}),0);
 assert.equal(exitCode({siteId:id,siteName:name,context:'production',reviewId:'501',approvedSiteId:id}),0);
 assert.equal(exitCode({siteId:id,siteName:name,context:'branch-deploy',reviewId:'501',approvedSiteId:id}),0);
});
test('current and previous Netlify accounts never build even with copied approval',()=>{
 for(const [siteId,siteName] of [
  ['fa33dfe4-8293-441e-8da0-25cc66fc984c','precious-dango-fb4633'],
  ['8776d155-bc7b-4dcd-bafc-3d70d3d51800','transcendent-manatee-2f0123'],
  ['3b9ae5bd-0d0f-4570-b2b7-89afae8a0e5f','gleaming-dodol-8dbc4a']
 ])assert.equal(exitCode({siteId,siteName,context:'deploy-preview',reviewId:'501',approvedSiteId:siteId}),0);
});
test('handoff ignores production, branch deploys and unrelated preview PRs',()=>{
 assert.match(config,/e\\.CONTEXT==='deploy-preview'/);
 assert.match(config,/String\\(e\\.REVIEW_ID\\)==='501'/);
 assert.match(config,/FLEECED_NEXT_NETLIFY_PREVIEW_SITE_ID/);
 assert.doesNotMatch(config,/e\\.CONTEXT==='production'/);
});
