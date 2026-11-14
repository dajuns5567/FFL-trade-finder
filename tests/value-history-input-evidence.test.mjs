import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareSnapshotProvenance,scheduledArchiveDecision} from '../scripts/value-history-systemic-drift.mjs';

const collector=readFileSync(new URL('../scripts/value-history-headless-refresh.mjs',import.meta.url),'utf8');
const archive=readFileSync(new URL('../scripts/archive-value-history.mjs',import.meta.url),'utf8');

test('scheduled history records source provenance without changing valuation contract',()=>{
 assert.match(collector,/githubCommit:process\.env\.GITHUB_SHA\|\|null/);
 assert.match(collector,/scoringGeneratedAt:sleeper\.generatedAt\|\|null/);
 assert.match(collector,/scoringCompletedWeek:Number\(sleeper\.completedWeek\)/);
 assert.match(collector,/rankingDigest:digest\(entry\?\.data\)/);
 assert.match(collector,/inputEvidence:\{\.\.\.captured\.inputEvidence/);
 assert.match(collector,/version:5,league,t,fingerprint:fp,source:'scheduled'/);
 assert.match(collector,/canonicalParity:'exact'/);
});
test('snapshot collector verifies stable input identity across the final read pair',()=>{
 assert.match(collector,/JSON\.stringify\(first\.inputEvidence\)===JSON\.stringify\(second\.inputEvidence\)/);
 assert.match(collector,/sameRows\(first\.rows,second\.rows\)/);
});
test('archive preserves original snapshot rows and optional evidence unchanged',()=>{
 assert.match(archive,/JSON\.stringify\(snap,null,2\)/);
 assert.doesNotMatch(archive,/snap\.rows\s*=\s*snap\.rows\.map/);
 assert.doesNotMatch(archive,/Math\.min\(.*snap\.rows/);
});

test('provenance comparison identifies changed consensus source without blocking large prices',()=>{
 const a={t:'2026-11-12T12:49:32Z',rows:Array.from({length:800},(_,i)=>({id:String(i),pos:i%2?'IDP':'QB',value:1000})),inputEvidence:{
  githubCommit:'abc',scoringGeneratedAt:'2026-11-12T00:00:00Z',scoringCompletedWeek:9,scoringMode:'in-season',
  consensusSources:[{source:'A',rankingDigest:'old',rankedPlayers:400},{source:'B',rankingDigest:'constant',rankedPlayers:200}]
 }};
 const b={...a,t:'2026-11-12T17:45:38Z',rows:a.rows.map(x=>({...x,value:1550})),
  inputEvidence:{...a.inputEvidence,consensusSources:[
   {source:'A',rankingDigest:'new',rankedPlayers:400},
   {source:'B',rankingDigest:'constant',rankedPlayers:200}]}};
 assert.deepEqual(compareSnapshotProvenance(a,b),{
   available:true,codeChanged:false,scoringChanged:false,consensusChanged:true,changedSources:['A']
 });
 assert.equal(scheduledArchiveDecision(a,b).action,'archive');
});
test('provenance records changed model and Sleeper independently of market magnitude',()=>{
 const a={inputEvidence:{githubCommit:'commit1',scoringGeneratedAt:'1',scoringCompletedWeek:9,scoringMode:'in-season',consensusSources:[]}};
 const b={inputEvidence:{githubCommit:'commit2',scoringGeneratedAt:'2',scoringCompletedWeek:9,scoringMode:'in-season',consensusSources:[]}};
 const diff=compareSnapshotProvenance(a,b);
 assert.equal(diff.codeChanged,true);
 assert.equal(diff.scoringChanged,true);
 assert.equal(diff.consensusChanged,false);
});
test('old archive points have unknown provenance, not an assumed unchanged baseline',()=>{
 const d=compareSnapshotProvenance({rows:[]},{rows:[]});
 assert.equal(d.available,false);
 assert.equal(d.consensusChanged,null);
 assert.equal(d.codeChanged,null);
});
