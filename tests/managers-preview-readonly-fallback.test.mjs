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
 assert.match(manager,/if\(rosters\.length!==32\|\|!users\.length\|\|weekRows\.some\(rows=>!verifiedManagerMatchupWeek\(rows\)\)\)/);
 assert.match(manager,/Manager history source incomplete; retain previous verified records/);
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

test('Netlify permits the isolated Managers PR preview, not an unsanctioned production build',()=>{
 const toml=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
 assert.match(toml,/e\.CONTEXT==='deploy-preview'/);
 assert.match(toml,/a516be3b-6c65-4f54-a9fb-23c5361bf3d2/);
 assert.match(toml,/'586'\]\.includes\(String\(e\.REVIEW_ID\)\)/);
 assert.match(toml,/e\.CONTEXT==='production'&&e\.BRANCH==='main'/);
 assert.doesNotMatch(toml,/Release FFL Managers/);
});

test('preview Managers cache must match the latest verified Sleeper completed-week cutoff',()=>{
 assert.match(preview,/fetchJson\(\`\$\{API\}\/state\/nfl\`\)/);
 assert.match(preview,/cached\?\.cache_version===MANAGER_CACHE_VERSION/);
 assert.match(preview,/cached\?\.scoring_history\?\.through_season\)===season/);
 assert.match(preview,/cached\?\.scoring_history\?\.through_week\)>=through/);
 assert.match(preview,/if\(!season\)throw Error\('Sleeper week unavailable/);
 assert.match(preview,/managerHistory\(\{persist:false\}\)/);
});

test('browser Managers refreshes on revisits, visibility and focus without replacing verified cache on failure',()=>{
 const ui=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
 const loader=readFileSync(new URL('../netlify/functions/site-v29.mjs',import.meta.url),'utf8');
 assert.match(ui,/const MANAGER_REFRESH_MS=300000/);
 assert.match(ui,/Date\.now\(\)-managerCacheAt<MANAGER_REFRESH_MS/);
 assert.match(ui,/setInterval\(refreshManagersIfVisible,MANAGER_REFRESH_MS\)/);
 assert.match(ui,/window\.addEventListener\('focus',refreshManagersIfVisible\)/);
 assert.match(ui,/document\.addEventListener\('visibilitychange',/);
 assert.match(ui,/\['managers','career'\]\.includes\(currentView\)/);
 assert.match(ui,/managerVersionSignature\(next\)!==previous/);
 assert.match(ui,/await render\(currentView,selectedManagerId\)/);
 assert.match(ui,/return managerCache\|\|\{current:\[\],graveyard:\[\],career:\[\],unavailable:true\}/);
 assert.match(ui,/if\(generation===managerRequestGeneration\)/);
 assert.match(ui,/clearManagerHistoryCache\(\); \/\/ finalized week/);
 assert.match(loader,/league-hub-v451\.js\?v=554/);
});

test('Manager records derive from scored weekly matchups rather than lagging roster standings',()=>{
 const start=source.indexOf('function verifiedManagerMatchupWeek(rows){');
 const end=source.indexOf('async function managerHistory(',start);
 assert.ok(start>=0&&end>start);
 const guard=source.slice(start,end);
 assert.match(guard,/rows\.length!==32/);
 assert.match(guard,/m\?\.points==null/);
 assert.match(guard,/pairs\.size===16/);
 assert.match(guard,/every\(n=>n===2\)/);
 assert.match(manager,/weekRows\.some\(rows=>!verifiedManagerMatchupWeek\(rows\)\)/);
 assert.match(manager,/let rw=0,rl=0;for\(const rows of weekRows\)/);
 assert.doesNotMatch(manager,/let rw=Number\(r\?\.settings\?\.wins\)/);
 assert.match(manager,/career\[uid\]\.wins\+=rw;career\[uid\]\.losses\+=rl/);
});

test('Managers refresh revalidates completed trade activity and invalidates dependent badges only after verified changes',()=>{
 const ui=readFileSync(new URL('../league-hub-v451.js',import.meta.url),'utf8');
 const start=ui.indexOf('async function refreshManagersIfVisible(){');
 const end=ui.indexOf('function installManagerRefresh(){',start);
 assert.ok(start>=0&&end>start);
 const refresh=ui.slice(start,end);
 assert.match(refresh,/fetch\('\/\.netlify\/functions\/value-history\?trades=1',\{cache:'no-store'\}\)/);
 assert.match(refresh,/if\(!Array\.isArray\(fresh\?\.trades\)\)throw Error/);
 assert.match(refresh,/tradesChanged=tradeSignature\(fresh\)!==tradeSignature\(tradeCache\)/);
 assert.match(refresh,/globalThis\.primeTradeHistoryCacheV515\?\.\(tradeCache\)/);
 assert.match(refresh,/if\(!managersChanged&&!tradesChanged&&!spotlightChanged\)return/);
 assert.match(refresh,/const latest=await liveLeagueWeek\(\)/);
 assert.match(refresh,/if\(managersChanged\)\{weeklyAwardsCache=null;spotlightWeeklyCache=null\}/);
 assert.match(refresh,/if\(tradesChanged\)draftCache=null/);
 assert.match(refresh,/catch\(error\)\{console\.warn\('manager-trade-refresh-unavailable'/);
});

test('new matchup-derived Manager records invalidate earlier stale cached standings',()=>{
 assert.match(source,/const MANAGER_CACHE_VERSION=14;/);
 assert.match(preview,/cached\?\.cache_version===MANAGER_CACHE_VERSION/);
 const live=source.slice(source.indexOf("if(u.searchParams.get('league_latest')"));
 assert.match(live,/cached\?\.cache_version===MANAGER_CACHE_VERSION/);
 assert.match(manager,/cache_version=MANAGER_CACHE_VERSION/);
});
