import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const toml=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8'),
 command=JSON.parse(toml.match(/^\s*ignore = (".*")$/m)[1]);
const subject='Release FFL Inquirer Week9 attributed reader correction 2026-11-21';
const site='a516be3b-6c65-4f54-a9fb-23c5361bf3d2';
function git(dir,commit){
 const r=spawnSync('git',['-c','user.name=Inquirer Audit','-c','user.email=inquirer@example.invalid',
  'commit','--allow-empty','-q','-m',commit],{cwd:dir,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
}
const gate=(dir,{siteId=site,branch='main',context='production',reviewId=''}={})=>{
 const r=spawnSync('sh',['-c',command],{cwd:dir,encoding:'utf8',
  env:{...process.env,SITE_ID:siteId,SITE_NAME:'animated-dasik-3de74a',BRANCH:branch,CONTEXT:context,REVIEW_ID:reviewId}});
 assert.equal(r.error,undefined,r.stderr);return r.status;
};
test('only the exact owner-authorized Week 9 reader correction commit can deploy production',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ffl-week09-reader-release-'));
 try{
  assert.equal(spawnSync('git',['init','-q'],{cwd:dir}).status,0);
  git(dir,subject);
  assert.equal(gate(dir),1);
  assert.equal(gate(dir,{context:'deploy-preview'}),0);
  assert.equal(gate(dir,{context:'branch-deploy'}),0);
  assert.equal(gate(dir,{branch:'other'}),0);
  assert.equal(gate(dir,{siteId:'fa33dfe4-8293-441e-8da0-25cc66fc984c'}),0);
  git(dir,'unrelated site update after Week 9');
  assert.equal(gate(dir),0);
  git(dir,'Release FFL Inquirer Week9 attributed reader correction 2026-11-22');
  assert.equal(gate(dir),0);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
