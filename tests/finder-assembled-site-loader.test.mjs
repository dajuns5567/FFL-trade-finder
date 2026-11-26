import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import siteV29 from '../netlify/functions/site-v29.mjs';

const read=filename=>readFileSync(new URL('../'+filename,import.meta.url),'utf8');
const selected=[
 ['trade-specific-blank-router-v325.js',439],
 ['trade-add-assets-complement-v1.js',2],
 ['trade-specific-max-tier-add-v300.js',302],
 ['trade-specific-tier-up-v282.js',283],
 ['trade-specific-add-assets-v282.js',310],
 ['trade-specific-max-value-v279.js',444],
 ['trade-specific-player-v232.js',441],
 ['trade-finder-v256-compiled.js',450]
];
async function rendered(){
 const response=await siteV29();
 assert.equal(response.status,200,'site loader must assemble successfully');
 assert.match(response.headers.get('content-type')||'',/text\/html/);
 assert.equal(response.headers.get('cache-control'),'no-store');
 return response.text();
}
function scripts(html){
 return [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)]
  .map(match=>match[1]);
}

test('real assembled V29 page contains restored Finder dependencies exactly once and in order',async()=>{
 const html=await rendered(),urls=scripts(html),paths=urls.map(x=>x.split('?')[0]);
 const positions=[];
 for(const [filename,version] of selected){
  const pathname='/'+filename,found=urls.filter(x=>x.split('?')[0]===pathname);
  assert.equal(found.length,1,'missing or duplicate assembled Finder module: '+filename);
  assert.equal(new URLSearchParams(found[0].split('?')[1]||'').get('v'),String(version),
   'older Finder source would remain cached: '+filename);
  positions.push(paths.indexOf(pathname));
  assert.ok(read(filename).length>100,'required Finder module must exist on disk: '+filename);
 }
 assert.ok(positions.every((v,i)=>i===0||v>positions[i-1]),
  'Finder helper/engines must load after router and before compiled Finder');
 assert.equal(new Set(paths).size,paths.length,'duplicate JS imports may overwrite restored Finder logic');
 assert.ok(html.includes('id="findShop"'),'Trade Finder controls must be in rendered page');
 assert.match(read('trade-specific-player-v232.js'),/desiredPlayerSearch/,
  'specific-player acquisition control must be read by its installed runtime');
});

test('restored Finder preview retains canonical player-value, evaluator, market and League Hub readers',async()=>{
 const html=await rendered(),urls=scripts(html);
 for(const filename of [
  'trade-value-normalization-v139.js','modeled-player-values-v319.js',
  'trade-runtime-v256-compiled.js','trade-evaluator-any-team-v184.js',
  'value-history-v276.js','league-hub-v451.js'
 ]){
  assert.equal(urls.filter(x=>x.startsWith('/'+filename+'?')).length,1,
   'unrelated existing reader was dropped or duplicated: '+filename);
 }
 const before=(needle)=>html.indexOf('/'+needle+'?');
 assert.ok(before('modeled-player-values-v319.js')<before('trade-finder-v256-compiled.js'));
 assert.ok(before('trade-value-normalization-v139.js')<before('trade-finder-v256-compiled.js'));
 assert.ok(before('trade-finder-v256-compiled.js')<before('trade-runtime-v256-compiled.js'));
 assert.match(html,/id="updateBtn"/);
});
