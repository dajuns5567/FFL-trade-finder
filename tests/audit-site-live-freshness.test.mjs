import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LIVE_FRESHNESS_RULES,inspectLiveFreshness} from '../scripts/audit-site-live-freshness.mjs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('audit covers navigation, market, values, history, Finder, League Hub, Managers, Awards, Inquirer',()=>{
 const report=inspectLiveFreshness(read);
 assert.ok(report.checks>=20);
 for(const area of ['Home','Market Dashboard','Track My Team','Player Value History','Trade History',
  'Trade Finder','League Hub','Fleeced Daily','Inquirer','League / Player Values','Position Indexes'])
  assert.ok(report.results.some(x=>x.area===area),area+' is missing from behavior inventory');
});

test('audit cannot conflate a present script with an up-to-date data lifecycle',()=>{
 const x=inspectLiveFreshness(read);
 for(const id of ['league-trades','league-awards','league-drafts','home-risers','market-timeline','team-net']){
  const finding=x.results.find(z=>z.id===id);
  assert.ok(finding,id+' must be monitored');
  assert.equal(finding.status,'risk',id+' has an uncorrected mainline freshness gap');
 }
 assert.equal(x.results.find(z=>z.id==='trade-history').status,'source-path-present',
  'dedicated Trade History timer and live fetch should remain documented');
});

test('every behavior rule detects removal of each required data freshness safeguard',()=>{
 const files=new Map([...new Set(LIVE_FRESHNESS_RULES.map(x=>x.file))].map(file=>[file,read(file)]));
 for(const rule of LIVE_FRESHNESS_RULES){
  const source=files.get(rule.file);
  if(!rule.expect.every(token=>source.includes(token)))continue;
  for(const marker of rule.expect){
   const mutated=new Map(files);
   mutated.set(rule.file,source.replaceAll(marker,'__REGRESSED_REFRESH_GUARD__'));
   const result=inspectLiveFreshness(file=>mutated.get(file)).results.find(x=>x.id===rule.id);
   assert.equal(result.status,'risk',rule.id+' must detect lost '+marker);
  }
 }
});

test('an implemented freshness mechanism clears its own finding without masking unrelated defects',()=>{
 const sources=new Map([...new Set(LIVE_FRESHNESS_RULES.map(x=>x.file))].map(file=>[file,read(file)]));
 const home=sources.get('fleeced-home-v424.js');
 sources.set('fleeced-home-v424.js',home+"\nsetInterval(refreshVisibleHome,300000);window.addEventListener('focus',refreshVisibleHome);");
 const report=inspectLiveFreshness(file=>sources.get(file));
 assert.equal(report.results.find(x=>x.id==='home-risers').status,'mitigation-source-present');
 assert.equal(report.results.find(x=>x.id==='home-top-players').status,'mitigation-source-present');
 assert.equal(report.results.find(x=>x.id==='league-trades').status,'risk');
});
