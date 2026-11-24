import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {injectedScripts,compareVersionAssets,verifyCacheKeysForChangedAssets,checkRuntimeContracts,auditSite} from '../scripts/audit-site-release-contract.mjs';
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

test('changing a loaded critical asset without incrementing its cache key is blocked',()=>{
 const before=baseline,filename='league-hub-v451.js';
 assert.throws(()=>verifyCacheKeysForChangedAssets(before,before,x=>x===filename),/stale cache key/);
 const bumped=before.replace('league-hub-v451.js?v=543','league-hub-v451.js?v=544');
 const changes=verifyCacheKeysForChangedAssets(before,bumped,x=>x===filename);
 assert.equal(changes.length,1);
 assert.equal(changes[0].to,544);
});

test('all individual targeted-player Finder modules are critical, ordered and cache-busted after edits',()=>{
 const targeted=[
  'trade-specific-blank-router-v325.js','trade-specific-max-tier-add-v300.js',
  'trade-specific-tier-up-v282.js','trade-specific-add-assets-v282.js',
  'trade-specific-max-value-v279.js','trade-specific-player-v232.js'
 ];
 const scripts=injectedScripts(baseline);
 for(const filename of targeted){
  const entry=scripts.find(x=>x.pathname==='/'+filename);
  assert.ok(entry,'Missing Finder module in baseline: '+filename);
  assert.throws(()=>verifyCacheKeysForChangedAssets(baseline,baseline,x=>x===filename),/stale cache key/);
  const changed=baseline.replace('/'+filename+'?v='+entry.version,'/'+filename+'?v='+(Number(entry.version)+1));
  assert.equal(verifyCacheKeysForChangedAssets(baseline,changed,x=>x===filename).length,1);
  assert.throws(()=>compareVersionAssets(baseline,baseline.replace('/'+filename+'?v='+entry.version,'/'+filename+'?v='+(Number(entry.version)-1))),/rolled backward|reverted/);
  assert.throws(()=>compareVersionAssets(baseline,baseline.replace(new RegExp('<script src="/'+filename.replaceAll('.','\\.')+'\\?v='+entry.version+'"[^>]*><\\/script>'),'')),/Critical site subsystem/);
 }
 const ordered=['trade-specific-blank-router-v325.js','trade-specific-max-tier-add-v300.js','trade-specific-tier-up-v282.js','trade-specific-add-assets-v282.js','trade-specific-max-value-v279.js','trade-specific-player-v232.js'];
 // Swap complete script tags, preserving each script's individual cache key.
 // Otherwise the cache-version guard triggers before the order check.
 const scriptTag=filename=>{
  const start=baseline.indexOf('<script src="/'+filename+'?v=');
  assert.ok(start>=0,'Missing script tag for '+filename);
  const end=baseline.indexOf('</script>',start);
  assert.ok(end>start,'Unclosed script tag for '+filename);
  return baseline.slice(start,end+'</script>'.length);
 };
 const firstTag=scriptTag(ordered[0]),secondTag=scriptTag(ordered[1]);
 const swapped=baseline.replace(firstTag,'__FINDER_ORDER_SWAP__')
  .replace(secondTag,firstTag).replace('__FINDER_ORDER_SWAP__',secondTag);
 assert.throws(()=>compareVersionAssets(baseline,swapped),/Targeted Finder runtime load order/);
});

test('all loaded scripts, including noncritical home/manager UI, require new cache keys if source bytes change',()=>{
 const extras=['fleeced-home-v424.js','fleeced-presentation-v413.js','fleeced-header-v512.js'];
 const loaded=injectedScripts(baseline);
 for(const filename of extras){
  const entry=loaded.find(x=>x.pathname==='/'+filename);
  assert.ok(entry,'source exists in assembled site: '+filename);
  assert.throws(()=>verifyCacheKeysForChangedAssets(baseline,baseline,x=>x===filename,{critical:extras}),/stale cache key/);
  const bumped=baseline.replace('/'+filename+'?v='+entry.version,'/'+filename+'?v='+(Number(entry.version)+1));
  assert.ok(verifyCacheKeysForChangedAssets(baseline,bumped,x=>x===filename,{critical:extras}).some(x=>x.filename===filename));
 }
});

test('cache guard applies to the player badge runtime and valuation runtime as well',()=>{
 for(const filename of ['value-history-v276.js','trade-value-normalization-v139.js',
  'modeled-player-values-v319.js','trade-finder-v256-compiled.js']){
  assert.throws(()=>verifyCacheKeysForChangedAssets(baseline,baseline,x=>x===filename),/stale cache key/);
 }
 assert.deepEqual(verifyCacheKeysForChangedAssets(baseline,baseline,()=>false),[]);
});
