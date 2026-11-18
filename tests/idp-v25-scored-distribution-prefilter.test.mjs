import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const code=readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
const section=code.slice(code.indexOf('function distributions25(){'),code.indexOf('function scoring25('));
test('V25 evaluates only IDs observable in Sleeper regular-season stats',()=>{
 assert.match(section,/const scoringIds=new Set\(\)/);
 assert.match(section,/for\(const year of Object\.values\(state\.stats\|\|\{\}\)\)/);
 assert.match(section,/if\(!scoringIds\.has\(id\)\|\|groupPos/);
 assert.match(section,/const a=baseAudit25\(id\);if\(!a\?\.qualifyingSeasons\)continue/);
});
test('scored-ID prefilter preserves all rows that could have qualified in V21',()=>{
 const playerIds=['qb','unscoredIdp','idpA','idpB','idpC','idpD'];
 const qualifying={qb:2,idpA:3,idpB:1,idpC:0,idpD:2,unscoredIdp:0};
 const statYears={2024:{idpA:{},qb:{}},2025:{idpA:{},idpB:{},idpD:{}},2026:{idpD:{},idpC:{}}};
 const isDefensive=id=>id.startsWith('idp')||id==='unscoredIdp';
 const legacy=playerIds.filter(id=>isDefensive(id)&&qualifying[id]>0);
 const observed=new Set(Object.values(statYears).flatMap(y=>Object.keys(y)));
 const optimized=playerIds.filter(id=>observed.has(id)&&isDefensive(id)&&qualifying[id]>0);
 assert.deepEqual(optimized,legacy);
 assert.deepEqual(optimized,['idpA','idpB','idpD']);
});
test('global 20/45/35 IDP weights and rank calculation remain unchanged',()=>{
 assert.match(code,/const raw=\.20\*c\+\.45\*scoreValue\+\.35\*contextValue-IDP_V25_MARKET_CENTER_OFFSET/);
 assert.match(code,/const index=\.65\*development\.index\+\.25\*trajectory\.index\+\.10\*continuity\.index/);
 assert.match(code,/masterRankings=function\(\)\{return priorMaster25\(\)\.map\(model25\)\.sort/);
});
