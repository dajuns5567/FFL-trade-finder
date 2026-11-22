import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {injectedScripts,compareVersionAssets,checkRuntimeContracts,auditSite} from '../scripts/audit-site-release-contract.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const baseline=read('netlify/functions/site-v17.mjs')+read('netlify/functions/site-v29.mjs');
const entry=(path,version)=>'<script src="/'+path+'?v='+version+'"></script>';

test('actual site renders all critical assets and major controls from the real repository',async()=>{
 const result=await auditSite({root});
 assert(result.scripts>=14);
 assert(result.rendered_scripts>=14);
 assert(result.verified_paths>=10);
});

test('new PR may increase version numbers without removing subsystems',()=>{
 const newHtml=baseline.replace('value-history-v276.js?v=541','value-history-v276.js?v=542')
  .replace('league-hub-v451.js?v=543','league-hub-v451.js?v=544');
 assert.doesNotThrow(()=>compareVersionAssets(baseline,newHtml));
});

test('a stale previous-version script or accidental removal blocks release',()=>{
 assert.throws(()=>compareVersionAssets(baseline,baseline.replace('league-hub-v451.js?v=543','league-hub-v451.js?v=542')),/rolled backward|reverted/);
 assert.throws(()=>compareVersionAssets(baseline,baseline.replace('<script src="/value-history-v276.js?v=541" defer></script>','')),/Critical site subsystem/);
 assert.throws(()=>compareVersionAssets(baseline,baseline.replace('trade-value-normalization-v139.js?v=141','trade-value-normalization-v139.js?v=140')),/rolled backward|reverted/);
});

test('duplicate versions of the same script cannot initialize twice',()=>{
 const duplicated=baseline+entry('league-hub-v451.js',999);
 assert.throws(()=>compareVersionAssets(baseline,duplicated),/Duplicate/);
});

test('newspaper, Fleeced Daily, awards and milestone reader contracts stay discoverable',()=>{
 const src={
  toml:read('netlify.toml'),
  site:read('netlify/functions/site-v29.mjs'),
  hub:read('league-hub-v451.js'),
  history:read('value-history-v276.js'),
  news:read('netlify/functions/league-hub.mjs'),
  publisher:read('netlify/functions/lib/inquirer-github-published.mjs')
 };
 assert.doesNotThrow(()=>checkRuntimeContracts(src));
 assert.throws(()=>checkRuntimeContracts({...src,hub:src.hub.replace('league_latest=1','legacy_week=2')}),/independent completed-week/);
 assert.throws(()=>checkRuntimeContracts({...src,news:src.news.replaceAll('githubPublishedInquirerEdition','oldWeek2Reader')}),/Inquirer archive/);
 assert.throws(()=>checkRuntimeContracts({...src,toml:src.toml.replace('site-v29','site-v17')}),/canonical V29/);
 assert.throws(()=>checkRuntimeContracts({...src,history:src.history.replace('tradeHistoryFetch({force:true})','tradeHistoryFetch({force:false})')}),/Trade History stopped/);
 assert.throws(()=>checkRuntimeContracts({...src,history:src.history.replace('scheduleSnapshot(0,snapshotSourceFromUrl())','scheduleSnapshot(0,null)')}),/snapshot stopped/);
 assert.throws(()=>checkRuntimeContracts({...src,history:src.history.replace('fll:canonical-values-ready','legacy-values-only')}),/Player Values stopped/);
});
