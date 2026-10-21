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
