// Preview-only guard: no production authorization or unrelated runtime edits.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const checkpoint='01ae9ec284ccc0c503ee4ce06f7b3c3bef65d0c7',main='a1f3d19fe3524f97da9c51c2827607d74de4b38c';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
assert.equal(process.env.GITHUB_HEAD_REF,'fix/inquirer-daily-default-closed-20261125');
assert.equal(git('rev-parse','origin/main'),main);
assert.equal(git('ls-remote','origin','refs/heads/archive/desktop-release-630-20261125').split(/\s+/)[0],main);
execFileSync('git',['merge-base','--is-ancestor',checkpoint,'HEAD']);
assert.deepEqual(git('diff','--name-only',checkpoint,'HEAD').split('\n').filter(Boolean).sort(),[".github/workflows/inquirer-daily-default-closed.yml",".github/workflows/mobile-presentation-v631.yml",".github/workflows/netlify-v101-one-time-release-gate-ci.yml",".github/workflows/release-v107-recorder-after-market-ui-isolated.yml",".github/workflows/release-v112-team-trade-linkage-ci.yml",".github/workflows/release-v114-historical-pick-projection-ci.yml",".github/workflows/release-v116-market-period-parity-ci.yml","fleeced-header-v512.js","league-hub-v451.js","netlify.toml","netlify/functions/site-v29.mjs","scripts/audit-combined-weekly-badge-provenance.mjs","scripts/audit-inquirer-closed-preview-scope.mjs","tests/inquirer-daily-default-closed.test.mjs"],'Only isolated Inquirer changes on reviewed 641');
const pins={'league-hub-v451.js':'6010c0811eeabe05c5d72e79e625a966ac2efd67','fleeced-header-v512.js':'5ad4bddfdc318d087cecc074df2070236e17235c','netlify/functions/site-v29.mjs':'10c7a5f8ea8894dbc0e8307de11178663fb0a4b7'};
for(const [p,sha] of Object.entries(pins))assert.equal(git('rev-parse','HEAD:'+p),sha,'Unexpected runtime blob: '+p);
const prior=p=>execFileSync('git',['show',checkpoint+':'+p],{encoding:'utf8'});
assert.equal(readFileSync('netlify.toml','utf8'),prior('netlify.toml').replace("'574','630','637','641'].includes","'574','630','637','641','642'].includes"));
assert.equal(readFileSync('scripts/audit-combined-weekly-badge-provenance.mjs','utf8'),prior('scripts/audit-combined-weekly-badge-provenance.mjs').replace("'league-hub-v451.js':'75a31c17a60592d60c31df7bfe4abb7b83f3547e'","'league-hub-v451.js':'6010c0811eeabe05c5d72e79e625a966ac2efd67'"));
console.log('PR 642 exact Inquirer-only delta; 641 checkpoint and production gate preserved');
