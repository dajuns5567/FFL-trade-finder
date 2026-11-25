// Read-only: exact mobile presentation delta from fully tested 645.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const base='65fd8b399a2d44058df1efa245916330cc8b2fd0',main='a1f3d19fe3524f97da9c51c2827607d74de4b38c';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
assert.equal(process.env.GITHUB_HEAD_REF,'fix/mobile-paired-comparisons-20261125');
assert.equal(git('rev-parse','origin/main'),main);
assert.equal(git('ls-remote','origin','refs/heads/archive/desktop-release-630-20261125').split(/\s+/)[0],main);
execFileSync('git',['merge-base','--is-ancestor',base,'HEAD']);
assert.deepEqual(git('diff','--name-only',base,'HEAD').split('\n').filter(Boolean).sort(),[".github/workflows/mobile-presentation-v631.yml",".github/workflows/netlify-v101-one-time-release-gate-ci.yml",".github/workflows/release-v107-recorder-after-market-ui-isolated.yml",".github/workflows/release-v112-team-trade-linkage-ci.yml",".github/workflows/release-v114-historical-pick-projection-ci.yml",".github/workflows/release-v116-market-period-parity-ci.yml","fleeced-mobile-pairs-v646.css","netlify.toml","netlify/functions/site-v29.mjs","scripts/audit-inquirer-closed-preview-scope.mjs","scripts/audit-mobile-pairs-preview-scope.mjs","scripts/mobile-pairs-browser-v646.mjs"]);
const prior=p=>execFileSync('git',['show',base+':'+p],{encoding:'utf8'});
assert.equal(readFileSync('netlify.toml','utf8'),prior('netlify.toml').replace("'574','630','637','641','642','645'].includes","'574','630','637','641','642','645','646'].includes"));
const link='<link rel="stylesheet" href="/fleeced-mobile-density-v645.css?v=645">';
assert.equal(readFileSync('netlify/functions/site-v29.mjs','utf8'),prior('netlify/functions/site-v29.mjs').replace(link,link+'<link rel="stylesheet" href="/fleeced-mobile-pairs-v646.css?v=646">'));
const css=readFileSync('fleeced-mobile-pairs-v646.css','utf8');
for(const l of css.split('\n').filter(l=>l.includes('{')&&!l.startsWith('@media')))assert(l.startsWith('html[data-fleeced-view="mobile"]'),'Unscoped selector '+l);
assert.doesNotMatch(css,/zoom\s*:|display\s*:\s*none|visibility\s*:\s*hidden/);
console.log('PR 646: exact mobile stylesheet delta, full application and desktop release unchanged');
