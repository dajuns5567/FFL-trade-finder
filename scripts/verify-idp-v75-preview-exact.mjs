#!/usr/bin/env node
// Read-only exact-bundle gate for isolated IDP V75 preview; no POST requests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const origin='https://deploy-preview-466--precious-dango-fb4633.netlify.app';
const path='/valuation-idp-v25-perf.js';
const local=fs.readFileSync(new URL('../valuation-idp-v25-perf.js',import.meta.url),'utf8');
const hash=s=>createHash('sha256').update(s).digest('hex');
assert(local.includes("weightBasis:'games-matured-season-with-1.5ppg-history-anchor-guard'"));
assert(local.includes('const effectiveScoringValue=unverifiedFallback?Math.min(score.value,180):score.value'));
let last=null;
for(let i=1;i<=6;i++){
 try{
  const u=origin+path+'?expected='+encodeURIComponent(process.env.GITHUB_SHA||'v75')+'&attempt='+i;
  const response=await fetch(u,{headers:{accept:'text/javascript','cache-control':'no-cache'},signal:AbortSignal.timeout(10000)});
  assert.equal(response.status,200);
  const observed=hash(await response.text()),expected=hash(local);
  console.log('IDP_V75_PREVIEW_SOURCE '+JSON.stringify({attempt:i,expected,observed,equal:observed===expected}));
  if(observed===expected){console.log('IDP_V75_PREVIEW_EXACT_SOURCE_PASS '+JSON.stringify({preview:origin,path,sha256:expected}));process.exit(0)}
  last=Error('Preview has different V75 source; not accepted');
 }catch(e){last=e;console.error('IDP_V75_PREVIEW_READ_ERROR '+String(e.message||e))}
 if(i<6)await new Promise(r=>setTimeout(r,10000));
}
throw last||Error('Preview failed source integrity');
