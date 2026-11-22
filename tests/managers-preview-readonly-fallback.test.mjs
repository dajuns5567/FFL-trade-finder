import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../netlify/functions/league-hub.mjs',import.meta.url),'utf8');
const preview=source.slice(source.indexOf('if(isReadOnlyEditorialPreview('),source.indexOf("if(u.searchParams.get('league_latest')"));
const manager=source.slice(source.indexOf('async function managerHistory('),source.indexOf('async function awardHighs('));

test('read-only preview Managers uses complete cache, or verifies 32-team Sleeper reconstruction',()=>{
 assert.ok(preview.length>0);
 assert.match(preview,/if\(u\.searchParams\.get\('managers'\)==='1'\)/);
 assert.match(preview,/cached\?\.career\?\.length&&cached\?\.current\?\.length===32/);
 assert.match(preview,/managerHistory\(\{persist:false\}\)/);
 assert.match(preview,/fresh\?\.current\?\.length!==32\|\|!fresh\?\.career\?\.length/);
 assert.match(preview,/cache_hit:false,preview_read_only:true/);
});

test('manager preview remains read-only and refuses fabricated or partial weekly source',()=>{
 assert.match(preview,/if\(req\.method!=='GET'\)return json\(\{error:'Deploy Previews are read-only/);
 assert.doesNotMatch(preview,/setJSON\(/);
 assert.match(manager,/const s=persist\?store\(\):null/);
 assert.match(manager,/if\(!persist&&\(rosters\.length!==32\|\|!users\.length\|\|weekRows\.some\(rows=>rows\.length!==32\)\)\)throw Error/);
 assert.match(manager,/if\(persist\)await Promise\.all\(\[s\.setJSON/);
 assert.match(preview,/Verified manager history unavailable in preview; production backfill disabled/);
 assert.match(preview,/preview_read_only:true\},503/);
});

test('non-preview Managers freshness and cache behavior are not changed',()=>{
 const live=source.slice(source.indexOf("if(u.searchParams.get('league_latest')"),source.length);
 assert.match(live,/if\(u\.searchParams\.get\('managers'\)==='1'\)/);
 assert.match(live,/cached\?\.cache_version===MANAGER_CACHE_VERSION/);
 assert.match(live,/return json\(await managerHistory\(\)\)/);
});
