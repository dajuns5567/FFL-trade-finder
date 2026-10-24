import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../.github/workflows/inquirer-editorial-r5-smoke.yml',import.meta.url),'utf8');
const queueJob=source.split('  seed-private-preview:\n')[1];
const readerSource=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const previewJobSource=readFileSync(new URL('../netlify/functions/inquirer-preview-background.mjs',import.meta.url),'utf8');
const previewDiagnosticSource=readFileSync(new URL('../netlify/functions/inquirer-preview-diagnostic.mjs',import.meta.url),'utf8');

test('only audit-passing pull requests attempt automatic private draft enqueue',()=>{
  assert.ok(queueJob,'preview job must exist');
  assert.match(queueJob,/needs: inquirer-r6/);
  assert.match(queueJob,/if: github\.event_name == 'pull_request'/);
  assert.doesNotMatch(queueJob,/if: always\(\)/);
});

test('site protection reports manual reviewer action without claiming generation succeeded',()=>{
  assert.match(queueJob,/\[ "\$status" = '401' \].*\[ "\$status" = '403' \]/);
  assert.match(queueJob,/result=requires-authenticated-reviewer/);
  assert.match(queueJob,/\*\*not automatically generated\*\*/);
  assert.match(queueJob,/::warning title=Protected Netlify preview/);
  assert.match(queueJob,/if: steps\.enqueue\.outputs\.result == 'requires-authenticated-reviewer'/);
});

test('the only successful unattended enqueue is HTTP 202; operational errors still fail',()=>{
  assert.match(queueJob,/\[ "\$status" = '202' \]/);
  assert.match(queueJob,/result=queued/);
  assert.match(queueJob,/Preview generation was not enqueued/);
  assert.match(queueJob,/exit 1/);
});

test('preview reader is read-only and reports real states without starting regeneration',()=>{
  assert.match(readerSource,/inquirer-preview-diagnostic\\?draft=1/);
  assert.doesNotMatch(readerSource,/fetch\\(info\\?\\.start_url/);
  assert.doesNotMatch(readerSource,/fetch\\(\\'\\/\\.netlify\\/functions\\/inquirer-preview-background/);
  assert.match(readerSource,/status\\.state==='not-started'/);
  assert.match(readerSource,/status\\.state==='running'/);
  assert.match(readerSource,/status\\.state==='error'/);
  assert.match(readerSource,/no generation was triggered/);
  assert.match(readerSource,/preview is not ready/);
});

test('a failed editorial gate retains only a deploy-local rejected review copy',()=>{
  assert.match(previewJobSource,/getDeployStore/);
  assert.match(previewJobSource,/setJSON\(identity\.rejected,\{started_at,edition\}\)/);
  assert.match(previewJobSource,/rejected_summary=summarizePreviewDiagnostic/);
  assert.match(previewDiagnosticSource,/get\(identity\.rejected/);
  assert.match(previewDiagnosticSource,/rejected\?\.started_at===status.started_at/);
  assert.match(previewDiagnosticSource,/review_only:true/);
  assert.match(previewDiagnosticSource,/status\?\.state!=='error'/);
  assert.match(previewDiagnosticSource,/status\?\.state!=='completed'/);
  assert.match(previewDiagnosticSource,/rejected_review_url:/);
});

test('preview seeding targets the active Netlify account by default',()=>{
 assert.match(queueJob,/vars\.INQUIRER_PREVIEW_SITE \|\| 'transcendent-manatee-2f0123\.netlify\.app'/);
 assert.doesNotMatch(queueJob,/vars\.INQUIRER_PREVIEW_SITE \|\| 'brilliant-faun-c5b649\.netlify\.app'/);
});

test('unpublished manuscript and missing migrated archives are never conflated',()=>{
 assert.match(readerSource,/const onNetlifyDeployPreview=/);
 assert.match(readerSource,/onNetlifyDeployPreview&&new URLSearchParams\(location\.search\)\.get\('inquirer_preview'\)==='1'/);
 assert.match(readerSource,/This is not an unpublished editorial draft/);
 assert.match(readerSource,/const inquirerPreviewEntryUrl=/);
 assert.match(readerSource,/Open the private Inquirer manuscript preview/);
});

test('every private draft targets the requested or latest completed week rather than silently backfilling',()=>{
 const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 assert.match(readerSource,/inquirerPreviewRequestedWeek/);
 assert.match(readerSource,/refusing to present the wrong manuscript/);
 assert.match(readerSource,/&preview_week=/);
 assert.match(previewJobSource,/draftUrl\.searchParams\.set\('preview_week',String\(identity\.week\)\)/);
 assert.match(hub,/const targetWeek=requestedRaw!==null\?requested:Math\.max\(1,cappedWeek-1\)/);
 assert.match(hub,/if\(week!==targetWeek\)/);
 assert.match(hub,/earliest missing locked archive/);
 assert.match(hub,/if\(previewReadOnly\)\{/);
});

test('private reader never shares a completed Week 3 result with a Week 5 or Week 6 request',()=>{
 const diagnostics=readFileSync(new URL('../netlify/functions/lib/inquirer-preview-diagnostics.mjs',import.meta.url),'utf8');
 assert.match(readerSource,/inquirer-preview-diagnostic\?draft=1'\+scope/);
 assert.doesNotMatch(readerSource,/fetch\(info\?\.start_url/);
 assert.match(readerSource,/scope\?'\?'\+scope\.slice\(1\)/);
 assert.match(previewJobSource,/get\(identity\.status/);
 assert.match(previewJobSource,/setJSON\(identity\.edition/);
 assert.match(previewDiagnosticSource,/get\(identity\.edition/);
 assert.match(diagnostics,/season\+'\/week-'\+String\(week\)/);
 assert.match(diagnostics,/resolvePreviewIdentity/);
});

test('unpublished previews explain missing historical archives before generic week mismatch',()=>{
 const hold=previewJobSource.indexOf("Private preview held:");
 const mismatch=previewJobSource.indexOf("Private manuscript identity mismatch;");
 assert.ok(hold>=0&&mismatch>hold,'Archive continuity errors must remain specific and causal');
 assert.match(previewJobSource,/edition\?\.preview_only!==true\|\|edition\?\.published_locked!==false\|\|edition\?\.available!==true/);
});

test('failed historical preview never auto-retries or regenerates while the reader opens',()=>{
 assert.match(readerSource,/async function canRetryArchiveBlockedPreview\\(season,targetWeek\\)/);
 assert.match(readerSource,/Refusing to display stale diagnostic text/);
 assert.doesNotMatch(readerSource,/if\\(again\\.status===202\\)throw Error/);
 assert.doesNotMatch(readerSource,/fetch\\(info\\?\\.start_url/);
 assert.match(readerSource,/no generation was triggered/);
});

test('diagnostic outages never masquerade as a missing week or launch duplicate expensive jobs',()=>{
 assert.doesNotMatch(previewJobSource,/get\(identity\.status,\{type:'json'\}\)\.catch\(\(\)=>null\)/);
 assert.match(previewDiagnosticSource,/state:'storage-unavailable'/);
 assert.match(previewDiagnosticSource,/Private preview storage temporarily unavailable/);
 assert.match(previewDiagnosticSource,/return json\(\{error:'Private draft storage temporarily unavailable'\},503\)/);
 assert.match(previewDiagnosticSource,/target:\{season:identity\.season,week:identity\.week\}/);
});

test('authenticated Playwright workflow fails closed and never mistakes a landing page for complete edition readback',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/fleeced-authenticated-week5-playwright.yml',import.meta.url),'utf8');
 const audit=readFileSync(new URL('../scripts/inquirer-authenticated-browser-audit.mjs',import.meta.url),'utf8');
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/FLEECED_PLAYWRIGHT_STORAGE_STATE_B64/);
 assert.match(workflow,/Protected preview was NOT audited/);
 assert.match(workflow,/exit 1/);
 assert.match(workflow,/node --check scripts\/inquirer-authenticated-browser-audit\.mjs/);
 assert.match(audit,/SSO; cannot audit protected content/);
 assert.match(audit,/complete_edition_verified:false/);
 assert.match(audit,/all_32_articles='not_verified_by_landing_page'/);
 assert.match(audit,/exact_blob_readback='not_verified_by_browser'/);
 assert.doesNotMatch(audit,/complete_edition_verified=true/);
});

test('read-only Playwright feature navigation rejects mutation-like preview links',()=>{
 const audit=readFileSync(new URL('../scripts/inquirer-authenticated-browser-audit.mjs',import.meta.url),'utf8');
 assert.match(audit,/sameOriginLinks/);
 assert.match(audit,/u\.origin===new URL\(current\)\.origin/);
 assert.match(audit,/start=1\|draft=1\|generate\|publish\|enqueue\|regenerate\|queue\|delete\|write\|import/);
 assert.match(audit,/feature_navigation/);
 assert.match(audit,/report\.landing_page_verified/);
 assert.match(audit,/complete_edition_verified:false/);
});
