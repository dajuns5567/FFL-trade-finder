// Read-only exact inventory and blob check for PR 641 only, never a release gate.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const base='a1f3d19fe3524f97da9c51c2827607d74de4b38c';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
assert.equal(process.env.GITHUB_HEAD_REF,'integration/mobile-shared-regressions-20261125','Not the reviewed preview branch');
assert.equal(git('rev-parse','origin/main'),base,'Frozen desktop changed; re-audit');
assert.equal(git('ls-remote','origin','refs/heads/archive/desktop-release-630-20261125').split(/\s+/)[0],base,'Desktop archive changed');
const allowed=[".github/workflows/finder-live-browser-audit.yml",".github/workflows/mobile-presentation-v631.yml",".github/workflows/netlify-v101-one-time-release-gate-ci.yml",".github/workflows/release-v107-recorder-after-market-ui-isolated.yml",".github/workflows/release-v112-team-trade-linkage-ci.yml",".github/workflows/release-v114-historical-pick-projection-ci.yml",".github/workflows/release-v116-market-period-parity-ci.yml",".github/workflows/team-trade-player-outcome.yml","fleeced-mobile-v631.css","fleeced-view-mode-v631.js","netlify.toml","netlify/functions/site-v29.mjs","scripts/audit-combined-weekly-badge-provenance.mjs","scripts/audit-mobile-shared-preview-scope.mjs","scripts/finder-live-browser-audit.mjs","scripts/finder-live-browser-runner.mjs","scripts/mobile-presentation-browser-v631.mjs","tests/team-trade-player-outcome.test.mjs","value-history-v276.js"];
assert.deepEqual(git('diff','--name-only',base,'HEAD').split('\n').filter(Boolean).sort(),allowed,'Unexpected preview inventory');
const pins={
  "fleeced-mobile-v631.css": "433349a2e17dfa72592a45e7b7ad2dedef82ce23",
  "fleeced-view-mode-v631.js": "96f3ca83246ca502a76e32c4075d659336d31486",
  "netlify/functions/site-v29.mjs": "48c161df34c2084f2acf1a81700b5f6e5698fd39",
  "scripts/mobile-presentation-browser-v631.mjs": "4f44e4ba2403e2b64350fb69671351ddd76689e1",
  ".github/workflows/team-trade-player-outcome.yml": "d3e7599a75f6bd96a65c1ef659fe8c3ba95c5446",
  "tests/team-trade-player-outcome.test.mjs": "52ef56fa1782c39898682f86fc107ad9ca952b92",
  "value-history-v276.js": "7fa1de4c8f0d6c73f2937ba10ea14a82ab59ae8d",
  ".github/workflows/finder-live-browser-audit.yml": "cd13cf2016809235bd62773022b5cfa7789a1a49",
  "scripts/finder-live-browser-audit.mjs": "d4f014e81dbd8494a93fe3f939903c232c4be740",
  "scripts/finder-live-browser-runner.mjs": "44e65f1e0137458e8e179913740ec98f13505cfd"
};
for(const [p,sha] of Object.entries(pins))assert.equal(git('rev-parse','HEAD:'+p),sha,'Reviewed source changed: '+p);
const baseGate=execFileSync('git',['show',base+':netlify.toml'],{encoding:'utf8'});
assert.equal(readFileSync('netlify.toml','utf8'),baseGate.replace("'574','630'].includes","'574','630','637','641'].includes"),'Only explicit preview IDs may change, never production');
const orig=execFileSync('git',['show',base+':scripts/audit-combined-weekly-badge-provenance.mjs'],{encoding:'utf8'});
assert.equal(readFileSync('scripts/audit-combined-weekly-badge-provenance.mjs','utf8'),orig.replace("'value-history-v276.js':'fc911a0c79699b1560e3f490aa351722a6cd940d'","// PR 639: isolated player-outcome change with non-causal snapshot explanation.\n 'value-history-v276.js':'7fa1de4c8f0d6c73f2937ba10ea14a82ab59ae8d'"),'Only exact approved player outcome hash may change');
console.log('Exact PR 641 source inventory and all reviewed application blobs verified; production gate unchanged');
