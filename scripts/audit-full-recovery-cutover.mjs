#!/usr/bin/env node
// Read-only full-application cutover preflight. Never starts publishers or mutates Netlify.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const prod=read('netlify.toml');
const isolated=read('recovery-isolated/netlify.toml');
const archive=read('.github/workflows/value-history-archive.yml');
const resolver=read('scripts/resolve-active-netlify-site.mjs');
const mainHub=read('netlify/functions/league-hub.mjs');
const list=fs.readdirSync(path.join(root,'netlify/functions')).filter(x=>/publish|scheduled|on-load|background|value-history/.test(x));
const checks={
 'production has scheduled inquirer publisher': /\[functions\."inquirer-publish-scheduled"\][\s\S]*?schedule\s*=/.test(prod),
 'isolated viewer omits scheduled publisher': !/schedule\s*=/.test(isolated),
 'isolated viewer not production configuration': !isolated.includes('functions = "netlify/functions"')||isolated.includes('publish = "public"'),
 'archival workflow pins production site identity': archive.includes("VALUE_HISTORY_PRODUCTION_SITE_ID: 'b1a7f3c4-7c1c-4a5b-8d5f-01fa768b9323'"),
 'archival workflow permits safe commit drift': archive.includes("steps.active_site.outputs.site_id == 'b1a7f3c4-7c1c-4a5b-8d5f-01fa768b9323'"),
 'resolver requires a pinned production identity': resolver.includes('VALUE_HISTORY_PRODUCTION_SITE_ID')&&resolver.includes('selectArchiveProductionSite'),
 'production app contains write-capable store': /getStore\(['"]fleeced-league-hub/.test(mainHub),
 'production app does not automatically have four preserved week preloads': !mainHub.includes("inquirer-week4-2026-preload"),
};
assert(checks['production has scheduled inquirer publisher'],'Publication schedule not located; review architecture before migration');
assert(checks['isolated viewer omits scheduled publisher'],'Unsafe isolated scheduled publisher');
assert(checks['archival workflow pins production site identity'],'Archive production site is not pinned');
assert(checks['archival workflow permits safe commit drift'],'Safe pinned-site archival ingest guard missing');
assert(checks['resolver requires a pinned production identity'],'Resolver no longer enforces pinned site checks');
const result={
 status:'HOLD_FULL_APPLICATION_CUTOVER',
 checks,
 source_writers_and_history_functions:list,
 architectural_blockers:[
 'The isolated recovery viewer is not the original FLEECED! application.',
 'The actual production site uses its own Netlify Blob stores; the 160 historical and 5 editorial objects were restored to rehearsal stores with different names.',
 'The main branch currently lacks the Week 3 and Week 4 approved preload imports present on the development branch.',
 'The normal app includes scheduled/authorized publishing and write paths; deploying it without isolation could publish or alter recovered data.',
 'A different Netlify account has not been connected or provisioned; both sites belong to the same team.',
 'The historical archiver requires the explicitly pinned production Netlify site ID to be updated only after an independently approved account cutover; repository linkage, production branch, and ready deployment must be verified.',
 'Private HTTP SSO prevents claiming an anonymous served-API acceptance pass.'
 ]};
console.log(JSON.stringify(result,null,2));
