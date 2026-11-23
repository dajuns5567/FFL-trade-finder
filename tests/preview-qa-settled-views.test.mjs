import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const audit=fs.readFileSync(new URL('../ffl-preview-audit-v1.js',import.meta.url),'utf8');
test('Market Dashboard is checked while selected only AFTER the fetch settles',()=>{
 assert.match(audit,/const settle=async \(selector,loading,maxMs=14000\)/);
 assert.match(audit,/await settle\('#vhContent',\/\^Loading market dashboard…\$\/,18000\)/);
 const market=audit.slice(audit.indexOf("if(name==='VALUE HISTORY')"),audit.indexOf("if(name==='LEAGUE HUB')"));
 assert.ok(market.indexOf("await settle('#vhContent'")<market.indexOf("add('Market','mover panels'"));
 assert.doesNotMatch(market,/const rows=norm\(text\(appRoot\(\)\)\)/);
});
test('League Hub tabs wait independently and fail only for real settled errors',()=>{
 assert.match(audit,/await settle\('#leagueHubContent',\/\^Loading league intelligence…\$\/,14000\)/);
 assert.match(audit,/tabName\+' settles after navigation'/);
 assert.match(audit,/settled\.failed\?'FAIL':settled\.settled\?'PASS':'WARN'/);
 assert.match(audit,/!selected\|\|\/Fleeced! Daily/);
 assert.match(audit,/WEEKLY MANAGER AWARDS\|THE FLEECER\|HOT SEAT/);
});
test('read-only and production guards are preserved while waiting',()=>{
 assert.match(audit,/if\(!\/\^deploy-preview-/);
 assert.match(audit,/credentials:'same-origin'/);
 assert.doesNotMatch(audit,/method:\s*['"]POST|\.setJSON\(|gh api/);
 assert.match(audit,/await sleep\(350\)/);
 assert.match(audit,/FFL QA AUDIT/);
});
