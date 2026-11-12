import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const home=read('index.html'),history=read('value-history-v276.js'),league=read('league-hub-v451.js'),loader=read('netlify/functions/site-v29.mjs');
const removed=[
 [home,'League data, market-source status, and direct navigation across Fleeced.'],
 [home,'V16 source-specific ingestion: pagination, extraction, and validation are handled per source. No valuation changes are applied in this step.'],
 [home,'Team fit affects only partner selection. It does not change player value. The Finder and Evaluator use the same master ranking.'],
 [history,'Trades open in a compact view showing the teams and assets exchanged. Expand Hindsight and/or Original Trade Analysis only when you want the full detail; Historical Value Comparison appears with either expanded section.'],
 [history,'Completed Sleeper trades with historical value presentation and a read-only analysis from the current Trade Evaluator logic.'],
 [history,'Search any player or choose a fantasy team to browse its current roster.'],
 [history,'Historical intelligence for the finished Fleeced! master value. Read-only: this data never feeds back into values, rankings, Trade Finder or Trade Evaluator.'],
 [league,'Your league broadcast center—weekly matchup stories, awards, trade legends, and manager résumés.']
];
test('all eight requested explanatory lines are removed without hiding other UI',()=>{
 for(const [source,text] of removed)assert.equal(source.includes(text),false,text);
});
test('important display headings, filters, and live-update controls are unchanged',()=>{
 for(const text of ['<h2>Home</h2>','<h2>Trade Finder</h2>','id="findShop"','id="updateBtn"'])assert.ok(home.includes(text),text);
 for(const text of ['<h3>Completed Trade History</h3>','data-vh-trade-team','data-vh-trade-year','data-vh-trade-month',
    'data-vh-player-history','data-vh-dashboard','<h2 class="vh-brand-title">Trade History</h2>',
    '<h2 class="vh-brand-title">Value History</h2>'])assert.ok(history.includes(text),text);
 for(const text of ['<h2>Fleeced! League Hub</h2>','data-lh-view="daily"','data-lh-view="awards"'])assert.ok(league.includes(text),text);
 assert.match(loader,/value-history-v276\.js\?v=540/);
 assert.match(loader,/league-hub-v451\.js\?v=539/);
});
