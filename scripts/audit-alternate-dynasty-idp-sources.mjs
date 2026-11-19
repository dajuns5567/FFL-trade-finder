#!/usr/bin/env node
// Read-only eligibility diagnostic, never feed unvalidated alternatives into
// production dynasty composite and never call the Netlify Update POST.
import {CONSENSUS_SOURCES,refreshSource} from '../netlify/functions/consensus-adapters.mjs';
const desired=['pff-idp','dynasty-dealer-idp'];
const candidates=desired.map(id=>CONSENSUS_SOURCES.find(x=>x.id===id));
if(candidates.some(x=>!x))throw new Error('Configured dynasty IDP source candidate missing');
const results=await Promise.all(candidates.map(x=>refreshSource(x,{timeoutMs:12000})));
for(let i=0;i<candidates.length;i++){
 const c=candidates[i],r=results[i];
 console.log('IDP_ALTERNATE_DYNASTY_SOURCE '+JSON.stringify({
  source:c.name,id:c.id,configuredFormat:c.format,configuredUrls:c.urls,
  valid:r.valid,stage:r.stage,extracted:r.rankings?.length||0,
  error:r.error||null,
  top10:r.rankings?.slice(0,10).map(x=>({player:x.player,rank:x.rank,position:x.position}))||[]
 }));
}
console.log('IDP_ALTERNATE_DYNASTY_SOURCE_DIAGNOSTIC_DONE');
