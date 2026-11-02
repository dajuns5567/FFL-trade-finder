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
test('Netlify schedules the publication poll within two hours, not once daily',()=>{
 const config=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
 assert.match(config,/\[functions\."inquirer-publish-scheduled"\]\s*(?:#[^\n]*\n\s*)*schedule\s*=\s*"0 \*\/2 \* \* \*"/);
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


test('two-hour scheduler progresses to next completed week but never republishes the same edition',()=>{
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
