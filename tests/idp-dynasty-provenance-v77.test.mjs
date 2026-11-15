import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CONSENSUS_SOURCES} from '../netlify/functions/consensus-adapters.mjs';
import {refreshDraftSharksIdp} from '../netlify/functions/draftsharks-idp-adapter.mjs';
import {refreshRotowireIdp} from '../netlify/functions/rotowire-idp-adapter.mjs';
import {buildConsensusComposite} from '../netlify/functions/consensus-composite-v3.mjs';

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
