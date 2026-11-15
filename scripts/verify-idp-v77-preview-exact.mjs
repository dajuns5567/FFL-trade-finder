#!/usr/bin/env node
// Read-only check of the deployed PR #466 preview: GET-only and no Blob writes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const origin='https://deploy-preview-466--precious-dango-fb4633.netlify.app';
const paths=['/netlify/functions/consensus-composite-v3.mjs','/netlify/functions/draftsharks-idp-adapter.mjs','/netlify/functions/rotowire-idp-adapter.mjs','/netlify/functions/update.mjs'];
// Netlify's static JS may be served under site-root or function paths; use
// local endpoint contract and exact source checks in Node, then GET only the
// browser-delivered model/adapter assets that are publicly exposed.
const readable=['/valuation-idp-v25-perf.js','/valuation-idp-v43.js'];
const hash=s=>createHash('sha256').update(s).digest('hex');
const local={};
for(const path of readable)local[path]=hash(readFileSync(new URL('..'+path,import.meta.url),'utf8'));
assert(readFileSync(new URL('../netlify/functions/update.mjs',import.meta.url),'utf8').includes('if(!isolatedPreview)await writeLastGood(promoted);'));
let observed=null,error=null;
for(let attempt=1;attempt<=8;attempt++){
 try{
  const results=[];
  for(const path of readable){
   const url=origin+path+'?v77-integrity='+encodeURIComponent(process.env.GITHUB_SHA||'audit')+'&attempt='+attempt;
   const response=await fetch(url,{headers:{accept:'text/javascript','cache-control':'no-cache'},signal:AbortSignal.timeout(12000)});
   assert.equal(response.status,200,'Preview source '+path+' returned '+response.status);
   const remote=hash(await response.text());
   results.push({path,expected:local[path],actual:remote,identical:remote===local[path]});
  }
  observed=results;
  console.log('IDP_V77_PREVIEW_STATIC '+JSON.stringify({attempt,results}));
  if(results.every(x=>x.identical)){
   console.log('IDP_V77_PREVIEW_MODEL_SOURCE_PASS '+JSON.stringify({preview:origin,sourceCount:results.length}));
   process.exit(0);
  }
  error=Error('Preview has not yet served this exact committed JS bundle');
 }catch(e){error=e;console.error('IDP_V77_PREVIEW_READ '+String(e?.message||e))}
 if(attempt<8)await new Promise(r=>setTimeout(r,9000));
}
throw error||Error('Preview source integrity unavailable');
