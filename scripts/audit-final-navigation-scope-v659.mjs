import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const base='b40aa090b5aa8288605557cac66f244e3b58c496',main='a1f3d19fe3524f97da9c51c2827607d74de4b38c';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
assert.equal(process.env.GITHUB_HEAD_REF,'fix/final-navigation-logo-20261126');
assert.equal(git('rev-parse','origin/main'),main);
execFileSync('git',['merge-base','--is-ancestor',base,'HEAD']);
assert.deepEqual(git('diff','--name-only',base,'HEAD').split('\n').filter(Boolean).sort(),[".github/workflows/inquirer-daily-default-closed.yml",".github/workflows/mobile-presentation-v631.yml",".github/workflows/navigation-read-scope-v656.yml",".github/workflows/netlify-v101-one-time-release-gate-ci.yml",".github/workflows/release-v107-recorder-after-market-ui-isolated.yml",".github/workflows/release-v112-team-trade-linkage-ci.yml",".github/workflows/release-v114-historical-pick-projection-ci.yml",".github/workflows/release-v116-market-period-parity-ci.yml","fleeced-header-v512.js","fleeced-mobile-home-v650.css","fleeced-presentation-v413.js","fleeced-view-mode-v631.js","league-hub-v451.js","netlify.toml","netlify/functions/league-hub.mjs","netlify/functions/site-v29.mjs","scripts/audit-combined-weekly-badge-provenance.mjs","scripts/audit-final-navigation-scope-v659.mjs","scripts/mobile-presentation-browser-v631.mjs","scripts/navigation-site-profile-v656.mjs","tests/awards-canonical-refresh-synchronization.test.mjs","tests/final-navigation-v659.test.mjs","tests/header-click-menu-v536.test.mjs","tests/inquirer-live-archive-refresh.test.mjs","tests/league-awards-independent-week-sync.test.mjs","tests/league-hot-seat-and-highs-preview.test.mjs","tests/league-hub-async-tab-race.test.mjs","tests/league-hub-shared-freshness.test.mjs","tests/managers-client-refresh-runtime.test.mjs","tests/managers-preview-readonly-fallback.test.mjs","tests/navigation-read-scope-v656.test.mjs","value-history-v276.js"]);
const previewGateBefore=git('show',base+':netlify.toml');
assert.equal(previewGateBefore.split("'656','657'].includes").length,2);
assert.equal(git('show','HEAD:netlify.toml'),previewGateBefore.replace("'656','657'].includes","'656','657','658'].includes"),'Only PR 658 may be added to the preview allowlist; production gate unchanged');
let loader=git('show',base+':netlify/functions/site-v29.mjs');
for(const [file,v] of [['value-history-v276.js','656'],['league-hub-v451.js','656'],['fleeced-mobile-home-v650.css','658'],['fleeced-header-v512.js','642']])loader=loader.replace('/'+file+'?v='+v,'/'+file+'?v=659');
loader=loader.replace('fleeced-view-mode-v631.js?v=631','fleeced-view-mode-v631.js?v=660').replace('fleeced-presentation-v413.js?v=438','fleeced-presentation-v413.js?v=660');
assert.equal(git('show','HEAD:netlify/functions/site-v29.mjs'),loader,'Only browser asset cache revisions may change');
const switchBase='7d45c3ffbd956e825a9a7986b31fef5231324461';
execFileSync('git',['merge-base','--is-ancestor',switchBase,'HEAD']);
assert.deepEqual(git('diff','--name-only',switchBase,'HEAD').split('\n').filter(Boolean).sort(),["fleeced-presentation-v413.js","fleeced-view-mode-v631.js","netlify/functions/site-v29.mjs","scripts/audit-final-navigation-scope-v659.mjs","scripts/mobile-presentation-browser-v631.mjs","scripts/navigation-site-profile-v656.mjs","tests/inquirer-live-archive-refresh.test.mjs","tests/managers-preview-readonly-fallback.test.mjs"],'Isolated view switch and regression fixture only');
console.log('Exact Preview 657 ancestor; only approved navigation/wordmark scope, no data, Finder, or security boundary changes.');

const serverBefore=git('show',base+':netlify/functions/league-hub.mjs');
const cacheBefore="const cached=await store().get('managers/history-cache.json',{type:'json'}).catch(()=>null);";
const cacheAfter="const cached=await Promise.resolve().then(()=>store().get('managers/history-cache.json',{type:'json'})).catch(()=>null);";
assert.equal(serverBefore.split(cacheBefore).length,2);
assert.equal(git('show','HEAD:netlify/functions/league-hub.mjs'),serverBefore.replace(cacheBefore,cacheAfter),'Only read-only Managers cache initialization recovery may change on server');

const verifiedSwitch='13398382d8179426824d0f4a211d48a7a8a06c3f';
assert.deepEqual(git('diff','--name-only',verifiedSwitch,'HEAD').split('\n').filter(Boolean).sort(),['netlify.toml','scripts/audit-final-navigation-scope-v659.mjs','tests/managers-preview-readonly-fallback.test.mjs'],'Only verified preview authorization changes after browser-tested commit');
