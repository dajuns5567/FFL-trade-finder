const cp=require('child_process');
const expected={
  'trade-value-normalization-v139.js':'a3176707c4812e4747864914bfc68b05294990a0',
  'trade-te-scoring-adjustment-v259.js':'7f087f0339b5d8a3af1c97e8787f4c55d28f59a6',
  'trade-finder-v256-compiled.js':'3191a669acad93f691deca956906f9189b66426b',
  'trade-runtime-v256-compiled.js':'0c4ab99d8113804333635989fe0b4d617ab6d767',
  'trade-evaluator-any-team-v184.js':'c088af9ce9bd24f6142873fae201f1a262c63123',
  'trade-finder-candidate-guard-v223.js':'9373b06e4014f5fc368cf8eb00ed087b261ba1a7',
  'trade-ui-canonical-v136.js':'b9474616d1be29ae2c97ba0838cedd45e2a077b8',
  'trade-presentation-v169.js':'8aac60753e3a5a8494b824b8dfe767d66fa072e7',
  'trade-select-all-v165.js':'9791e4ae53d583f015aa1b0e2a016590773cf12e',
  'trade-blank-cache-v167.js':'2d3d3c77a96bd0fcc65d933c55fc39761fd5434a',
  'trade-partner-fit-v184.js':'f5b6ab91941dd12dc6a49e7c5dbf4921ee6f43a4',
  'trade-style-preferences-v221.js':'567db5906217a46262b92adf2619bb2106a1d532',
  'trade-win-now-preferences-v226.js':'1c74d7ea956c42568f93b08f46fea9ae9fff0b32',
  'trade-selected-positions-only-v262.js':'56e561565f6adf6402cc7e6c28cd090fa3dd8cd6',
  'trade-specific-max-tier-add-v300.js':'66fa68072f507ebc759abea7be5ec394016994d4',
  'trade-specific-tier-up-v282.js':'7459ff61db4b4479635dedc05a66ada53ce0a904',
  'trade-specific-add-assets-v282.js':'f356f8913914ef136a2a0909f17d01e97a4a14a0',
  'trade-specific-max-value-v279.js':'43716b2e6fdb0c8eecdf1bd72ef6ea2abf25fa39',
  'trade-specific-player-v232.js':'3f7da0a23974d568642a9dec375301daaa69e4ed',
  'pick-display-sync-v279.js':'ac0e5102c969139fade368410209ae44a6b78eff',
  'trade-recommended-pick-ownership-v301.js':'383c4cccc512d8f57692ab81a5e45102179fad02'
};
let bad=[];
for(const [path,sha] of Object.entries(expected)){
  let actual='';
  try{actual=cp.execFileSync('git',['hash-object',path],{encoding:'utf8'}).trim()}catch(e){bad.push(path+': missing');continue}
  if(actual!==sha)bad.push(path+': '+actual+' != frozen V311 '+sha);
}
if(bad.length){
  console.error('V311 PIPELINE IDENTITY FAILURE');
  for(const x of bad)console.error('- '+x);
  process.exit(1);
}
console.log('V330 pipeline identity verified with approved V320 Value Adjustment and scoped specific-player family-diversity changes for '+Object.keys(expected).length+' loaded modules.');
