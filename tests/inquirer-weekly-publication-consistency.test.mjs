import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const hub=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
const pub=readFileSync(new URL('../netlify/functions/inquirer-publish-background.mjs',import.meta.url),'utf8');
const ui=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
const source=readFileSync(new URL('../netlify/functions/inquirer-editorial-v31.mjs',import.meta.url),'utf8');

test('only ONE forward editorial writer remains in both production and private previews',()=>{
 assert.match(hub,/applyInquirerEditorialV31\(\{season,week/);
 assert.match(hub,/for\(const salt of \[5,0,1,2,3,4\]\)/);
 assert.match(hub,/const q=evaluateInquirerEditionQuality\(candidate,previousBroadcast\)/);
 assert.match(hub,/const a=inspectEditionBeforePublication\(candidate\)/);
 assert.match(hub,/if\(q\.ok&&a\.ok\)/);
 assert.match(source,/FORWARD_EDITORIAL_REVISION=39/);
 assert.match(hub,/preview_editorial_audit:audit,preview_generation_quality:quality/);
});
test('previous published copy can neither be invented nor overwritten after partial failure',()=>{
 assert.match(hub,/isLockedInquirerEdition\(stored,season,w\)/);
 assert.match(hub,/isLockedInquirerEdition\(previousBroadcast,season,week-1\)/);
 assert.doesNotMatch(hub,/previousBroadcast=previousStored\?\{\.\.\.previousStored,published_locked:true\}/);
 assert.match(hub,/if\(!previewReadOnly\)await ensureLockedEditionIndexed\(s,stored,key\)/);
 const index=hub.indexOf('async function ensureLockedEditionIndexed');
 const commit=hub.indexOf("await s.setJSON('broadcasts/index.json',next)",index);
 const articles=hub.indexOf('await syncReporterArchives(s,edition,key)',index);
 assert.ok(index>=0&&articles>index&&commit>articles,'derived files must commit before archive index');
});
test('Week 5+ publication includes locked award package or remains retryable',()=>{
 assert.match(pub,/report\?\.available===true&&report\?\.published_locked===true/);
 assert.match(pub,/await weeklyAwards\(\)/);
 assert.match(pub,/record\?\.players_of_week/);
 assert.match(pub,/Array\.isArray\(record\?\.manager_awards\)/);
 assert.match(pub,/awardsError/);
 assert.match(pub,/report\?\.available===true\?'completed':'waiting'/);
});
test('the reader never labels old Players of the Week as the current newspaper week',()=>{
 assert.match(ui,/function playersOfWeekHTML\(w,data=weeklyAwardsCache\)/);
 assert.match(ui,/rec=rows\.find\(r=>Number\(r\.season\)===season&&Number\(r\.week\)===week\)\|\|null/);
 assert.match(ui,/function managerWeeklyBadgesHTML/);
 assert.match(ui,/function spotlightBlock/);
 assert.match(ui,/function weeklyAwardCardsHTML/);
});
