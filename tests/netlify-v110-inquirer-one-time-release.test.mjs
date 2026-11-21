import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const config=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
const command=JSON.parse(config.match(/^\s*ignore = (".*")$/m)[1]);
const exact='Release FFL Inquirer V110 original-history cutover 2026-11-21';
const siteId='a516be3b-6c65-4f54-a9fb-23c5361bf3d2';
const makeDir=()=>mkdtempSync(join(tmpdir(),'ffl-inquirer-onetime-'));
function git(dir,subject){
 const res=spawnSync('git',['-c','user.email=test@example.invalid','-c','user.name=Release Test',
  'commit','--allow-empty','-q','-m',subject],{cwd:dir,encoding:'utf8'});
 assert.equal(res.status,0,res.stderr);
}
function run(dir,{subject,context='production',site=siteId,branch='main',reviewId=''}={}){
 const env={...process.env,SITE_ID:site,SITE_NAME:'animated-dasik-3de74a',
  CONTEXT:context,BRANCH:branch,REVIEW_ID:reviewId};
 const res=spawnSync('sh',['-c',command],{cwd:dir,env,encoding:'utf8'});
 assert.equal(res.error,undefined,res.stderr);
 return res.status;
}
test('single exact authorized Inquirer V110 release subject builds only current production site',()=>{
 const dir=makeDir();try{
  assert.equal(spawnSync('git',['init','-q'],{cwd:dir}).status,0);
  git(dir,exact);
  assert.equal(run(dir),1);
  assert.equal(run(dir,{context:'deploy-preview'}),0);
  assert.equal(run(dir,{context:'branch-deploy'}),0);
  assert.equal(run(dir,{site:'fa33dfe4-8293-441e-8da0-25cc66fc984c'}),0);
  assert.equal(run(dir,{branch:'feature'}),0);
  git(dir,'unrelated follow-up');
  assert.equal(run(dir),0);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('other similar titles or unauthorized deployment contexts cannot trigger release',()=>{
 const dir=makeDir();try{
  assert.equal(spawnSync('git',['init','-q'],{cwd:dir}).status,0);
  for(const subject of [
   'Release FFL Inquirer V110 original-history cutover 2026-11-22',
   'Release FFL Inquirer V110 original-history cutover',
   'Release FFL Inquirer V111 original-history cutover 2026-11-21'
  ]){
   git(dir,subject);assert.equal(run(dir),0);
  }
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('a separate exact UUID scheduled-callback production hotfix is authorized once, not for unrelated commits',()=>{
 const dir=makeDir();try{
  assert.equal(spawnSync('git',['init','-q'],{cwd:dir}).status,0);
  git(dir,'Release FFL Inquirer V110 canonical scheduled host fix 2026-11-21');
  assert.equal(run(dir),1);
  assert.equal(run(dir,{context:'deploy-preview'}),0);
  assert.equal(run(dir,{site:'different-site'}),0);
  git(dir,'a future unrelated commit');
  assert.equal(run(dir),0);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
