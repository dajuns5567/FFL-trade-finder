import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const history=read('value-history-v276.js');
const consensus=read('nonblocking-consensus-v277.js');
const league=read('league-hub-v451.js');
test('Hindsight and historical comparison take current values from the canonical evaluator, never the cached snapshot',()=>{
  assert.match(history,/function hindsightValue\(asset,trade\)[\s\S]*?return currentEvaluatorValue\(asset\)/);
  assert.match(history,/function sideValueModel\(side,trade\)[\s\S]*?now=currentEvaluatorValue\(asset\)/);
  assert.match(history,/function historicalPlayerValue\(side,id\)[\s\S]*?side\?\.then_players/);
  assert.match(history,/function currentEvaluatorValue\(asset\)[\s\S]*?tradeValueNormalizationV130\?\.canonicalValue/);
});
test('visible Trade History rerenders on valuation completion, not on a background snapshot or when hidden',()=>{
  const begin=history.indexOf('function refreshTradeHistoryCurrentValuesV533(){');
  const end=history.indexOf('window.refreshTradeHistoryCurrentValuesV533=',begin);
  assert.ok(begin>=0&&end>begin);
  const segment=history.slice(begin,end);
  let visible=true,rendered=0;
  const context={document:{getElementById:()=>({hidden:!visible})},
    renderTradeHistory:()=>{rendered++},tradeHistoryCache:{trades:[{id:'a',then_players:[{id:'p',value:100}]}]}};
  const before=JSON.stringify(context.tradeHistoryCache);
  const fn=runInNewContext(segment+';refreshTradeHistoryCurrentValuesV533',context);
  assert.equal(fn(),true);
  assert.equal(rendered,1);
  assert.equal(JSON.stringify(context.tradeHistoryCache),before);
  visible=false;assert.equal(fn(),false);assert.equal(rendered,1);
  context.tradeHistoryCache=null;visible=true;assert.equal(fn(),false);assert.equal(rendered,1);
});
test('background consensus emits a signal only after rebuilding derived values',()=>{
  const derived=consensus.indexOf("refreshDerivedValuation277('consensus refresh')");
  const rendered=consensus.indexOf('buildTeams();renderAll();',derived);
  const signal=consensus.indexOf("new CustomEvent('fll:valuation-refreshed'",derived);
  assert.ok(derived>=0&&derived<rendered&&rendered<signal);
  assert.match(history,/addEventListener\('fll:valuation-refreshed',refreshTradeHistoryCurrentValuesV533\)/);
  assert.match(league,/addEventListener\('fll:valuation-refreshed'/);
  assert.match(league,/\['hall','managers','career','awards'\]\.includes\(currentView\)/);
});
