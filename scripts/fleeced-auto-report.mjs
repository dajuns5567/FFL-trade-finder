// Run the read-only local browser audit and post ONLY sanitized findings to PR #404.
// Requires an existing 'gh auth login' and an authenticated persistent Playwright profile.
// This is an explicit local command; scheduling is optional and not enabled by default.
import {spawnSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const repo='dajuns5567/FFL-trade-finder';
const pr=404;
const audit=spawnSync(process.execPath,[join(root,'scripts','fleeced-local-playwright-audit.mjs')],{
 cwd:root,stdio:'inherit',env:{...process.env,FLEECED_HEADLESS:'1'},timeout:180000
});
if(audit.error)throw audit.error;
const report=JSON.parse(await readFile(join(root,'playwright-local-audit.json'),'utf8'));
const checks=report.checks||{};
const safe={
 source:'fleeced-local-playwright-audit',
 timestamp:new Date().toISOString(),
 preview_host:new URL(report.url).hostname,
 authenticated:report.authenticated===true,
 landing_page:report.landing_page===true,
 complete_edition_verified:report.complete_edition_verified===true,
 week5_diagnostic:checks.week5_diagnostic||null,
 week5_draft_readback:checks.week5_draft_readback||null,
 ui_flags:{
  not_ready:checks.not_ready===true,
  missing_archive:checks.missing_archive===true,
  recap:checks.recap===true,
  awards:checks.awards===true,
  badges:checks.badges===true,
  spotlight:checks.spotlight===true
 },
 errors:(report.errors||[]).map(e=>String(e).slice(0,200))
};
const body='<!-- fleeced-readonly-audit -->\n### Automated read-only Fleeced audit\n\n'+'\u0060\u0060\u0060json\n'+JSON.stringify(safe,null,2)+'\n\u0060\u0060\u0060\n\nNo login state, manuscript prose, page evidence, cookies, or tokens included.\n';
const path=join(root,'playwright-safe-pr-report.md');
await writeFile(path,body,{mode:0o600});
const result=spawnSync('gh',['pr','comment',String(pr),'--repo',repo,'--body-file',path],{cwd:root,encoding:'utf8'});
if(result.status!==0)throw Error('Audit ran, but publishing sanitized PR comment failed: '+String(result.stderr).slice(0,300));
console.log('Sanitized audit report attached to PR #'+pr+'. No JSON upload to ChatGPT required.');
if(audit.status!==0)process.exitCode=audit.status||1;
