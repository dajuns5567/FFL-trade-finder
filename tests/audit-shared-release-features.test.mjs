import test from 'node:test';
import assert from 'node:assert/strict';
import {featureCoverage,verifyNoFeatureRollback,features,verifyPendingFeaturePrSources,loadPendingFeaturePrSources,removedMarketCopy} from '../scripts/audit-shared-release-features.mjs';

const all=new Map(features.map(f=>[f.file,'']));
for(const f of features)all.set(f.file,(all.get(f.file)||'')+f.markers.join('\n')+'\n');
const read=map=>filename=>map.get(filename)||'';
test('all approved features are retained once they reach main',()=>{
 const result=verifyNoFeatureRollback(read(all),read(all));
 assert.equal(result.pending.length,0);
 assert.equal(result.retained,features.length);
});
test('a new PR that drops an established Inquirer selector or badge update is blocked',()=>{
 for(const target of ['inquirer-single-picker','milestone-current-week-badges','milestone-finalized-week-gate','milestone-visible-weekly-poll','milestone-no-invented-zero-points','weekly-awards-finite-scored-winners','weekly-awards-autonomous-capture','weekly-awards-idempotent-write','market-canonical-invalidation','league-awards-independent','league-shared-cache-expiry','home-fresh-value-risers','managers-readonly-preview-fallback','managers-visible-freshness','managers-verified-weekly-records','managers-spotlight-independent-completed-week','managers-spotlight-verified-projections']){
  const candidate=new Map(all),f=features.find(x=>x.id===target);
  candidate.set(f.file,candidate.get(f.file).replaceAll(f.markers[0],'old-regressed-behavior'));
  assert.throws(()=>verifyNoFeatureRollback(read(all),read(candidate)),new RegExp(target));
 }
});
test('an older preview reports excluded pending subsystem changes instead of claiming complete coverage',()=>{
 const candidate=new Map(all);
 for(const f of features.filter(f=>[578,579,580,581,583].includes(f.pr)))
  candidate.set(f.file,candidate.get(f.file).replace(f.markers[0],'unreleased:'+f.id));
 const report=featureCoverage(read(candidate));
 for(const pr of [578,579,580,581,583])
  assert(report.some(x=>x.pr===pr&&!x.present));
 assert(report.some(x=>x.pr===584&&x.present));
});
test('one-subsystem-at-a-time releases are allowed, but future regressions are not',()=>{
 const baseline=new Map(all);
 for(const f of features.filter(x=>x.pr!==584))
  baseline.set(f.file,baseline.get(f.file).replace(f.markers[0],'not-yet-released:'+f.id));
 const candidate=new Map(baseline);
 const f=features.find(x=>x.pr===579);
 candidate.set(f.file,candidate.get(f.file).replace('not-yet-released:'+f.id,f.markers[0]));
 assert.doesNotThrow(()=>verifyNoFeatureRollback(read(baseline),read(candidate)));
});

test('restored targeted Finder filtering and complementary assets cannot disappear after acceptance',()=>{
 const candidate=new Map(all);
 for(const feature of features.filter(x=>x.pr===585))
  candidate.set(feature.file,candidate.get(feature.file).replace(feature.markers[0],'old-Finder-path'));
 assert.throws(()=>verifyNoFeatureRollback(read(all),read(candidate)),/finder-targeted-bounded-filter-routing/);
 const report=featureCoverage(read(candidate));
 assert.equal(report.filter(x=>x.pr===585&&!x.present).length,2);
});


test('real pending PR heads retain each authored feature source contract',()=>{
 const report=loadPendingFeaturePrSources();
 assert.equal(report.ok,true,JSON.stringify(report.failures));
 assert.equal(report.inspected.length,features.length);
 assert.match(report.release_status,/unmerged/);
});
test('pending feature check rejects missing refs and outdated weekly awards persistence',()=>{
 const original=(pr,file)=>features.filter(f=>f.pr===pr&&f.file===file).flatMap(f=>f.markers).join('\n');
 const broken=verifyPendingFeaturePrSources((pr,file)=>{
  if(pr===579)throw new Error('missing pending PR branch');
  const source=original(pr,file);
  return pr===580&&file==='netlify/functions/weekly-awards-refresh.mjs'
   ?source.replace('weeklyAwards({persist:true,strictPersist:true})','weeklyAwards({persist:true})')
   :source;
 });
 assert.equal(broken.ok,false);
 assert(broken.failures.some(x=>x.pr===579&&/unreadable/.test(x.reason)));
 assert(broken.failures.some(x=>x.feature==='weekly-awards-autonomous-capture'&&x.missing?.some(m=>m.includes('strictPersist'))));
});


test('removed Market Dashboard helper paragraphs cannot return after approved cleanup',()=>{
 const clean=new Map(all);
 clean.set('value-history-v276.js','canonical market calculations; no meta explanatory copy');
 const reverted=new Map(clean);
 reverted.set('value-history-v276.js',removedMarketCopy.join('\n'));
 assert.throws(()=>verifyNoFeatureRollback(read(clean),read(reverted)),/Removed Market Dashboard explanations reappeared/);
});
test('cleaning previously installed Market Dashboard copy is permitted independently',()=>{
 const old=new Map(all);
 old.set('value-history-v276.js',removedMarketCopy.join('\n'));
 const cleaned=new Map(old);
 cleaned.set('value-history-v276.js','render Market Movers with no helper paragraphs');
 assert.doesNotThrow(()=>verifyNoFeatureRollback(read(old),read(cleaned)));
});
