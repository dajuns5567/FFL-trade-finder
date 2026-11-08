import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inquirerScheduleDecision} from '../netlify/functions/lib/inquirer-schedule-decision.mjs';

const nfl={season:2026,week:6};
const revision=29;
test('automatic poll queues the first completed week and a new editorial revision',()=>{
 assert.equal(inquirerScheduleDecision({nfl,revision,status:null}).queue,true);
 assert.equal(inquirerScheduleDecision({nfl,revision,status:{state:'editorial-hold',season:2026,week:5,editorial_revision:28}}).queue,true);
});
test('automatic poll skips a published or unchanged held edition',()=>{
 assert.equal(inquirerScheduleDecision({nfl,revision,status:{state:'completed',available:true,season:2026,week:5,editorial_revision:29}}).queue,false);
 assert.equal(inquirerScheduleDecision({nfl,revision,status:{state:'editorial-hold',season:2026,week:5,editorial_revision:29}}).queue,false);
});
test('automatic poll avoids duplicate concurrent generation and resumes stale jobs',()=>{
 const now=Date.parse('2026-10-20T10:00:00Z');
 const running={state:'running',started_at:'2026-10-20T09:50:00Z'};
 assert.equal(inquirerScheduleDecision({nfl,revision,status:running,now}).queue,false);
 assert.equal(inquirerScheduleDecision({nfl,revision,status:{...running,started_at:'2026-10-20T09:30:00Z'},now}).queue,true);
});
test('automatic poll does not schedule an incomplete opening-week edition',()=>{
 assert.equal(inquirerScheduleDecision({nfl:{season:2026,week:1},revision}).queue,false);
 assert.equal(inquirerScheduleDecision({nfl:null,revision}).queue,false);
});
test('Netlify automatically catches up completed Inquirer weeks on a five-minute cadence',()=>{
 const config=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
 assert.match(config,/\[functions\."inquirer-publish-scheduled"\]\s*(?:#[^\n]*\n\s*)*schedule\s*=\s*"\*\/5 \* \* \* \*"/);
});

test('scheduled publisher fails closed on replacement sites and missing history',()=>{
 const source=readFileSync(new URL('../netlify/functions/inquirer-publish-scheduled.mjs',import.meta.url),'utf8');
 assert.match(source,/FLEECED_ENABLE_NEW_SITE_PUBLISHER/);
 assert.match(source,/Replacement site is preview-only pending verified archive migration/);
 assert.match(source,/context==='deploy-preview'/);
 assert.match(source,/if\(!status\|\|typeof status!=='object'\)/);
 assert.match(source,/Publication state or NFL clock unavailable; holding publication/);
 assert.doesNotMatch(source,/catch\(error\)\{console\.warn\('inquirer-schedule-status-check'/);
});

test('private Inquirer history reads remain local, SSO-independent, and mutation-free',()=>{
 const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 const history=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
 assert.match(hub,/if\(previewReadOnly\)url\.searchParams\.set\('readonly_preview','1'\)/);
 assert.match(hub,/const r=await valueHistoryHandler\(new Request\(url\)\)/);
 assert.match(history,/const readonlyPreview=req\.method==='GET'&&url\.searchParams\.get\('readonly_preview'\)==='1'/);
 assert.match(history,/if\(s&&!readonlyPreview\)\{/);
});

test('an unchanged earlier-week editorial hold blocks later weeks without repeated costly generation',()=>{
 const w7={season:2026,week:7};
 const held={state:'editorial-hold',season:2026,week:5,editorial_revision:29};
 const current=inquirerScheduleDecision({nfl:w7,revision:29,status:held});
 assert.equal(current.queue,false);
 assert.match(current.reason,/earlier-week editorial hold/);
 assert.equal(inquirerScheduleDecision({nfl:w7,revision:30,status:held}).queue,true,'new vetted editorial revision must release the hold');
 assert.equal(inquirerScheduleDecision({nfl:{season:2027,week:3},revision:29,status:held}).queue,true,'a hold from another season cannot suppress this season');
});


test('scheduler progresses to next completed week but never republishes the same edition',()=>{
 const week6={season:2026,week:7};
 const previouslyLocked={state:'completed',available:true,season:2026,week:5,editorial_revision:78};
 const ready=inquirerScheduleDecision({nfl:week6,revision:78,status:previouslyLocked});
 assert.equal(ready.queue,true,'a completed Week 5 must not block eligible Week 6');
 assert.equal(ready.finishedWeek,6);
 const justPublished={...previouslyLocked,week:6};
 assert.equal(inquirerScheduleDecision({nfl:week6,revision:78,status:justPublished}).queue,false,'never republish a finished edition');
 assert.equal(inquirerScheduleDecision({nfl:{season:2026,week:8},revision:78,status:justPublished}).queue,true,'next completed NFL week must be eligible');
});
test('automatic publication retries interrupted work but honors earlier editorial holds',()=>{
 const now=Date.parse('2026-11-03T12:00:00Z');
 const candidate={season:2026,week:7};
 assert.equal(inquirerScheduleDecision({nfl:candidate,revision:78,status:{state:'error',season:2026,week:6,editorial_revision:78},now}).queue,true);
 assert.equal(inquirerScheduleDecision({nfl:candidate,revision:78,status:{state:'waiting',season:2026,week:6,editorial_revision:78},now}).queue,true);
 assert.equal(inquirerScheduleDecision({nfl:candidate,revision:78,status:{state:'editorial-hold',season:2026,week:5,editorial_revision:78},now}).queue,false);
});
test('scheduler cannot silently bypass review digest or replacement-site cutover flags',()=>{
 const worker=readFileSync(new URL('../netlify/functions/inquirer-publish-background.mjs',import.meta.url),'utf8');
 const scheduler=readFileSync(new URL('../netlify/functions/inquirer-publish-scheduled.mjs',import.meta.url),'utf8');
 const gate=readFileSync(new URL('../netlify/functions/inquirer-publication-guard.mjs',import.meta.url),'utf8');
 assert.match(worker,/FLEECED_ENABLE_NEW_SITE_PUBLISHER/);
 assert.match(worker,/context==='deploy-preview'/);
 assert.match(scheduler,/FLEECED_ENABLE_NEW_SITE_PUBLISHER/);
 assert.match(scheduler,/verifiedReplacementHistory/);
 assert.match(gate,/editorialCopyDigest/);
 assert.match(gate,/approval/);
});


test('an exact approved staged hold resumes scheduling without changing the editorial revision',()=>{
 const status={state:'editorial-hold',season:2026,week:5,editorial_revision:29};
 const current={season:2026,week:8};
 assert.equal(inquirerScheduleDecision({status,nfl:current,revision:29}).queue,false);
 const resumed=inquirerScheduleDecision({status,nfl:current,revision:29,approvedHeldEdition:true});
 assert.equal(resumed.queue,true);
 assert.equal(resumed.finishedWeek,7);
 assert.equal(inquirerScheduleDecision({status,nfl:current,revision:29,approvedHeldEdition:false}).queue,false);
});

test('the reviewed edition is approved on the actual replacement site and published unchanged',()=>{
 const script=readFileSync(new URL('../scripts/approve-staged-inquirer.mjs',import.meta.url),'utf8');
 const workflow=readFileSync(new URL('../.github/workflows/fleeced-editorial-approve-reviewed-week.yml',import.meta.url),'utf8');
 const scheduler=readFileSync(new URL('../netlify/functions/inquirer-publish-scheduled.mjs',import.meta.url),'utf8');
 const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
 const siteId='8776d155-bc7b-4dcd-bafc-3d70d3d51800';
 assert.ok(script.includes(siteId),'approval writer targets replacement production site');
 assert.ok(workflow.includes(siteId),'approval workflow targets replacement production site');
 assert.doesNotMatch(script,/2e556797-6f35-4037-aa5a-1338724eb71d/);
 assert.doesNotMatch(workflow,/2e556797-6f35-4037-aa5a-1338724eb71d/);
 assert.match(scheduler,/editorialApprovalMatches\(staged\.edition,approval\)\.approved===true/);
 assert.match(scheduler,/approvedHeldEdition/);
 assert.match(hub,/staged\.digest===editorialCopyDigest\(reviewed\)/);
 assert.match(hub,/editorialApprovalMatches\(reviewed,approval\)\.approved===true/);
 assert.match(hub,/inspectEditionBeforePublication\(reviewed\)\.ok/);
 assert.match(hub,/evaluateInquirerEditionQuality\(reviewed,previousBroadcast\)\.ok/);
 assert.match(hub,/s\.setJSON\(key,locked,\{onlyIfNew:true\}\)/);
 assert.match(hub,/ensureLockedEditionIndexed\(s,locked,key\)/);
 assert.match(hub,/broadcasts\/index\.json/);
});

test('backlogged Weeks 6, 7 and 8 each enqueue after the preceding week is committed',()=>{
 const nfl={season:2026,week:9};
 const make=(week,state='completed')=>({season:2026,week,editorial_revision:revision,state,available:state==='completed'});
 for(const week of [5,6,7]){
  const next=inquirerScheduleDecision({status:make(week),nfl,revision});
  assert.equal(next.queue,true,'completed Week '+week+' should allow next backlog item');
  assert.equal(next.finishedWeek,8);
 }
 assert.equal(inquirerScheduleDecision({status:make(8),nfl,revision}).queue,false);
 assert.equal(inquirerScheduleDecision({status:make(6,'editorial-hold'),nfl,revision}).queue,false);
 assert.equal(inquirerScheduleDecision({status:{...make(6,'running'),started_at:'2026-11-05T03:00:00Z'},nfl,revision,now:Date.parse('2026-11-05T03:05:00Z')}).queue,false);
});


test('owner-approved cutover builds only new-site production and never old sites or previews',async()=>{
 const {spawnSync}=await import('node:child_process');
 const config=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
 const literal=config.match(/^\s*ignore = (".*")$/m)?.[1];
 assert.ok(literal,'Netlify build ignore must be present');
 const command=JSON.parse(literal);
 const code=(SITE_ID,SITE_NAME,CONTEXT)=>spawnSync('sh',['-c',command],{
  env:{...process.env,SITE_ID,SITE_NAME,CONTEXT},encoding:'utf8'}).status;
 assert.equal(code('fa33dfe4-8293-441e-8da0-25cc66fc984c','','deploy-preview'),0,'new site preview stays skipped');
 assert.equal(code('fa33dfe4-8293-441e-8da0-25cc66fc984c','','production'),1,'new site production only');
 assert.equal(code('','precious-dango-fb4633','production'),1,'new site production allowed by site name');
 assert.equal(code('8776d155-bc7b-4dcd-bafc-3d70d3d51800','transcendent-manatee-2f0123','deploy-preview'),0,'old site never builds');
 assert.equal(code('3b9ae5bd-0d0f-4570-b2b7-89afae8a0e5f','gleaming-dodol-8dbc4a','deploy-preview'),0,'retired site never builds');
 const {privatePreviewStoreName,isPreviewDiagnosticContext}=await import('../netlify/functions/lib/inquirer-preview-diagnostics.mjs');
 const preview='https://deploy-preview-427--precious-dango-fb4633.netlify.app/.netlify/functions/inquirer-preview-diagnostic';
 assert.equal(privatePreviewStoreName(preview),'fleeced-inquirer-private-pr427-persistent');
 assert.equal(isPreviewDiagnosticContext(preview),true);
 assert.equal(privatePreviewStoreName('https://precious-dango-fb4633.netlify.app/'),null);
});
