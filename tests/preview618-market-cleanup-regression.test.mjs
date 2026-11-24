import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
const shell=readFileSync(new URL('../netlify/functions/site-v29.mjs',import.meta.url),'utf8');
test('Market Dashboard does not regress to removed white explanatory copy',()=>{
 for(const old of [
   'Historical tracking is preserved (',
   'Latest valuation model began',
   'The original finished-value and overall-rank fluctuation boards remain unchanged.',
   'Current values and ranks come from Player Values; market movement'
 ])assert.equal(ui.includes(old),false,'Unexpected legacy Market helper: '+old);
 assert.doesNotMatch(ui,/\$\{modelEraNote\(m\)\}/);
 assert.match(ui,/function renderMarketDashboard\(/);
 assert.match(ui,/BIGGEST VALUE RISERS|Biggest Value Risers/i);
});
test('restored Market and League Hub code is actually referenced with new version identifiers',()=>{
 assert.match(shell,/league-hub-v451\.js\?v=558/);
 assert.match(shell,/value-history-v276\.js\?v=553/);
 assert.match(shell,/trade-finder-v256-compiled\.js/);
});
