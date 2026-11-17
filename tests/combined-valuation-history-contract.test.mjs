import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const offense=fs.readFileSync('valuation-offense-v40.js','utf8');
const idp=fs.readFileSync('valuation-idp-v43.js','utf8');
const display=fs.readFileSync('ui-player-values-v139.js','utf8');
const history=fs.readFileSync('value-history-v276.js','utf8');
const endpoint=fs.readFileSync('netlify/functions/value-history.mjs','utf8');

test('offense career-stage evidence correction and IDP V72 precision coexist',()=>{
 assert.match(offense,/const audited=finite50\(a\?\.value\),raw=finite50\(a\?\.rawValue\)/);
 assert.match(idp,/idpOverallTradeCurveExactV72:baseline\*finalFactor\+retention\.bonus/);
 assert.match(idp,/finalFactor=Math\.max\(servedFactor,Math\.min\(careerRetention\.floor,servedFactor\*1\.025\)\)/);
 assert.match(display,/valuation-weighted PPG/);
 assert.match(display,/actual3yr/);
});

test('canonical history is read-only from preview client and endpoint',()=>{
 assert.match(history,/if\(isValueHistoryDeployPreview\(\)\)return false/);
 assert.match(endpoint,/if\(isDeployPreview\)return json\(\{error:'deploy previews are read-only for canonical value history'\},403\)/);
});

test('integrated candidate keeps position ranks and final value in common runtime',()=>{
 assert.match(display,/function rankedPlayers\(\)\{return ensureMaster/);
 assert.match(history,/function ranked\(\)\{try\{return typeof ensureMaster/);
 assert.match(history,/function currentRows\(\)/);
});
