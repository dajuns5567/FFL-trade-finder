import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const v36=readFileSync(new URL('../valuation-idp-v36.js',import.meta.url),'utf8');
const v43=readFileSync(new URL('../valuation-idp-v43.js',import.meta.url),'utf8');

function model({age=23,position='DE',consensus=310,evidence=.4,downstream=false}={}){
 let baseline=540;
 const id='verified-young-defender';
 const statEvidence={idpEvidenceV53:evidence,idpPpgPercentileV53:88,idpSpikePercentileV53:80,
  idpTacklePercentileV53:65,idpImpactIndexV53:85,a:{qualifyingSeasons:3},
  m:{confidence:.875}};
 const players={[id]:{age,position,fantasy_positions:[position]}};
 const state={players,consensusComposite:{
  byId:{[id]:consensus},detailsById:{[id]:{idpSources:['DraftSharks IDP','The IDP Show Combined IDP'],
   idpValue:consensus}}}};
 const sandbox={Math,Number,Date,Array,Map,Set,state,
  window:{state},masterRankings:()=>[{x:{type:'player',id},value:baseline,
   consensus,context:774,production:statEvidence}],
  groupPos:()=>position==='WR'?'WR':'IDP',
  masterRankCache:null,valueCache:new Map(),fitCache:new Map(),stageCache:new Map()};
 vm.runInNewContext(v36,sandbox);
 if(downstream)vm.runInNewContext(v43,sandbox);
 return value=>{baseline=value;return sandbox.masterRankings()[0]};
}

test('V65 bonus remains continuous and nondecreasing across old 550-point cliff',()=>{
 const val=model();
 let previous=-Infinity;
 for(let raw=400;raw<=720;raw++){
  const out=val(raw).value;
  assert(out>=previous,'valuation fell when incoming value increased to '+raw+': '+out+' < '+previous);
  previous=out;
 }
 assert(val(555).value>=val(544).value);
 assert(val(550).production.idpYoungProjectionFactorV65>1);
 assert(val(699).production.idpYoungProjectionBaselineTaperV85>0);
 assert.equal(val(700).value,700);
});

test('green V65 cohort is preserved below old boundary; extension tapers smoothly by 700',()=>{
 const val=model();
 for(const raw of [300,400,500,544,549,550]){
  const z=val(raw);
  assert.equal(z.value,Math.round(raw*1.14));
  assert.equal(z.production.idpYoungProjectionBaselineTaperV85,1);
 }
 for(const raw of [551,575,600,625,650,675,699]){
  const z=val(raw);
  assert(z.value>=raw);
  assert(z.value<=Math.round(raw*1.14));
  assert(z.production.idpYoungProjectionBaselineTaperV85>=0);
 }
});

test('V72/V74 downstream IDP curve remains nondecreasing across V65 transition',()=>{
 const val=model({downstream:true});
 let previous=-Infinity;
 for(let raw=470;raw<=720;raw++){
  const z=val(raw);
  assert(z.value>=previous,'V72/V74 downstream reversal at base '+raw+': '+z.value+' < '+previous);
  previous=z.value;
 }
 assert(val(555).value>=val(544).value);
});

test('offense, veteran, insufficient consensus, and high-evidence exclusion remains unchanged',()=>{
 for(const opts of [{position:'WR'},{age:26},{consensus:100},{evidence:.95},{position:'CB'}]){
  const val=model(opts);
  for(const raw of [490,549,550,560,650,700])assert.equal(val(raw).value,raw);
 }
});

test('development bonus cannot exceed original 14% and no player-specific override exists',()=>{
 const val=model();
 for(let raw=150;raw<=1000;raw+=5){
  const z=val(raw);
  assert(z.value<=Math.round(raw*1.14)+1);
  assert(z.value>=raw);
 }
 assert.match(v36,/idpYoungProjectionBaselineTaperV85/);
 assert.doesNotMatch(v36,/baseline>=550/);
 assert.match(v36,/baseline>=700/);
 assert.match(v36,/appliedBonus=bonus\*taper/);
});
