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

test('server weekly badges and durable highs are measured independently of UI and Blob',()=>{
 assert.match(audit,/Server milestone parity with five visible wins/);
 assert.match(audit,/serverHasBoth&&badges\.length>=5\?'PASS':'FAIL'/);
 assert.match(audit,/independent GitHub historical archive populated/);
 assert.match(audit,/Number\(highs\.sources\?\.durable\)>0\?'PASS':'WARN'/);
 assert.match(audit,/2026 weekly badge date provenance/);
});

test('season-long server scoring acceptance has an explicit timeout independent of fast API calls',()=>{
 assert.match(audit,/const fetchJson=async \(label,path,\{timeoutMs=10000\}=\{\}\)/);
 assert.match(audit,/setTimeout\(\(\)=>ctl\.abort\(\),timeoutMs\)/);
 assert.match(audit,/player_scoring=1&player_id=4034'\,\{timeoutMs:45000\}\)/);
});
