import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CONSENSUS_SOURCES} from '../netlify/functions/consensus-adapters.mjs';
import {refreshDraftSharksIdp} from '../netlify/functions/draftsharks-idp-adapter.mjs';
import {refreshRotowireIdp} from '../netlify/functions/rotowire-idp-adapter.mjs';
import {buildConsensusComposite} from '../netlify/functions/consensus-composite-v3.mjs';
import {buildConsensusPayload,verifiedDynastyLkg} from '../netlify/functions/update.mjs';

const draft=fs.readFileSync(new URL('../netlify/functions/draftsharks-idp-adapter.mjs',import.meta.url),'utf8');
const rotowire=fs.readFileSync(new URL('../netlify/functions/rotowire-idp-adapter.mjs',import.meta.url),'utf8');
const configured=CONSENSUS_SOURCES.find(x=>x.id==='draftsharks-idp');
test('active DraftSharks IDP adapter uses EXACT configured dynasty path and no general-season source',()=>{
 assert.equal(configured.urls[0],'https://www.draftsharks.com/dynasty-rankings/idp');
 assert(draft.includes('const URL="'+configured.urls[0]+'"'));
 assert(!draft.includes('www.draftsharks.com/rankings/idp/superflex'));
 assert(!draft.includes('researchDepth=rankings'));
 assert(draft.includes('dynastyVerified:true'));
});
test('mocked complete 250-rank dynasty IDP publisher response is accepted with explicit source evidence',async()=>{
 const page=Array.from({length:250},(_,i)=>
  '<tbody data-player-row><tr><td>'+String(i+1)+'</td><td>'+
  '<player-name first-name="Defender" last-name="'+String(i+1)+'"></player-name></td>'+
  '</tr></tbody>').join('');
 const visited=[];
 const result=await refreshDraftSharksIdp({fetchImpl:async url=>{
  visited.push(String(url));
  return{ok:true,text:async()=>page};
 }});
 assert.equal(result.valid,true,result.error);
 assert.equal(result.rankings.length,250);
 assert.equal(result.dynastyVerified,true);
 assert(visited.every(url=>url.startsWith('https://www.draftsharks.com/dynasty-rankings/')));
 const c=buildConsensusComposite([result],[{id:'x',name:'Defender 1',positions:['LB']}]);
 assert.equal(c.sourceCounts.idp,1);
 assert.ok(c.byId.x>0);
});
test('valid RotoWire cheat sheet parse remains ineligible for dynasty value even if rank validation passes',async()=>{
 const rows=Array.from({length:100},(_,i)=>
  '<tr><td>'+String(i+1)+'</td><td>Defender '+String(i+1)+
  '</td><td>BUF</td><td>LB</td></tr>').join('');
 const html='<table class="rankings-ssr-rich"><tbody>'+rows+'</tbody></table>';
 const result=await refreshRotowireIdp({fetchImpl:async()=>({ok:true,text:async()=>html})});
 assert.equal(result.valid,true,result.error);
 assert.equal(result.dynastyVerified,false);
 assert.equal(result.dynastySourceUrl,null);
 assert.equal(result.rankings.length,100);
 const c=buildConsensusComposite([result],[{id:'x',name:'Defender 1',positions:['LB']}]);
 assert.equal(c.sourceCounts.idp,0,'a valid cheat sheet is not automatically a dynasty source');
 assert.equal(c.byId.x,undefined);
});
test('no general-season IDP URLs can enter the verified dynasty adapter source map',()=>{
 assert.match(rotowire,/dynastyVerified:false/);
 assert.match(rotowire,/cheatsheet-idp[.]php/);
 assert.match(draft,/dynastyVerified:true/);
});

test('seven successful source parsers do not imply every source is dynasty eligible',()=>{
 const players=[{id:'d',name:'Elite Defender',positions:['LB']}];
 const eligible={id:'draftsharks-idp',source:'DraftSharks IDP',valid:true,dynastyVerified:true,
  dynastySourceUrl:'https://www.draftsharks.com/dynasty-rankings/idp',rankings:[{rank:1,player:'Elite Defender',position:'IDP'}]};
 const excluded={id:'rotowire-idp',source:'RotoWire IDP',valid:true,dynastyVerified:false,
  dynastySourceUrl:null,rankings:[{rank:1,player:'Elite Defender',position:'IDP'}]};
 const first=buildConsensusPayload({results:[eligible,excluded]},players);
 assert.equal(first.summary.results.length,2);
 assert.equal(first.summary.results.find(x=>x.source==='DraftSharks IDP').dynastyConsensusEligible,true);
 assert.equal(first.summary.results.find(x=>x.source==='RotoWire IDP').dynastyConsensusEligible,false);
 assert.equal(first.summary.results.find(x=>x.source==='RotoWire IDP').dynastySourceUrl,null);
 assert.equal(first.sources['RotoWire IDP'],undefined,'unverified cheat sheet must not be cached as dynasty');
 assert.equal(first.sources['DraftSharks IDP'],undefined,'incomplete source set should not create a dynasty snapshot');
 const complete=buildConsensusPayload({results:[eligible,excluded,...Array.from({length:5},(_,i)=>({
  source:'Verified Offense '+i,id:'off-'+i,valid:true,
  rankings:[{rank:1,player:'Elite Offender',position:'QB'}]
 }))]},players);
 assert.equal(complete.integrity.all_sources_valid,true);
 assert.equal(complete.sources['RotoWire IDP'],undefined,'redraft-like rows cannot appear in promoted source data');
 assert.ok(complete.sources['DraftSharks IDP'],'verified dynasty source remains available for diagnostics');
 assert.equal(first.summary.results.find(x=>x.source==='DraftSharks IDP').dynastySourceUrl,eligible.dynastySourceUrl);
});

test('reject legacy last-known-good market snapshots with absent provenance markers',()=>{
 const old={sources:{
  'The IDP Show Combined IDP':{kind:'idp',data:{'elite defender':1}},
  'DraftSharks IDP':{kind:'idp',data:{'elite defender':2}},
  'RotoWire IDP':{kind:'idp',data:{'elite defender':3}}
 },composite:{byId:{d:150}},sourceManifest:[
  {source:'The IDP Show Combined',status:'fresh'},
  {source:'DraftSharks IDP',status:'fresh'},
  {source:'RotoWire IDP',status:'fresh'}
 ]};
 assert.equal(verifiedDynastyLkg(old),false);
 assert.equal(verifiedDynastyLkg({...old,sourceManifest:undefined}),false);
});
test('accept a complete provenance-marked dynasty last-known-good and reject any contaminated cached source',()=>{
 const safe={
  sources:{
   'The IDP Show Combined IDP':{kind:'idp',data:{'elite defender':1}},
   'DraftSharks IDP':{kind:'idp',data:{'elite defender':2}},
   'FantasyPros':{kind:'offense',data:{'elite quarterback':1}}
  },
  sourceManifest:[
   {source:'The IDP Show Combined',dynasty_consensus_eligible:true},
   {source:'DraftSharks IDP',dynasty_consensus_eligible:true,
    dynasty_source_url:'https://www.draftsharks.com/dynasty-rankings/idp'},
   {source:'RotoWire IDP',dynasty_consensus_eligible:false}
  ]
 };
 assert.equal(verifiedDynastyLkg(safe),true);
 assert.equal(verifiedDynastyLkg({...safe,sources:{...safe.sources,'RotoWire IDP':{kind:'idp'}}}),false);
 assert.equal(verifiedDynastyLkg({...safe,sourceManifest:safe.sourceManifest.filter(x=>x.source!=='DraftSharks IDP')}),false);
 assert.equal(verifiedDynastyLkg({...safe,sourceManifest:safe.sourceManifest.map(x=>x.source==='DraftSharks IDP'?{...x,dynasty_source_url:'https://www.draftsharks.com/rankings/idp/superflex'}:x)}),false);
});
