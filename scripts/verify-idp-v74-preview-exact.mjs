#!/usr/bin/env node
// Read-only deployment integrity gate: verify the actual PR 466 Netlify
// Deploy Preview serves the EXACT tested IDP source from this Git checkout.
// Never sends a POST, never rewrites values, and never touches production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const origin='https://deploy-preview-466--precious-dango-fb4633.netlify.app';
const path='/valuation-idp-v43.js';
const local=fs.readFileSync(new URL('../valuation-idp-v43.js',import.meta.url),'utf8');
const sha=s=>createHash('sha256').update(s).digest('hex');
assert.match(local,/function verifiedCareerRetentionV74\(/);
assert.match(local,/finalFactor=Math\.max\(servedFactor,Math\.min\(careerRetention\.floor,servedFactor\*1\.17\)\)/);

let remote=null,lastError=null;
for(let attempt=1;attempt<=6;attempt++){
 try{
  const url=origin+path+'?source-integrity='+encodeURIComponent(process.env.GITHUB_SHA||'v74')+'&attempt='+attempt;
  const response=await fetch(url,{headers:{accept:'text/javascript','cache-control':'no-cache'},signal:AbortSignal.timeout(12000)});
  assert.equal(response.status,200,'Preview returned HTTP '+response.status);
  remote=await response.text();
  const localHash=sha(local),remoteHash=sha(remote);
  console.log('IDP_V74_PREVIEW_SOURCE '+JSON.stringify({attempt,localSha256:localHash,servedSha256:remoteHash,identical:localHash===remoteHash}));
  if(localHash===remoteHash){
   console.log('IDP_V74_PREVIEW_EXACT_SOURCE_PASS '+JSON.stringify({path,sha256:localHash,commit:process.env.GITHUB_SHA||null,preview:origin}));
   process.exit(0);
  }
  lastError=Error('Netlify preview is not yet serving tested V74 source; expected '+localHash+', received '+remoteHash);
 }catch(e){lastError=e;console.error('IDP_V74_PREVIEW_READ_ERROR '+String(e?.message||e))}
 if(attempt<6)await new Promise(resolve=>setTimeout(resolve,10000));
}
throw lastError||Error('V74 preview source verification unavailable');
