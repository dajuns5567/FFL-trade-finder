const cp=require('child_process');
const expected={
  'trade-value-normalization-v139.js':'a3176707c4812e4747864914bfc68b05294990a0',
  'trade-te-scoring-adjustment-v259.js':'7f087f0339b5d8a3af1c97e8787f4c55d28f59a6',
  'trade-finder-v256-compiled.js':'ee45b20b587d9072f735d2c934edec12eaef2cc6',
  // Test-only integration of V330 Finder with reviewed smooth-threshold V322 runtime; neither is approved for production.
  'trade-runtime-v256-compiled.js':'007227de50a6cb867697ef09f1433730f5996851',
  'trade-evaluator-any-team-v184.js':'c088af9ce9bd24f6142873fae201f1a262c63123',
  'trade-finder-candidate-guard-v223.js':'9373b06e4014f5fc368cf8eb00ed087b261ba1a7',
  'trade-ui-canonical-v136.js':'b9474616d1be29ae2c97ba0838cedd45e2a077b8',
  'trade-presentation-v169.js':'8aac60753e3a5a8494b824b8dfe767d66fa072e7',
  'trade-select-all-v165.js':'eb1e8121ae78a25957642b0c4307c69b1a60605e',
  'trade-blank-cache-v167.js':'2d3d3c77a96bd0fcc65d933c55fc39761fd5434a',
  'trade-partner-fit-v184.js':'f5b6ab91941dd12dc6a49e7c5dbf4921ee6f43a4',
  'trade-style-preferences-v221.js':'567db5906217a46262b92adf2619bb2106a1d532',
  'trade-win-now-preferences-v226.js':'1c74d7ea956c42568f93b08f46fea9ae9fff0b32',
  'trade-selected-positions-only-v262.js':'56e561565f6adf6402cc7e6c28cd090fa3dd8cd6',
  'trade-specific-max-tier-add-v300.js':'66fa68072f507ebc759abea7be5ec394016994d4',
  'trade-specific-tier-up-v282.js':'7459ff61db4b4479635dedc05a66ada53ce0a904',
  'trade-specific-add-assets-v282.js':'f356f8913914ef136a2a0909f17d01e97a4a14a0',
  'trade-specific-max-value-v279.js':'bd570171cabfe83f6ae3da14d9208446e16ecf9f',
  'trade-specific-player-v232.js':'37dd812277f18ee8bedeb404ecb7e94cf6661c1e',
  'pick-display-sync-v279.js':'ac0e5102c969139fade368410209ae44a6b78eff',
  'trade-recommended-pick-ownership-v301.js':'383c4cccc512d8f57692ab81a5e45102179fad02'
};
// Finder-only V106 release candidate: these six module hashes must transition
// together. The entire frozen V311 suite remains the other valid state.
// The reviewed future-year pick discount changes only pick normalization; keep
// the frozen V311 hash valid while explicitly accepting the tested draft-pick
// successor. All other Finder module hashes still require their exact guard.
const reviewedFuturePickDiscountHash='b294f4330106a5c9cdc4cb9d1cf002b90135f250';
const finderCandidateHashes={
  'trade-finder-v256-compiled.js':'f46f80bb17b88d6e93f147dfc2f2a276e140d734',
  'trade-specific-max-tier-add-v300.js':'c72cb456c1bcd58bd2d4654431bb38b2d6952d62',
  'trade-specific-tier-up-v282.js':'f8fef77ce544a2161d5cb959f963b5995acd9adc',
  'trade-specific-add-assets-v282.js':'7329e91955ea6907aca508163515ffc00de0aad9',
  'trade-specific-max-value-v279.js':'aeec180f1c0b34b7b9eb76f3a857a5e6c7360361',
  'trade-specific-player-v232.js':'af2e068cd94dede57019b09b6e6b94eba2a7f515'
};
// Performance-only successor: require the entire six-module group, never mixed versions.
const finderPerformanceHashes={...finderCandidateHashes,
  'trade-finder-v256-compiled.js':'54219bb06ec2968f712e8e9241970189738bcc8c',
  'trade-specific-max-value-v279.js':'4f22407f87466f2afe9d63e27dccfeeee9b11cf4',
  'trade-specific-max-tier-add-v300.js':'8c7425f19835621c99a27c40d03d1c406d7da004'
};
const finderScopedMemoHashes={...finderPerformanceHashes,'trade-specific-max-tier-add-v300.js':'69878bebe45548680384ac9de48264895599e16c'};
const finderCoverageHashes={...finderScopedMemoHashes,'trade-specific-max-value-v279.js':'48d7c0ded702b2b78f45873eacd6ebff0ca079a8'};
const matches=hashes=>Object.entries(hashes).every(([path,sha])=>{
  try{return cp.execFileSync('git',['hash-object',path],{encoding:'utf8'}).trim()===sha}
  catch{return false}
});
const finderCoverage=matches(finderCoverageHashes),finderScopedMemo=matches(finderScopedMemoHashes),finderPerformance=matches(finderPerformanceHashes),finderCandidate=matches(finderCandidateHashes);
let bad=[];
for(const [path,sha] of Object.entries(expected)){
  let actual='';
  try{actual=cp.execFileSync('git',['hash-object',path],{encoding:'utf8'}).trim()}catch(e){bad.push(path+': missing');continue}
  const required=(finderCoverage?finderCoverageHashes[path]:finderScopedMemo?finderScopedMemoHashes[path]:finderPerformance?finderPerformanceHashes[path]:finderCandidate?finderCandidateHashes[path]:null)||sha;
  const reviewedPickChange=path==='trade-value-normalization-v139.js'&&
    actual===reviewedFuturePickDiscountHash;
  if(actual!==required&&!reviewedPickChange)
    bad.push(path+': '+actual+' != expected '+required);
}
if(bad.length){
  console.error('V311 PIPELINE IDENTITY FAILURE');
  for(const x of bad)console.error('- '+x);
  process.exit(1);
}
require('./offense-consensus-coverage-gate-v384-smoke.cjs');
console.log((finderCoverage?'Coverage Finder candidate':finderScopedMemo?'Scoped memo Finder candidate':finderPerformance?'Performance Finder candidate':finderCandidate?'V106 Finder candidate':'Frozen V311')+' pipeline identity verified; unrelated modules and offense coverage remain anchored across '+Object.keys(expected).length+' loaded modules.');
