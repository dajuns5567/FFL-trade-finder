import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FORWARD_EDITORIAL_REVISION} from '../netlify/functions/inquirer-editorial-v31.mjs';
import {inquirerScheduleDecision} from '../netlify/functions/lib/inquirer-schedule-decision.mjs';

const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
const editorial=readFileSync(new URL('../netlify/functions/inquirer-editorial-v31.mjs',import.meta.url),'utf8');

test('Week 10 editorial hold can be retried exactly once under V110 without bypassing same-revision hold',()=>{
 assert.equal(FORWARD_EDITORIAL_REVISION,110);
 const nfl={season:2026,week:11};
 const held={state:'editorial-hold',season:2026,week:10,editorial_revision:109,available:false};
 assert.equal(inquirerScheduleDecision({status:held,nfl,revision:110}).queue,true);
 assert.equal(inquirerScheduleDecision({status:{...held,editorial_revision:110},nfl,revision:110}).queue,false);
 assert.equal(inquirerScheduleDecision({status:{...held,editorial_revision:110},nfl,revision:110,approvedHeldEdition:true}).queue,true);
});
test('expanded variation search is bounded, deterministic and identical for previews and publication',()=>{
 const start=hub.indexOf('for(const salt of [5,0,1,2,3,4,6,7])');
 const end=hub.indexOf('// A candidate with unresolved editorial issues',start);
 assert.ok(start>0&&end>start,'V110 candidate selection must remain in the same newsroom workflow');
 const selected=hub.slice(start,end);
 assert.match(selected,/applyInquirerEditorialV31\(/);
 assert.match(selected,/const q=evaluateInquirerEditionQuality\(candidate,previousBroadcast\)/);
 assert.match(selected,/inspectPreviousWeekEditorialReuse\(candidate,old\)/);
 assert.match(selected,/const a=inspectEditionBeforePublication\(candidate\)/);
 assert.match(selected,/if\(q\.ok&&a\.ok\)/);
 assert.match(selected,/if\(!best\|\|score<bestScore\)/);
 assert.doesNotMatch(selected,/\.setJSON\(|\.set\(/);
 assert.match(hub,/if\(previewReadOnly\)return\{\.\.\.result,available:true,published_locked:false,preview_only:true/);
 assert.match(hub,/if\(!audit\.ok\|\|!deepQualityOk\|\|!admission\.approved\|\|!independentCopy\.ok\)/);
 assert.match(hub,/review_required:true,stage_key:stageKey/);
 assert.match(editorial,/export const FORWARD_EDITORIAL_REVISION=110;/);
});
test('new salt candidates cannot overwrite existing locked history or turn a draft into an approved edition',()=>{
 assert.match(hub,/if\(!isLockedInquirerEdition\(stored,season,w\)\)/);
 assert.match(hub,/if\(!previewReadOnly\)await ensureLockedEditionIndexed\(s,stored,key\)/);
 assert.match(hub,/if\(!accepted\)\{accepted=best;quality=bestQuality;variationSalt=bestSalt\}/);
 assert.match(hub,/await s\.setJSON\(stageKey,\{schema_version:1,season,week,digest:admission\.digest/);
 assert.match(hub,/if\(automatedAdmission\.approved&&!manualAdmission\.approved\)/);
});

test('completed publisher records minor repetition as unresolved editorial quality debt',()=>{
 const worker=readFileSync(new URL('../netlify/functions/inquirer-publish-background.mjs',import.meta.url),'utf8');
 assert.match(worker,/minorRepetitionWarning=report\?\.editorial_generation\?\.quality_metrics\?\.minor_repetition_warning\|\|null/);
 assert.match(worker,/inquirer-published-editorial-quality-warning/);
 assert.match(worker,/editorial_warnings:minorRepetitionWarning\?\.requires_improvement===true/);
 assert.match(worker,/severity:'warning',requires_improvement:true/);
 assert.match(worker,/const completed=!reportError&&!awardsError&&!report\?\.review_required&&hasCompleteWeekFeaturePackage\(report,awards\)/);
});
