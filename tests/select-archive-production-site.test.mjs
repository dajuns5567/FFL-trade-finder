import test from 'node:test';
import assert from 'node:assert/strict';
import {selectArchiveProductionSite as choose} from '../scripts/select-archive-production-site.mjs';
const id='b1a7f3c4-7c1c-4a5b-8d5f-01fa768b9323';
const goodSite={id,ssl_url:'https://example.netlify.app',build_settings:{repo_url:'https://github.com/dajuns5567/FFL-trade-finder'}};
const d={id:'deploy1',state:'ready',context:'production',branch:'main',commit_ref:'older',published_at:'2026-10-16T03:00:00Z'};
const pick=(sites=[goodSite],ds={[id]:[d]},opts={})=>choose(sites,ds,{repository:'dajuns5567/FFL-trade-finder',branch:'main',expectedSiteId:id,targetSha:'newer',...opts});
test('verified old production commit does not block source selection',()=>{const s=pick();assert.equal(s.site_id,id);assert.equal(s.matched_target_sha,false)});
test('exact deploy SHA is diagnostic',()=>assert.equal(pick(undefined,undefined,{targetSha:'older'}).matched_target_sha,true));
test('rejects unpinned source',()=>assert.throws(()=>pick(undefined,undefined,{expectedSiteId:''}),/required/));
test('rejects different site',()=>assert.throws(()=>pick([{...goodSite,id:'other'}]),/missing or ambiguous/));
test('rejects wrong repo',()=>assert.throws(()=>pick([{...goodSite,build_settings:{repo_url:'https://github.com/other/repo'}}]),/repository linkage mismatch/));
test('rejects non-production deployment',()=>assert.throws(()=>pick(undefined,{[id]:[{...d,context:'deploy-preview'}]}),/no ready/));
test('rejects wrong branch',()=>assert.throws(()=>pick(undefined,{[id]:[{...d,branch:'feature'}]}),/no ready/));
test('rejects non-ready',()=>assert.throws(()=>pick(undefined,{[id]:[{...d,state:'building'}]}),/no ready/));
test('rejects unencrypted site URL',()=>assert.throws(()=>pick([{...goodSite,ssl_url:'',url:'http://unsafe.netlify.app'}]),/HTTPS/));
test('uses latest verified deploy, not arbitrary first',()=>{const s=pick(undefined,{[id]:[d,{...d,id:'deploy2',commit_ref:'newer',published_at:'2026-10-16T04:00:00Z'}]});assert.equal(s.deploy_id,'deploy2')});

test('writer and read-only acceptance pin the same active Netlify project; previews cannot write',async()=>{
 const {readFile}=await import('node:fs/promises');
 const writer=await readFile(new URL('../.github/workflows/value-history-archive.yml',import.meta.url),'utf8');
 const verify=await readFile(new URL('../.github/workflows/fleeced-archive-live-source-acceptance.yml',import.meta.url),'utf8');
 const active='a516be3b-6c65-4f54-a9fb-23c5361bf3d2';
 for(const source of [writer,verify]){
  assert.ok(source.includes("VALUE_HISTORY_PRODUCTION_SITE_ID: '"+active+"'"));
  assert.ok(source.includes('NETLIFY_SANDBOX_DEPLOY_TOKEN'));
 }
 assert.match(writer,/if: github\.ref == 'refs\/heads\/main'/);
 assert.match(writer,/if: steps\.active_site\.outputs\.matched_target_sha == 'true'/);
 assert.ok(verify.includes('https://animated-dasik-3de74a.netlify.app/'));
});
