import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('staged Week 5 review requires authenticated SSO on replacement deploy preview',()=>{
 const source=readFileSync(new URL('../netlify/functions/inquirer-staged-review.mjs',import.meta.url),'utf8');
 assert.match(source,/siteId!==expected/);
 assert.match(source,/deployment!=='deploy-preview'/);
 assert.match(source,/previewHost/);
 assert.match(source,/!context\?\.user\?\.id/);
 assert.match(source,/reply\(\{error:'Private deploy-preview review only'\},403\)/);
 assert.match(source,/reply\(\{error:'Authenticated Netlify team reviewer required'\},401\)/);
});
test('private staged review reads production shared Blob and never approves or publishes',()=>{
 const source=readFileSync(new URL('../netlify/functions/inquirer-staged-review.mjs',import.meta.url),'utf8');
 assert.match(source,/getStore\('fleeced-league-hub',\{consistency:'strong'\}\)/);
 assert.match(source,/store\.get\(key,\{type:'json'\}\)/);
 assert.match(source,/editorialCopyDigest\(edition\)/);
 assert.match(source,/inspectEditionBeforePublication\(edition\)/);
 assert.doesNotMatch(source,/\.setJSON\(|\.set\(|writeFileSync\(|writeFile\(|approvalKey/);
 assert.match(source,/inquirer_article/);
 assert.match(source,/league_overview/);
 assert.match(source,/private, no-store/);
});
