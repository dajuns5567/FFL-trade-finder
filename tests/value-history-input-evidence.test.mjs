import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const collector=readFileSync(new URL('../scripts/value-history-headless-refresh.mjs',import.meta.url),'utf8');
const archive=readFileSync(new URL('../scripts/archive-value-history.mjs',import.meta.url),'utf8');

test('scheduled history records source provenance without changing valuation contract',()=>{
 assert.match(collector,/githubCommit:process\.env\.GITHUB_SHA\|\|null/);
 assert.match(collector,/scoringGeneratedAt:sleeper\.generatedAt\|\|null/);
 assert.match(collector,/scoringCompletedWeek:Number\(sleeper\.completedWeek\)/);
 assert.match(collector,/rankingDigest:digest\(entry\?\.data\)/);
 assert.match(collector,/inputEvidence:\{\.\.\.captured\.inputEvidence/);
 assert.match(collector,/version:5,league,t,fingerprint:fp,source:'scheduled'/);
 assert.match(collector,/canonicalParity:'exact'/);
});
test('snapshot collector verifies stable input identity across the final read pair',()=>{
 assert.match(collector,/JSON\.stringify\(first\.inputEvidence\)===JSON\.stringify\(second\.inputEvidence\)/);
 assert.match(collector,/sameRows\(first\.rows,second\.rows\)/);
});
test('archive preserves original snapshot rows and optional evidence unchanged',()=>{
 assert.match(archive,/JSON\.stringify\(snap,null,2\)/);
 assert.doesNotMatch(archive,/snap\.rows\s*=\s*snap\.rows\.map/);
 assert.doesNotMatch(archive,/Math\.min\(.*snap\.rows/);
});
