import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');

test('private readable URL redirects into the canonical League Hub article UI',()=>{
 const diagnostic=read('netlify/functions/inquirer-preview-diagnostic.mjs');
 assert.match(diagnostic,/target\.searchParams\.set\('inquirer_preview','1'\)/);
 assert.match(diagnostic,/status:302/);
 assert.ok(diagnostic.indexOf("get('view')==='readable')return readableEdition(req)")<diagnostic.indexOf("status?.state!=='completed'"),'reader must redirect even before draft generation finishes');
 assert.doesNotMatch(diagnostic,/<details id="team-|class="recap-block"|background:#f4f0e7/);
});

test('preview article uses the exact archived article and recap render functions',()=>{
 const hub=read('league-hub-v451.js');
 assert.match(hub,/const inquirerPreviewMode=\/\^deploy-preview-/);
 assert.match(hub,/edition\?\.preview_only!==true\|\|edition\?\.published_locked!==false/);
 assert.match(hub,/if\(inquirerPreviewMode&&view==='daily'\)/);
 assert.match(hub,/host\.innerHTML=dailyHTML\(\[\],\[\],edition,null,edition\)/);
 assert.match(hub,/if\(overviewOpen\)body=leagueOverviewArticle\(w\.league_overview,teams\)/);
 assert.match(hub,/else if\(opened\)body=teamArticle\(opened,w\.week,teams\)/);
 assert.match(hub,/PRIVATE EDITORIAL PREVIEW • UNPUBLISHED WEEK/);
});

test('site HTML requests the current canonical article renderer instead of a cached older script',()=>{
 const site=read('netlify/functions/site-v29.mjs');
 assert.match(site,/league-hub-v451\.js\?v=525/);
 assert.doesNotMatch(site,/runtimeV21 = .*league-hub-v451\.js\?v=524/);
});
