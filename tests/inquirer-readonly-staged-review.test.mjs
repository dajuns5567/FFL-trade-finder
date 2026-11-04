import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('staged production review is read-only and never exports unpublished copy',()=>{
 const s=readFileSync(new URL('../scripts/audit-staged-inquirer-readonly.mjs',import.meta.url),'utf8');
 const workflow=readFileSync(new URL('../.github/workflows/inquirer-readonly-staged-preflight.yml',import.meta.url),'utf8');
 assert.match(s,/8776d155-bc7b-4dcd-bafc-3d70d3d51800/);
 assert.match(s,/editorialCopyDigest\(stage\.edition\)/);
 assert.match(s,/inspectEditionBeforePublication\(stage\.edition\)/);
 assert.match(s,/generation_quality_ok/);
 assert.match(s,/digest_matches_stage/);
 assert.match(s,/index_contains_week/);
 assert.doesNotMatch(s,/\.setJSON\(|\.set\(|writeFileSync\(|writeFile\(/);
 assert.doesNotMatch(s,/JSON\.stringify\(stage\.edition\)/);
 assert.match(workflow,/NETLIFY_SANDBOX_DEPLOY_TOKEN/);
 assert.doesNotMatch(workflow,/upload-artifact|approve-staged-inquirer\.mjs/);
});
