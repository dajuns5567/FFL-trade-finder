import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const nonblocking=read('nonblocking-consensus-v277.js');
const v319=read('modeled-player-values-v319.js');
const ui=read('ui-player-values-v139.js');

test('the actual scoring/core and consensus refresh cache writes preserve composite',async()=>{
 const writes=[],refreshed=[],events=[],st={
  league:{league_id:'test'},users:[],rosters:[],players:{},
  teams:[],allAssets:[],stats:{},rankings:{},
  consensusComposite:null,trending:{},draftPicks:[],tradedPicks:[]
 };
 const ctx={state:st,console,Date,Math,Number,String,Array,Object,Map,Set,
  masterRankCache:null,valueCache:new Map(),fitCache:new Map(),stageCache:new Map(),
  updateData:async()=>{},loadCore:async()=>{},refreshConsensus:async()=>{
   st.consensusComposite={byId:{'1':1500,'2':1200},detailsById:{'1':{offenseRank:1}}};
   return 7;
  },
  cacheSet:(key,snapshot)=>writes.push({key,snapshot:structuredClone(snapshot)}),
  status:()=>{},buildTeams:()=>{},renderAll:()=>{},
  document:{getElementById:()=>({disabled:false,onclick:null})},
  CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail}}
 };
 ctx.window=ctx;
 ctx.dispatchEvent=e=>events.push(e);
 ctx.modeledPlayerValuesV319={refresh:force=>refreshed.push(force)};
 vm.runInNewContext(nonblocking,ctx);
 await ctx.updateData();
 for(let i=0;i<6;i++)await Promise.resolve();
 assert.equal(writes.length,2);
 assert.equal(writes[0].snapshot.consensusComposite,null,'core-only cache must not invent sources');
 assert.deepEqual(JSON.parse(JSON.stringify(writes[1].snapshot.consensusComposite)),
  {byId:{'1':1500,'2':1200},detailsById:{'1':{offenseRank:1}}});
 assert.equal(ctx.__fllConsensusRefresh.ok,true);
 assert.equal(events[0]?.type,'fll:valuation-refreshed');
 assert.equal(refreshed.length,2);
});

test('Player Values UI cannot display a temporary incomplete fallback ranking',()=>{
 assert.match(ui,/if\(window\.modeledPlayerValuesV319&&!window\.modeledPlayerValuesV319\.ready\)/);
 assert.match(ui,/Incomplete fallback ranks are not displayed/);
 assert.match(v319,/function dynastyConsensusReady\(\)/);
 assert.match(v319,/!rosterMetadataReady\(\)\|\|!dynastyConsensusReady\(\)/);
 assert.match(v319,/awaiting-validated-dynasty-consensus/);
});

test('existing rank-based V319 trade currency is unchanged byte-for-byte',()=>{
 assert.match(v319,/const BAND_ENDS=\[12,24,48,80,120,180,260\]/);
 assert.match(v319,/const BLEND=\.28,MIN_RATIO=\.45,MAX_RATIO=2\.25/);
 assert.match(v319,/const s=start,e=end,startVal=legacyValue\(s,maxRank\),endVal=legacyValue\(e,maxRank\)/);
 assert.doesNotMatch(v319,/modeled-terminal-precision-proportional/);
});
