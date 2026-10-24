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

test('authenticated preview reader loads an existing draft without starting a job',()=>{
 const loader=readerSource.slice(readerSource.indexOf('async function loadInquirerPreview()'),readerSource.indexOf('const esc='));
 assert.match(loader,/inquirer-preview-diagnostic\?draft=1/);
 assert.match(loader,/status\.state==='not-started'/);
 assert.match(loader,/status\.state==='running'/);
 assert.match(loader,/status\.state==='error'/);
 assert.doesNotMatch(loader,/inquirer-preview-background\?start=1/);
 assert.doesNotMatch(loader,/queued\.status!==202/);
 assert.match(loader,/no generation was triggered/);
 assert.match(loader,/preview_editorial_audit/);
 assert.match(loader,/preview_generation_quality/);
 assert.doesNotMatch(readerSource,/<h3>Private Week 5 preview is generating<\/h3>/);
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

test('Week 5 reader never retries manuscript generation or launches a preview job',()=>{
 const loader=readerSource.slice(readerSource.indexOf('async function loadInquirerPreview()'),readerSource.indexOf('const esc='));
 assert.match(loader,/draft=1/);
 assert.match(loader,/preview_week/);
 assert.match(loader,/Refusing to display stale diagnostic text/);
 assert.doesNotMatch(loader,/fetch\(info\?\.start_url/);
 assert.doesNotMatch(loader,/inquirer-preview-background/);
 assert.doesNotMatch(loader,/canRetryArchiveBlockedPreview/);
 assert.match(loader,/preview_editorial_audit/);
 assert.match(loader,/preview_generation_quality/);
});

test('diagnostic outages never masquerade as a missing week or launch duplicate expensive jobs',()=>{
 assert.doesNotMatch(previewJobSource,/get\(identity\.status,\{type:'json'\}\)\.catch\(\(\)=>null\)/);
 assert.match(previewDiagnosticSource,/state:'storage-unavailable'/);
 assert.match(previewDiagnosticSource,/Private preview storage temporarily unavailable/);
 assert.match(previewDiagnosticSource,/return json\(\{error:'Private draft storage temporarily unavailable'\},503\)/);
 assert.match(previewDiagnosticSource,/target:\{season:identity\.season,week:identity\.week\}/);
});

test('every future completed draft passes full independent structural audit before storage',()=>{
 const gate=previewJobSource.indexOf('const structural=auditPrivateEdition(edition)');
 const saved=previewJobSource.indexOf('await store.setJSON(identity.edition,edition,{onlyIfNew:true})');
 assert.ok(gate>=0&&saved>gate,'structural audit must precede saved completed edition');
 assert.match(previewJobSource,/if\(!structural\.passed\)/);
 assert.match(previewJobSource,/setJSON\(identity\.rejected,\{started_at,edition\}\)/);
 assert.match(previewJobSource,/structural quality audit/);
 const audit=readFileSync(new URL('../netlify/functions/lib/inquirer-preview-diagnostics.mjs',import.meta.url),'utf8');
 assert.match(audit,/teams\.length!==32/);
 assert.match(audit,/Object\.keys\(counts\)\.length!==4/);
 assert.match(audit,/c!==8/);
 assert.match(audit,/words<300\|\|words>650/);
 assert.match(audit,/six-beat recap missing/);
 assert.match(audit,/repeated cross-roster paragraphs/);
});

test('every completed weekly preview must be structurally verified after exact deploy-local readback',()=>{
 const write=previewJobSource.indexOf('await store.setJSON(identity.edition,edition,{onlyIfNew:true})');
 const read=previewJobSource.indexOf("const readback=await store.get(identity.edition,{type:'json'})");
 const status=previewJobSource.indexOf("await store.setJSON(identity.status,{\\n   state:'completed'".replace('\\n','\n'));
 assert.ok(write>=0&&read>write&&status>read,'completion follows an independently audited saved-blob readback');
 assert.match(previewJobSource,/auditPrivateEdition\(readback\)\.passed/);
 assert.match(previewJobSource,/write verification failed; completion withheld/);
});

test('weekly structural checker blocks recycled column openings instead of rewarding repeated punchlines',()=>{
 const audit=readFileSync(new URL('../netlify/functions/lib/inquirer-preview-diagnostics.mjs',import.meta.url),'utf8');
 assert.match(audit,/const repeatedOpenings=/);
 assert.match(audit,/recycled column openings/);
 assert.match(audit,/recycled_opening_groups/);
 assert.match(previewJobSource,/auditPrivateEdition\(edition\)/);
 assert.match(previewJobSource,/auditPrivateEdition\(readback\)/);
});

test('exact saved manuscript digest is required before any week is marked completed',()=>{
 assert.match(previewJobSource,/createHash/);
 assert.match(previewJobSource,/fingerprint\(readback\)!==fingerprint\(edition\)/);
 const write=previewJobSource.indexOf('await store.setJSON(identity.edition,edition,{onlyIfNew:true})');
 const digest=previewJobSource.indexOf('fingerprint(readback)!==fingerprint(edition)');
 const complete=previewJobSource.indexOf("state:'completed'",write);
 assert.ok(write>=0&&digest>write&&complete>digest);
});

test('private weekly manuscripts survive preview rebuilds in a PR-isolated store',()=>{
 assert.match(previewJobSource,/getStore\(\{name:'fleeced-inquirer-private-pr402-persistent',consistency:'strong'/);
 assert.match(previewJobSource,/getDeployStore/);
 assert.match(previewDiagnosticSource,/getStore\(\{name:'fleeced-inquirer-private-pr402-persistent',consistency:'strong'/);
 assert.match(previewDiagnosticSource,/legacy\.get\(identity\.edition/);
 assert.match(previewJobSource,/get\(identity\.status/);
});

test('sitewide persistent draft is visible only on the originating protected PR402 host',()=>{
 const expected='deploy-preview-402--transcendent-manatee-2f0123.netlify.app';
 assert.ok(previewJobSource.includes(expected));
 assert.ok(previewDiagnosticSource.includes(expected));
 assert.match(previewJobSource,/new Response\('Forbidden',\{status:403\}\)/);
 assert.match(previewDiagnosticSource,/Private editorial store reserved for PR 402/);
});

test('production candidate evaluator enforces original Week5 anti-scaffold findings for every future week',()=>{
 const editorial=readFileSync(new URL('../netlify/functions/inquirer-editorial-v31.mjs',import.meta.url),'utf8');
 const narrative=readFileSync(new URL('../netlify/functions/inquirer-narrative-architecture.mjs',import.meta.url),'utf8');
 assert.match(editorial,/cross-team-nine-word-scaffold/);
 assert.match(editorial,/extendedPhraseOwners/);
 assert.match(editorial,/zero-point-production-praise/);
 assert.match(editorial,/scored exactly 0\.0, including 0\.0/);
 assert.match(narrative,/const lead=leads\[variant%leads.length\]/);
 assert.match(narrative,/detail\.charAt\(0\)\.toUpperCase\(\)/);
 assert.doesNotMatch(narrative.slice(narrative.indexOf('function storyStat('),narrative.indexOf('function cullRecycledMetaphors(')),/The play-by-play records/);
});

test('a previously saved edition cannot be overwritten or regenerated after a lost status key',()=>{
 const preexisting=previewJobSource.indexOf('const previouslySaved=await store.get(identity.edition');
 const generation=previewJobSource.indexOf('const edition=await weeklyReport(');
 assert.ok(preexisting>=0&&generation>preexisting,'existing draft check precedes generation');
 assert.match(previewJobSource,/if\(previouslySaved\)/);
 assert.match(previewJobSource,/setJSON\(identity\.edition,edition,\{onlyIfNew:true\}\)/);
 assert.match(previewJobSource,/existing weekly manuscript won the create-only write/);
});

test('verified persisted manuscript wins over lost preview status after redeploy',()=>{
 assert.match(previewDiagnosticSource,/restored_from_saved_manuscript:true/);
 assert.match(previewDiagnosticSource,/savedEdition\.preview_editorial_audit\?\.ok===true/);
 assert.match(previewDiagnosticSource,/savedEdition\.preview_generation_quality\?\.ok===true/);
 assert.match(previewDiagnosticSource,/savedEdition\.published_locked===false/);
 assert.match(previewDiagnosticSource,/Number\(savedEdition\.week\)===identity\.week/);
});

test('a persisted preview cannot regain completed status with empty evidence-backed value desks',()=>{
 const audit=readFileSync(new URL('../netlify/functions/lib/inquirer-preview-diagnostics.mjs',import.meta.url),'utf8');
 assert.match(audit,/empty value desk roster/);
 assert.match(previewDiagnosticSource,/auditPrivateEdition\(savedEdition\)\.passed/);
});

test('stale completed preview status cannot serve editorially rejected manuscripts',()=>{
 assert.match(previewDiagnosticSource,/state:'editorial-hold'/);
 assert.match(previewDiagnosticSource,/ready:approved/);
 assert.match(previewDiagnosticSource,/auditPrivateEdition\(edition\)\.passed/);
 assert.match(previewDiagnosticSource,/Unpublished draft failed current editorial requirements/);
});

test('editorial hold remains inspectable without serving the rejected manuscript',()=>{
 assert.match(previewDiagnosticSource,/status\?\.state!=='completed'&&status\?\.state!=='editorial-hold'/);
 assert.match(previewDiagnosticSource,/ready:approved/);
 assert.match(previewDiagnosticSource,/Unpublished draft failed current editorial requirements/);
});

test('audit readiness requires both upstream quality gates and completed audited status',()=>{
 assert.match(previewDiagnosticSource,/const approved=audit\.passed&&draft\.preview_editorial_audit\?\.ok===true&&/);
 assert.match(previewDiagnosticSource,/draft\.preview_generation_quality\?\.ok===true&&status\?\.state==='completed'/);
 assert.match(previewDiagnosticSource,/ready:approved/);
});

test('value desk quality gate does not depend on optional roster-value adapter keys',()=>{
 const audit=readFileSync(new URL('../netlify/functions/lib/inquirer-preview-diagnostics.mjs',import.meta.url),'utf8');
 assert.match(audit,/value\.paragraphs\.some/);
 assert.doesNotMatch(audit,/const market=t\?\.value_history_week/);
});
