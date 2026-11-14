import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const client=fs.readFileSync('value-history-v276.js','utf8');
const server=fs.readFileSync('netlify/functions/value-history.mjs','utf8');

test('deploy previews are detected using their real Netlify hostnames',()=>{
 const match=/^deploy-preview-\d+--/i;
 assert.equal(match.test('deploy-preview-463--precious-dango-fb4633.netlify.app'),true);
 assert.equal(match.test('deploy-preview-464--precious-dango-fb4633.netlify.app'),true);
 assert.equal(match.test('precious-dango-fb4633.netlify.app'),false);
 assert.equal(match.test('other-site.netlify.app'),false);
 assert.match(client,/const isValueHistoryDeployPreview=\(\)=>\/\^deploy-preview-/);
 assert.match(server,/const isDeployPreview=\/\^deploy-preview-/);
});

test('preview page loads never schedule or record canonical historical snapshots',()=>{
 assert.match(client,/async function recordSnapshot\(source=pendingSnapshotSource\)\{\s*if\(isValueHistoryDeployPreview\(\)\)return false;/);
 assert.match(client,/function scheduleSnapshot\(delay=60000,source=pendingSnapshotSource\)\{if\(isValueHistoryDeployPreview\(\)\)return;/);
});

test('server blocks preview POST before any archival writes, and skips cleanup on preview GET',()=>{
 assert.match(server,/const readonlyPreview=isDeployPreview\|\|/);
 const post=server.indexOf("if(isDeployPreview)return json({error:'deploy previews are read-only for canonical value history'},403);");
 const write=server.indexOf("await retry(()=>s.setJSON(key,snapshot),120);");
 assert.ok(post>0&&write>post,'reject preview POST before archive write');
 assert.match(server,/process\.env\.CONTEXT==='deploy-preview'/);
});

test('history page distinguishes current preview rank from archived timeline',()=>{
 assert.match(client,/const archivedLast=allPts\[allPts.length-1\]/);
 assert.match(client,/previewRankMismatch=isValueHistoryDeployPreview\(\)/);
 assert.match(client,/Preview ranks are not saved to the canonical history/);
 assert.match(client,/\$\{previewSnapshotNote\}/);
});
