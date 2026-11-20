// V107 private Actions dry-run: exercise exactly the *approved scheduled*
// V101 path in a child process, but never launch a durable writer or supply
// archive tokens. The actual production main workflow remains V96 until
// explicit separately approved GitHub release/variable activation.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,rmSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const snapshotFile='.tmp/v107-v101-scheduled-shadow-only.json';
const auditedBlob='443c8497a95e793665fb78474feaee49bd57e88f';
const model='idp-v101-verified-role-growth-v100-source-free-lineage';
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.match(sha,/^[a-f0-9]{40}$/);
mkdirSync('.tmp',{recursive:true});
try{
 const env={...process.env,
  // Synthetic main context for a fully read-only model-promotion drill.
  // Do NOT allow the archive write command to run in this test.
  GITHUB_REF:'refs/heads/main',
  GITHUB_EVENT_NAME:'workflow_dispatch',
  VALUE_HISTORY_SCHEDULED_MODEL:model,
  VALUE_HISTORY_V101_APPROVED:'1',
  VALUE_HISTORY_SOURCE_COMMIT:sha,
  VALUE_HISTORY_SNAPSHOT_FILE:snapshotFile
 };
 for(const x of ['GITHUB_TOKEN','NETLIFY_AUTH_TOKEN','NETLIFY_BLOBS_TOKEN',
                 'NETLIFY_SANDBOX_TOKEN'])delete env[x];
 const child=spawnSync(process.execPath,['scripts/value-history-headless-refresh.mjs'],{
  env,encoding:'utf8',timeout:900000,maxBuffer:8*1024*1024
 });
 if(child.stdout)process.stdout.write(child.stdout.slice(-12000));
 if(child.stderr)process.stderr.write(child.stderr.slice(-7000));
 assert.equal(child.status,0,'approved V101 scheduled model dry-run must succeed');
 const snapshot=JSON.parse(readFileSync(snapshotFile,'utf8'));
 assert.equal(snapshot.source,'scheduled');
 assert.equal(snapshot.valuation_model,model);
 assert.equal(snapshot.valuation_contract,'precision-idp-runtime-v101-20261119');
 assert.equal(snapshot.provenance?.model_blob_sha,auditedBlob);
 assert.equal(snapshot.provenance?.canonical_parity,'exact');
 assert.equal(snapshot.provenance?.candidate_read_only,undefined);
 assert.ok(Number(snapshot.provenance?.consensus_sources)>=7);
 assert.ok(snapshot.provenance?.source_manifest?.length>=7);
 assert.equal(snapshot.provenance?.git_commit,sha);
 assert.ok(snapshot.rows.length>=1000);
 assert.ok(snapshot.picks.length>=96);
 assert.equal(snapshot.teams.length,32);
 const ids=new Set(snapshot.rows.map(x=>String(x.id)));
 assert.equal(ids.size,snapshot.rows.length);
 assert.ok(ids.has('12978'),'must preserve verified Ponder breakout in V101');
 assert.ok(snapshot.rows.every(x=>Number.isFinite(Number(x.value))&&
   Number.isFinite(Number(x.overall))));
 console.log(JSON.stringify({
  contract:'V107 scheduled V101 shadow capture - strict no archive writes',
  model:snapshot.valuation_model,modelContract:snapshot.valuation_contract,
  players:snapshot.rows.length,picks:snapshot.picks.length,teams:snapshot.teams.length,
  consensusSources:snapshot.provenance.consensus_sources,
  canonicalParity:snapshot.provenance.canonical_parity,
  modelBlob:snapshot.provenance.model_blob_sha,
  archived:false,productionDeployed:false
 },null,2));
}finally{
 rmSync(snapshotFile,{force:true});
}
