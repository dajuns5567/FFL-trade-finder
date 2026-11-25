import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const toml=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
const literal=toml.match(/^\s*ignore = (".*")$/m)?.[1];
assert.ok(literal,'Netlify build.ignore must remain present');
const command=JSON.parse(literal);
const intended='Release FFL V101 site deploy once 2026-11-20';
const site='a516be3b-6c65-4f54-a9fb-23c5361bf3d2';

const git=(dir,args)=>{
 const r=spawnSync('git',args,{cwd:dir,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 return r.stdout.trim();
};
const run=(dir,options={},gateCommand=command)=>{
 const env={
  ...process.env,SITE_ID:options.siteId??site,
  SITE_NAME:options.siteName??'animated-dasik-3de74a',
  BRANCH:options.branch??'main',
  CONTEXT:options.context??'production',
  REVIEW_ID:options.reviewId??''
 };
 // Git ignores any user-supplied GIT_DIR / work-tree overrides for this test.
 for(const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE'])delete env[key];
 const r=spawnSync('sh',['-c',gateCommand],{cwd:dir,env,encoding:'utf8'});
 assert.equal(r.error,undefined,r.stderr);
 return r.status;
};

test('one authorized Netlify production release, never ongoing auto-deployment',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ffl-netlify-release-'));
 try{
  git(dir,['init','-q']);
  git(dir,['-c','user.name=Release Test','-c','user.email=release@example.invalid',
   'commit','--allow-empty','-q','-m',intended]);
  assert.equal(run(dir),1,'build the exact authorized release subject on the current site');
  assert.equal(run(dir,{context:'deploy-preview'}),0,'not a preview release');
  assert.equal(run(dir,{branch:'other'}),0,'not a branch release');
  assert.equal(run(dir,{siteId:'fa33dfe4-8293-441e-8da0-25cc66fc984c'}),0,'retired site cannot production deploy');
  assert.equal(run(dir,{siteId:'not-the-site'}),0,'unknown site cannot deploy');
  git(dir,['-c','user.name=Release Test','-c','user.email=release@example.invalid',
   'commit','--allow-empty','-q','-m','next unrelated update']);
  assert.equal(run(dir),0,'subsequent normal main commits must skip production');
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('the old explicit preview allowlist remains isolated from production',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ffl-netlify-preview-'));
 try{
  git(dir,['init','-q']);
  for(const number of ['448','450'])
   assert.equal(run(dir,{siteId:'fa33dfe4-8293-441e-8da0-25cc66fc984c',
     siteName:'precious-dango-fb4633',context:'deploy-preview',reviewId:number}),1);
  assert.equal(run(dir,{siteId:'fa33dfe4-8293-441e-8da0-25cc66fc984c',
    context:'deploy-preview',reviewId:'451'}),0);
  assert.equal(run(dir,{siteId:'fa33dfe4-8293-441e-8da0-25cc66fc984c',
    context:'production',reviewId:'450'}),0);
 }finally{rmSync(dir,{recursive:true,force:true})}
});


test('verified Preview 630 can activate only from its pinned single parent and exact title',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ffl-630-release-'));
 const title='Release FFL verified Preview 630 once 2026-11-24';
 const pinned='379101e110f58db88aa1a79bcb42df3c0a3439e1';
 const commit=(message)=>git(dir,['-c','user.name=Release Test','-c','user.email=release@example.invalid','commit','--allow-empty','-q','-m',message]);
 try{
  git(dir,['init','-q']);commit('Fixture approved merged tree');
  const parent=git(dir,['rev-parse','HEAD']);
  assert.ok(command.includes(pinned),'real gate pins the audited main parent');
  const fixtureGate=command.replace(pinned,parent);
  assert.equal(run(dir,{},fixtureGate),0,'ordinary approved parent is not release');
  commit(title);
  assert.equal(run(dir),0,'real gate rejects a copied subject on an unapproved parent');
  assert.equal(run(dir,{},fixtureGate),1,'exact title and parent allow one controlled build');
  assert.equal(run(dir,{branch:'other'},fixtureGate),0);
  assert.equal(run(dir,{context:'deploy-preview'},fixtureGate),0);
  assert.equal(run(dir,{siteId:'wrong-site'},fixtureGate),0);
  commit(title);
  assert.equal(run(dir,{},fixtureGate),0,'same title on later parent cannot reopen production');
 }finally{rmSync(dir,{recursive:true,force:true})}
});
