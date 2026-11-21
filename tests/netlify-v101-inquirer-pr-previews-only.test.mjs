import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const source=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
const match=source.match(/^\s*ignore = (".*")$/m);
assert(match,'Netlify build-ignore command must exist');
const command=JSON.parse(match[1]);
const run=(siteId,context,reviewId='',branch='feature')=>{
 const res=spawnSync('sh',['-c',command],{
  env:{...process.env,SITE_ID:siteId,SITE_NAME:'',CONTEXT:context,REVIEW_ID:String(reviewId),BRANCH:branch},
  encoding:'utf8'});
 assert.equal(res.error,undefined,res.stderr);
 return res.status;
};
const current='a516be3b-6c65-4f54-a9fb-23c5361bf3d2';
const old='fa33dfe4-8293-441e-8da0-25cc66fc984c';
const unknown='00000000-0000-0000-0000-000000000000';
test('only exact selected Inquirer PRs build deploy previews on verified V101 site',()=>{
 for(const review of ['563','564','565','566','567'])
  assert.equal(run(current,'deploy-preview',review),1,'allowed PR '+review);
 for(const review of ['0','402','499','562','568','999'])
  assert.equal(run(current,'deploy-preview',review),0,'unapproved PR '+review);
});
test('zero production or branch deploys are authorized by the new preview allowlist',()=>{
 for(const review of ['563','564','565','566','567']){
  assert.equal(run(current,'production',review),0);
  assert.equal(run(current,'branch-deploy',review),0);
  assert.equal(run(unknown,'deploy-preview',review),0);
  assert.equal(run(old,'deploy-preview',review),0);
 }
});
test('existing authorized retired-site PR previews remain unchanged',()=>{
 assert.equal(run(old,'deploy-preview','448'),1);
 assert.equal(run(old,'deploy-preview','450'),1);
 assert.equal(run(old,'deploy-preview','563'),0);
});
test('the original one-time V101 production commit gate remains unchanged and cannot be activated by PR identity',()=>{
 assert.match(command,/e\.CONTEXT==='production'&&e\.BRANCH==='main'/);
 assert.match(command,/Release FFL V101 site deploy once 2026-11-20/);
 assert.match(command,/process\.exit\(oldPreview\|\|currentPreview\|\|oneTime\?1:0\)/);
});
