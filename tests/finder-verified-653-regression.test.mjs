import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import siteV29 from '../netlify/functions/site-v29.mjs';

// Owner-tested Preview 653 is the minimum accepted Finder baseline.
// Deliberate changes require a separately reviewed successor checkpoint with
// same-input recommendation/valuation parity, desktop/mobile execution and
// bounded-performance evidence. Never regenerate the baseline from HEAD.
const frozen='10cab63ce7437d9fdc80e3e5ca8c97462514ca7c';
const archive='archive/verified-preview-653-20261125';
const graph=[
  [
    "state-bridge-v141.js",
    "141"
  ],
  [
    "trade-value-normalization-v139.js",
    "142"
  ],
  [
    "draft-pick-rankings-v527.js",
    "527"
  ],
  [
    "trade-te-scoring-adjustment-v259.js",
    "259"
  ],
  [
    "modeled-player-values-v319.js",
    "319"
  ],
  [
    "ui-player-values-v139.js",
    "541"
  ],
  [
    "ui-runtime-values-v140.js",
    "141"
  ],
  [
    "nonblocking-consensus-v277.js",
    "496"
  ],
  [
    "trade-select-all-v165.js",
    "439"
  ],
  [
    "trade-selection-sync-v534.js",
    "534"
  ],
  [
    "trade-blank-cache-v167.js",
    "169"
  ],
  [
    "trade-partner-fit-v184.js",
    "186"
  ],
  [
    "trade-style-preferences-v221.js",
    "221"
  ],
  [
    "trade-win-now-preferences-v226.js",
    "226"
  ],
  [
    "pick-display-sync-v279.js",
    "279"
  ],
  [
    "trade-specific-blank-router-v325.js",
    "439"
  ],
  [
    "trade-add-assets-complement-v1.js",
    "2"
  ],
  [
    "trade-specific-max-tier-add-v300.js",
    "303"
  ],
  [
    "trade-specific-tier-up-v282.js",
    "283"
  ],
  [
    "trade-specific-add-assets-v282.js",
    "310"
  ],
  [
    "trade-specific-max-value-v279.js",
    "445"
  ],
  [
    "trade-specific-player-v232.js",
    "441"
  ],
  [
    "trade-finder-v256-compiled.js",
    "450"
  ],
  [
    "trade-evaluator-any-team-v184.js",
    "285"
  ],
  [
    "trade-runtime-v256-compiled.js",
    "532"
  ],
  [
    "trade-selected-positions-only-v262.js",
    "262"
  ],
  [
    "trade-finder-candidate-guard-v223.js",
    "263"
  ],
  [
    "trade-ui-canonical-v136.js",
    "141"
  ],
  [
    "trade-presentation-v169.js",
    "197"
  ],
  [
    "trade-recommended-pick-ownership-v301.js",
    "301"
  ]
];
const pinned=[
  "state-bridge-v141.js",
  "trade-value-normalization-v139.js",
  "draft-pick-rankings-v527.js",
  "trade-te-scoring-adjustment-v259.js",
  "modeled-player-values-v319.js",
  "ui-player-values-v139.js",
  "ui-runtime-values-v140.js",
  "nonblocking-consensus-v277.js",
  "trade-select-all-v165.js",
  "trade-selection-sync-v534.js",
  "trade-blank-cache-v167.js",
  "trade-partner-fit-v184.js",
  "trade-style-preferences-v221.js",
  "trade-win-now-preferences-v226.js",
  "pick-display-sync-v279.js",
  "trade-specific-blank-router-v325.js",
  "trade-add-assets-complement-v1.js",
  "trade-specific-max-tier-add-v300.js",
  "trade-specific-tier-up-v282.js",
  "trade-specific-add-assets-v282.js",
  "trade-specific-max-value-v279.js",
  "trade-specific-player-v232.js",
  "trade-finder-v256-compiled.js",
  "trade-evaluator-any-team-v184.js",
  "trade-runtime-v256-compiled.js",
  "trade-selected-positions-only-v262.js",
  "trade-finder-candidate-guard-v223.js",
  "trade-ui-canonical-v136.js",
  "trade-presentation-v169.js",
  "trade-recommended-pick-ownership-v301.js",
  "trade-finder-v18.js",
  "trade-section1-core-v100.js",
  "scripts/compile-v256-runtimes.cjs",
  "tests/finder-scoped-performance-parity.test.mjs",
  "tests/finder-natural-filter-matrix.test.mjs",
  "tests/targeted-max-value-search-stall.test.mjs",
  "scripts/finder-scheduling-parity.mjs",
  "scripts/finder-live-browser-audit.mjs",
  "scripts/finder-live-browser-runner.mjs"
];
const git=(...args)=>execFileSync('git',args,{maxBuffer:16*1024*1024});
test('verified Finder checkpoint remains available and exact',()=>{
 assert.equal(git('ls-remote','origin','refs/heads/'+archive).toString().trim().split(/\s+/)[0],frozen,'Owner-tested Finder archive moved or disappeared');
 for(const path of pinned){
  assert.deepEqual(readFileSync(new URL('../'+path,import.meta.url)),git('show',frozen+':'+path),'Verified Finder dependency changed: '+path+'; review a separate successor and repeat the acceptance audit before changing this baseline');
 }
});
test('actual assembled page retains every verified Finder dependency and cache revision in order',async()=>{
 const response=await siteV29();
 assert.equal(response.status,200);
 const html=await response.text();
 const urls=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)].map(m=>m[1]);
 let last=-1;
 for(const [path,version] of graph){
  const matches=urls.map((url,i)=>({url,i})).filter(x=>x.url.split('?')[0]==='/'+path);
  assert.equal(matches.length,1,'Missing or duplicate verified Finder dependency: '+path);
  assert.equal(matches[0].url,'/'+path+'?v='+version,'Wrong deployed cache revision: '+path);
  assert(matches[0].i>last,'Verified Finder script order changed: '+path);
  last=matches[0].i;
 }
 for(const id of ['findTeam','findShop','runFinder','findMode','desiredPlayerSearch'])assert(html.includes('id="'+id+'"'),'Missing Finder control: '+id);
});
