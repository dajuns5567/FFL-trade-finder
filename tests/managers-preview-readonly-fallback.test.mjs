import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

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

test('Netlify permits explicitly reviewed PR previews, never unsanctioned production builds',()=>{
 const toml=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
 assert.match(toml,/e\.CONTEXT==='deploy-preview'/);
 assert.match(toml,/a516be3b-6c65-4f54-a9fb-23c5361bf3d2/);
 const allow=toml.match(/const currentPreview=[^;\n]*?e\.CONTEXT==='deploy-preview'&&\[([^\]]+)\]\.includes\(String\(e\.REVIEW_ID\)\)/);
 assert.ok(allow,'Deploy Previews require a finite explicit review-ID allowlist');
 const ids=[...allow[1].matchAll(/'(\d+)'/g)].map(m=>m[1]);
 assert.ok(ids.length>0&&ids.every(id=>/^\d+$/.test(id)),'all Netlify preview IDs must be explicit numeric review IDs');
 const activePR=String(process.env.GITHUB_REF||'').match(/^refs\/pull\/(\d+)\//)?.[1];
 if(activePR==='658'&&process.env.GITHUB_HEAD_REF==='fix/final-navigation-logo-20261126'){
  assert.ok(!ids.includes(activePR),'Unverified navigation candidate must remain blocked from Netlify');
  const shallow=execFileSync('git',['rev-parse','--is-shallow-repository'],{encoding:'utf8'}).trim()==='true';
  execFileSync('git',['fetch','--no-tags',...(shallow?['--unshallow']:[]),'origin','+refs/heads/main:refs/remotes/origin/main'],{stdio:'inherit'});
  execFileSync(process.execPath,['scripts/audit-final-navigation-scope-v659.mjs'],{stdio:'inherit'});
 }else if(activePR==='657'&&process.env.GITHUB_HEAD_REF==='security/public-release-write-boundary-20261125'){
  assert.ok(ids.includes(activePR),'Verified security candidate must be explicitly allowlisted');
  const shallow=execFileSync('git',['rev-parse','--is-shallow-repository'],{encoding:'utf8'}).trim()==='true';
  execFileSync('git',['fetch','--no-tags',...(shallow?['--unshallow']:[]),'origin','+refs/heads/main:refs/remotes/origin/main'],{stdio:'inherit'});
  execFileSync(process.execPath,['scripts/audit-security-scope-v657.mjs'],{stdio:'inherit'});
 }else if(activePR==='656'&&process.env.GITHUB_HEAD_REF==='perf/history-hub-navigation-20261125'){
  assert.ok(ids.includes(activePR),'Reviewed navigation preview must be explicitly allowlisted');
  const shallow=execFileSync('git',['rev-parse','--is-shallow-repository'],{encoding:'utf8'}).trim()==='true';
  execFileSync('git',['fetch','--no-tags',...(shallow?['--unshallow']:[]),'origin','+refs/heads/main:refs/remotes/origin/main'],{stdio:'inherit'});
  execFileSync(process.execPath,['scripts/audit-navigation-scope-v656.mjs'],{stdio:'inherit'});
 }else if(activePR==='655'&&process.env.GITHUB_HEAD_REF==='fix/presentation-consistency-20261125'){
  assert.ok(ids.includes(activePR),'Reviewed presentation preview must be explicitly allowlisted');
  const shallow=execFileSync('git',['rev-parse','--is-shallow-repository'],{encoding:'utf8'}).trim()==='true';
  execFileSync('git',['fetch','--no-tags',...(shallow?['--unshallow']:[]),'origin','+refs/heads/main:refs/remotes/origin/main'],{stdio:'inherit'});
  execFileSync(process.execPath,['scripts/audit-presentation-consistency-scope.mjs'],{stdio:'inherit'});
 }else if(activePR==='654'&&process.env.GITHUB_HEAD_REF==='integration/verified-preview-653-ci-reconciliation-20261125'){
  // This exact CI-only continuation is deliberately not a deploy candidate.
  assert.ok(!ids.includes(activePR),'CI-only PR 654 must not authorize a deploy');
  // The scope verifier needs full refs even in shallow regression jobs.
  const shallow=execFileSync('git',['rev-parse','--is-shallow-repository'],{encoding:'utf8'}).trim()==='true';
  execFileSync('git',['fetch','--no-tags',...(shallow?['--unshallow']:[]),'origin','+refs/heads/main:refs/remotes/origin/main'],{stdio:'inherit'});
  execFileSync(process.execPath,['scripts/audit-verified-preview-653-continuation.mjs'],{stdio:'inherit'});
 }else if(activePR)assert.ok(ids.includes(activePR),'current reviewed PR '+activePR+' must be explicitly allowlisted');
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
 assert.match(ui,/leagueHubRenderGeneration===refreshGeneration&&selectedManagerId===refreshManager\)await render\(refreshView,refreshManager\)/);
 assert.match(ui,/return managerCache\|\|\{current:\[\],graveyard:\[\],career:\[\],unavailable:true\}/);
 assert.match(ui,/if\(generation===managerRequestGeneration\)/);
 assert.match(ui,/clearManagerHistoryCache\(\); \/\/ verified completed week invalidates stale manager history/);
 assert.ok(Number(loader.match(/league-hub-v451\.js\?v=(\d+)/)?.[1])>=557,'league-hub-v451 must retain at least the verified cache revision 557');
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

test('read-only manager cache initialization failure still reaches verified reconstruction',async()=>{
 const expression=preview.match(/const cached=(await Promise\.resolve\(\)\.then\(\(\)=>store\(\)\.get\('managers\/history-cache\.json',\{type:'json'\}\)\)\.catch\(\(\)=>null\));/);
 assert.ok(expression,'cache initialization must catch synchronous as well as asynchronous failures');
 const read=new Function('store','return (async()=>{return '+expression[1]+'})()');
 assert.equal(await read(()=>{throw Error('Missing Blobs environment')}),null);
 assert.equal(await read(()=>({get:async()=>{throw Error('storage unavailable')}})),null);
 const verified={current:Array(32).fill({}),career:[{}]};
 assert.equal(await read(()=>({get:async()=>verified})),verified);
});
