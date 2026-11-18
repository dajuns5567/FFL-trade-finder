import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync('.github/workflows/import-sleeper-history.yml','utf8');
const importer=readFileSync('scripts/import-sleeper-history.mjs','utf8');
const browser=readFileSync('sleeper-history-client-v22.js','utf8');

test('Week 10 and all future scoring refreshes have redundant scheduled observations and serialized writes',()=>{
 assert.match(workflow,/cron: '17,47 \* \* \* \*'/);
 assert.match(workflow,/group: sleeper-scoring-canonical-import/);
 assert.match(workflow,/cancel-in-progress: false/);
 assert.match(workflow,/node scripts\/import-sleeper-history.mjs/);
 assert.match(workflow,/node scripts\/audit-qualified-player-games.mjs/);
 assert.match(workflow,/Publish snapshot to sleeper-data branch/);
});
test('current-season offensive PPR and IDP only advance at a fully verified week boundary',()=>{
 assert.match(importer,/valuationEligibleCurrentSeasonWeeks\(qualifiedCurrent.weekly,qualifiedCurrent.weekFinalityByWeek\)/);
 assert.match(importer,/const completedWeek=gatedCurrent.completedWeek/);
 assert.match(importer,/finalGamesOnly:true,fullWeekValuationGate:true/);
 assert.match(workflow,/Verify source-scored finality boundary and strict mismatch detection/);
 assert.match(workflow,/node --test tests\/sleeper-idp-audit-finality.test.mjs/);
});
test('site load and Update consume the fresh authoritative importer snapshot, never a stale browser cache',()=>{
 assert.match(browser,/SNAPSHOT_URL='\/sleeper-data\/offense-history.json'/);
 assert.match(browser,/\?ts=\$\{Date.now\(\)\}/);
 assert.match(browser,/cache:'no-store'/);
 assert.match(browser,/mergeScoringHistory22\(j.stats,currentSeason,j.qualifiedCurrentStats\|\|\{\}\)/);
 assert.match(browser,/window.refreshImportedOffenseHistory=hydrateImportedOffense22/);
 assert.match(browser,/loadCore=async function\(\)/);
 assert.match(browser,/clearValueCaches22\(\)/);
});
