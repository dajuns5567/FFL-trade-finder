#!/usr/bin/env node
// Draft-only live-league acceptance. Never write Sleeper, Netlify or archive data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {refreshAllSources} from '../netlify/functions/consensus-source-overrides.mjs';
import {buildConsensusPayload} from '../netlify/functions/update.mjs';
import {chromium} from 'playwright';

const preview='https://deploy-preview-488--precious-dango-fb4633.netlify.app';
const origin=new URL(preview).origin;
assert.equal(origin,'https://deploy-preview-488--precious-dango-fb4633.netlify.app','Refusing non-PR-488 origin');
const leagueId='1316867686394769408';
// Diagnostic-only timeout: never leave a read-only acceptance job silently hung.
let lastStage='initializing';
const markStage=label=>{lastStage=label;console.log('[live-preview-audit] '+label+' '+new Date().toISOString())};
const watchdog=setTimeout(()=>{console.error('[live-preview-audit] STALLED at '+lastStage+' after 90s');process.exit(124)},180000);
watchdog.unref();
markStage('fetching Sleeper league and rosters');
const timeout=ms=>AbortSignal.timeout(ms);
async function getJson(url){
  const r=await fetch(url,{signal:timeout(18000),headers:{accept:'application/json'}});
  assert.equal(r.status,200,'Live Sleeper API GET failed: '+url+' '+r.status);
  return r.json();
}
const [league,rosters]=await Promise.all([
  getJson('https://api.sleeper.app/v1/league/'+leagueId),
  getJson('https://api.sleeper.app/v1/league/'+leagueId+'/rosters')
]);
markStage('Sleeper API loaded; validating 32-team roster');
assert.equal(String(league.league_id),leagueId,'Wrong live league ID');
assert.equal(Number(league.total_rosters),32,'Real Sleeper league does not contain 32 teams');
assert.equal(rosters.length,32,'Incomplete real Sleeper rosters');
assert.equal(new Set(rosters.map(x=>Number(x.roster_id))).size,32,'Duplicate Sleeper roster ID');
const realPlayerIds=new Set(rosters.flatMap(x=>x.players||[]).map(String));
assert(realPlayerIds.size>250,'Suspiciously incomplete 32-team player roster snapshot');

// Local-only consensus replacement: never submit a network POST to Netlify.
// The initial test intentionally blocked every POST but then tested an
// incomplete master before all dynasty sources were available.
markStage('building verified seven-source consensus feed locally');
const dictionary=await getJson('https://api.sleeper.app/v1/players/nfl');
const players=Object.entries(dictionary).filter(([,p])=>p?.fantasy_positions?.length)
 .map(([id,p])=>({id,name:[p.first_name,p.last_name].filter(Boolean).join(' ')||p.full_name||id,
  position:p.position||(p.fantasy_positions||[])[0],positions:p.fantasy_positions||[],team:p.team||null}));
const refresh=await refreshAllSources({timeoutMs:15000});
assert.equal(refresh.successful,7,'all seven ranked publishers must refresh');
const payload=buildConsensusPayload(refresh,players);
assert(payload.integrity.all_sources_valid,'dynasty consensus payload integrity');
assert.equal(payload.composite.sourceCounts.idp,2,'exclude seasonal IDP rankings from dynasty consensus');
const consensusResponseBody=JSON.stringify(payload);
markStage('verified consensus loaded; preparing isolated no-write browser');

let browser,blockedWrites=0,blockedMutations=0,failedAssets=[];
const playerDataRequests=[], runtimeErrors=[];
try{
  markStage('launching isolated read-only Chromium');
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',route=>{
    const request=route.request(),url=new URL(request.url());
    if(request.method()==='POST'&&url.origin===origin&&
       (url.pathname==='/api/update'||url.pathname==='/.netlify/functions/update')){
      return route.fulfill({status:200,contentType:'application/json',body:consensusResponseBody});
    }
    if(request.method()!=='GET'&&request.method()!=='HEAD'){
      blockedWrites++;return route.abort('blockedbyclient');
    }
    if(url.hostname==='precious-dango-fb4633.netlify.app'||
       (url.hostname.endsWith('.netlify.app')&&url.origin!==origin)){
      blockedMutations++;return route.abort('blockedbyclient');
    }
    if(url.origin===origin&&(/\/(?:api\/update|\.netlify\/functions\/(?:update|inquirer-publish|inquirer-preview-on-deploy|inquirer-publish-scheduled))/.test(url.pathname))){
      blockedMutations++;return route.abort('blockedbyclient');
    }
    if(url.protocol!=='https:'){blockedMutations++;return route.abort('blockedbyclient')}
    return route.continue();
  });
  // Diagnostic-only early browser instrumentation. It does not change the
  // fetch result or any ranking data, and is limited to the read-only PR preview.
  await context.addInitScript(()=>{
    const originalJson=Response.prototype.json;
    Response.prototype.json=async function(...args){
      const url=this.url||'';
      const inspect=url.includes('api.sleeper.app/v1/players/nfl')||
        url.includes('api.sleeper.app/v1/stats/nfl/')||
        url.includes('api.sleeper.app/v1/league/');
      if(inspect)console.info('[ffl-boot] JSON_BEGIN '+url.slice(0,140));
      const value=await originalJson.apply(this,args);
      if(inspect)console.info('[ffl-boot] JSON_DONE '+url.slice(0,140)+
        ' entries='+String(value&&typeof value==='object'?Object.keys(value).length:'not-object'));
      return value;
    };
    setInterval(()=>{
      const st=window.state||{};
      const ps=st.players||{};
      console.info('[ffl-boot] HEARTBEAT teams='+String(st.teams?.length||0)+
        ' players='+String(Object.keys(ps).length)+
        ' modelReady='+String(window.modeledPlayerValuesV319?.ready||false));
    },8000);
  });
  const page=await context.newPage();
  // Test-only CPU sampling on the renderer: when the page becomes unresponsive,
  // we need an actual stack hotspot, not a guessed valuation root cause.
  try{
    const cdp=await context.newCDPSession(page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval',{interval:1000});
    await cdp.send('Profiler.start');
    const timer=setTimeout(async()=>{
      try{
        const done=await Promise.race([
          cdp.send('Profiler.stop'),
          new Promise((_,reject)=>setTimeout(()=>reject(Error('CDP profiler unresponsive')),9000))
        ]);
        const profile=done?.profile||{},nodes=new Map((profile.nodes||[]).map(n=>[n.id,n]));
        const counts=new Map();
        for(const id of profile.samples||[]){
          const frame=nodes.get(id)?.callFrame||{},label=
            String(frame.functionName||'(anonymous)')+' @ '+
            String(frame.url||'(inline)').slice(-105)+':'+String(frame.lineNumber??'?');
          counts.set(label,(counts.get(label)||0)+1);
        }
        const top=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,25)
          .map(([frame,samples])=>({frame,samples}));
        console.log('[live-preview-audit] CPU_PROFILE '+JSON.stringify({
          sampleCount:profile.samples?.length||0,nodes:profile.nodes?.length||0,top
        }));
      }catch(e){console.error('[live-preview-audit] CPU_PROFILE_ERROR '+String(e?.message||e))}
    },24000);
    timer.unref?.();
  }catch(e){console.error('[live-preview-audit] CPU_PROFILE_SETUP_ERROR '+String(e?.message||e))}

  page.on('console',message=>{
    const t=message.text();
    if(t.startsWith('[ffl-boot]'))console.log('[live-preview-audit] '+t.slice(0,400));
  });
  page.on('response',r=>{
    if(r.status()>=400&&/\.(?:js|css)(?:\?|$)/.test(r.url()))failedAssets.push({status:r.status(),url:r.url()});
    if(/api\.sleeper\.app\/v1\/players\/nfl(?:\?|$)/.test(r.url())){
      const entry={status:r.status(),url:r.url(),time:new Date().toISOString()};
      playerDataRequests.push(entry);
      console.log('[live-preview-audit] Sleeper metadata response '+JSON.stringify(entry));
    }
  });
  page.on('requestfailed',request=>{
    if(/api\.sleeper\.app\/v1\/players\/nfl(?:\?|$)/.test(request.url())){
      const entry={failed:request.failure()?.errorText||'unknown',url:request.url()};
      playerDataRequests.push(entry);
      console.error('[live-preview-audit] Sleeper metadata request failed '+JSON.stringify(entry));
    }
  });
  page.on('pageerror',e=>{
    if(runtimeErrors.length<8){runtimeErrors.push(String(e.message||e));console.error('[live-preview-audit] pageerror '+String(e.message||e).slice(0,700))}
  });
  markStage('opening exact Netlify preview');
  await page.goto(preview,{waitUntil:'domcontentloaded',timeout:35000});
  markStage('waiting for preview teams/assets');
  await page.waitForFunction(()=>{
    const state=window.state;
    return Array.isArray(state?.teams)&&state.teams.length===32&&
      Array.isArray(state?.allAssets)&&state.allAssets.filter(x=>x?.type==='player').length>250;
  },null,{timeout:45000});
  markStage('teams/assets loaded; waiting for player metadata');
  // Teams/assets can populate before the Sleeper player metadata dictionary.
  // A premature lookup reads numeric IDs as names and classifies every player as IDP.
  await page.waitForFunction(()=>{
    const players=window.state?.players||{};
    const rows=(window.state?.allAssets||[]).filter(x=>x?.type==='player');
    return Object.keys(players).length>250&&rows.some(x=>{
      const p=players[String(x.id)];
      return !!(p?.full_name||p?.first_name)&&Array.isArray(p?.fantasy_positions)&&p.fantasy_positions.includes('RB');
    });
  },null,{timeout:35000,polling:1000}).catch(e=>{
    throw Error('Sleeper preview player metadata readiness failed: '+String(e.message||e)+
      ' | Sleeper responses: '+JSON.stringify(playerDataRequests)+
      ' | browser errors: '+JSON.stringify(runtimeErrors));
  });
  // Metadata alone does not certify the active canonical modeled price map.
  // Accept live Finder only once V319 has completed its full roster validation.
  await page.waitForFunction(()=>window.modeledPlayerValuesV319?.ready===true,
    null,{timeout:25000,polling:500});
  markStage('waiting for verified seven-source consensus acceptance');
  await page.waitForFunction(()=>window.__fllConsensusRefresh?.complete===true&&
    window.__fllConsensusRefresh?.ok===true&&window.modeledPlayerValuesV319?.ready===true,
    null,{timeout:100000,polling:600});
  markStage('metadata and V319 canonical model ready; reading roster values');
  const initial=await page.evaluate(()=>{
    const a=window.state.allAssets.filter(x=>x?.type==='player');
    const players=a.map(x=>({id:String(x.id),owner:String(x.owner),
      name:String((typeof playerName==='function'?playerName(x.id):'')||window.playerName?.(x.id)||x.name||''),
      pos:String((typeof groupPos==='function'?groupPos(x):'')||window.groupPos?.(x)||x.position||'').toUpperCase(),
      value:Number(window.tradeValueNormalizationV139?.canonicalValue?.(x)||x.value)||0}));
    const matches=players.filter(x=>/jonathan\s+taylor/i.test(x.name));
    const alternate=players.filter(x=>x.pos==='RB'&&x.owner&&x.name&&x.value>0)
      .sort((x,y)=>y.value-x.value)[0];
    return {teams:window.state.teams.length,players:a.length,matches,
      alternate,taylorNames:players.filter(x=>/taylor/i.test(x.name)).slice(0,8),
      realPlayers:a.map(x=>String(x.id))};
  });
  assert.equal(initial.teams,32);
  const overlap=initial.realPlayers.filter(x=>realPlayerIds.has(x));
  assert(overlap.length>=250,'Preview asset IDs do not match the current real Sleeper league');
  const chosen=initial.matches[0]||initial.alternate;
  assert(chosen?.name&&chosen?.owner,'No usable real Sleeper RB target: '+JSON.stringify(initial.taylorNames));
  const selectedTeam=rosters.map(x=>String(x.roster_id)).find(id=>
    id!==chosen.owner &&
    rosters.find(r=>String(r.roster_id)===id).players?.length>=10
  );
  assert(selectedTeam,'No suitable distinct outgoing 32-team roster');
  markStage('preparing bounded Finder search');
  const prepared=await page.evaluate(({teamId,targetName})=>{
    const team=document.querySelector('#findTeam'),style=document.querySelector('#findMode'),
      tier=document.querySelector('#tradeTier94'),target=document.querySelector('#desiredPlayerSearch'),
      run=document.querySelector('#runFinder'),host=document.querySelector('#finderResults');
    if(!team||!style||!tier||!target||!run||!host||!window.tradeSpecificMaxValueV279?.run)
      return {ready:false,reason:'Finder controls or engine not initialized'};
    if(![...team.options].some(x=>x.value===teamId))
      return {ready:false,reason:'Live selected team absent in dropdown',options:team.options.length};
    team.value=teamId;team.dispatchEvent(new Event('change',{bubbles:true}));
    style.value='value';style.dispatchEvent(new Event('change',{bubbles:true}));
    tier.value='up';tier.dispatchEvent(new Event('change',{bubbles:true}));
    target.value=targetName;target.dispatchEvent(new Event('input',{bubbles:true}));
    for(const box of document.querySelectorAll('#findShop .shopCheck'))box.checked=false;
    const selectAll=window.tradeSelectAllV165;
    if(selectAll?.aliasActive&&typeof selectAll.aliasActive==='function')selectAll.aliasActive();
    window.__liveFinderStarted=Date.now();
    run.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
    return {ready:true};
  },{teamId:selectedTeam,targetName:chosen.name});
  assert(prepared.ready,'Unable to start real-league Finder: '+JSON.stringify(prepared));
  markStage('Finder search initiated; waiting for result');
  await page.waitForFunction(()=>{
    const result=window.tradeSpecificMaxValueV279?.sourceIntegrityStats?.();
    const last=result?.lastSearchStats;
    const text=document.querySelector('#finderResults')?.textContent||'';
    return last&&Date.now()>=window.__liveFinderStarted&&
      !text.includes('Searching maximum-value trades');
  },null,{timeout:20000});
  const result=await page.evaluate(()=>{
    const stats=window.tradeSpecificMaxValueV279?.sourceIntegrityStats?.().lastSearchStats||{};
    const host=document.querySelector('#finderResults');
    return {elapsedMs:Date.now()-window.__liveFinderStarted,
      cards:host?.querySelectorAll('.trade95-card').length||0,
      spinnerCleared:!(host?.textContent||'').includes('Searching maximum-value trades'),
      bounded:stats.fairnessChecks<=2200&&stats.examined<=9000,
      stats};
  });
  assert(result.spinnerCleared,'Actual league Finder stuck searching');
  assert(result.elapsedMs<=20000,'Actual league Finder exceeded acceptance timeout');
  assert(result.bounded,'Actual league Finder exceeded bounded examination budget');
  assert.deepEqual(failedAssets,[],'Preview JS/CSS asset failure');
  assert.deepEqual(runtimeErrors,[],'Browser JavaScript errors during live 32-team valuation/Finder acceptance');

  // Confirm the running site actually serves the integrated IDP and history
  // artifact bytes, not a stale browser cache or an earlier PR revision.
  markStage('verifying deployed IDP and history source bytes');
  const sourceDigests=[];
  for(const file of ['valuation-idp-v25-perf.js','valuation-idp-v36.js','value-history-v276.js']){
    const remote=await fetch(new URL('/'+file,preview),{signal:AbortSignal.timeout(20000)});
    assert.equal(remote.status,200,'Preview source not served: '+file);
    const expected=createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex');
    const received=createHash('sha256').update(Buffer.from(await remote.arrayBuffer())).digest('hex');
    assert.equal(received,expected,'Preview code is not exact GitHub source: '+file);
    sourceDigests.push({file,sha256:received});
  }
  // Operate on REAL rostered assets, not a fabricated roster or model. The
  // master, history, Finder/Evaluator, and canonical display paths must agree.
  markStage('checking full-roster live consumer parity and IDP composition');
  const live=await page.evaluate(()=>{
    const st=window.state||{},master=window.ensureMaster?.()||[];
    const norm=window.tradeValueNormalizationV130||window.tradeValueNormalizationV139;
    const v319=window.modeledPlayerValuesV319;
    const players=(st.allAssets||[]).filter(a=>a?.type==='player');
    const errors=[];
    let idps=0,offense=0;
    for(const a of players){
      const value=Number(norm?.canonicalValue?.(a));
      const derived=Number(v319?.playerValue?.(a));
      const base=Number(window.baseValue?.(a));
      if(!Number.isFinite(value)||value<120||value>9999||value!==derived||value!==base){
        if(errors.length<14)errors.push({id:String(a.id),value,derived,base});
      }
      if(window.groupPos(a)==='IDP')idps++;else offense++;
    }
    let overallIdp=0,turner=null,idpPosition=0;
    const topIdp=[];
    for(let i=0;i<master.length;i++){
      const z=master[i],id=String(z.x?.id||''),name=window.playerName(id)||id;
      if(window.groupPos(z.x)==='IDP'){
        idpPosition++;
        if(i<100){overallIdp++;topIdp.push({name,overall:i+1,idp:idpPosition,modeled:Number(z.value)});}
        if(name==='Dallas Turner')turner={overall:i+1,idp:idpPosition,modeled:Number(z.value)};
      }
    }
    const p=players.filter(a=>window.groupPos(a)==='IDP').slice(0,3);
    const o=players.filter(a=>window.groupPos(a)!=='IDP').slice(0,3);
    const packageChecks=[p,o,[...p.slice(0,2),...o.slice(0,2)]].map(assets=>{
      const expected=assets.reduce((sum,a)=>sum+Number(norm?.canonicalValue?.(a)),0);
      const normalized=Number(norm?.canonicalPackageValue?.(assets));
      const current=Number(window.packageValue?.(assets));
      return{count:assets.length,expected,normalized,current,pass:expected===normalized&&expected===current};
    });
    const history=window.valueHistoryV331;
    const historyRows=typeof history?.currentRows==='function'?history.currentRows():[];
    return{teams:st.teams?.length||0,playerCount:players.length,idps,offense,
      masterCount:master.length,top100IDP:overallIdp,topIdp,turner,errors,
      packageChecks,historyModel:window.valueHistoryModelV90||null,
      historyRows:historyRows.length,
      ui:{finder:!!document.getElementById('finderResults'),
        evaluator:!!document.getElementById('evalResults'),
        history:!!document.getElementById('valueHistory'),
        rankings:!!document.getElementById('rankings')},
      historyPreviewGate:typeof window.isValueHistoryDeployPreview==='function'?window.isValueHistoryDeployPreview():null};
  });
  console.log('PR488_LIVE_PRE_ASSERT '+JSON.stringify({teams:live.teams,playerCount:live.playerCount,idps:live.idps,offense:live.offense,masterCount:live.masterCount,top100IDP:live.top100IDP,turner:live.turner,historyModel:live.historyModel,historyRows:live.historyRows,ui:live.ui,errors:live.errors,packageChecks:live.packageChecks}));
  assert.equal(live.teams,32,'Preview lost league teams');
  assert(live.playerCount>=500&&live.idps>=100&&live.offense>=250,'Live league roster incomplete');
  assert(live.masterCount>=950,'Verified dynasty consensus master rankings incomplete');
  assert(live.top100IDP>=7&&live.top100IDP<=25,'IDP top100 balance outside broad evidence interval');
  assert(live.turner&&live.turner.idp>0&&live.turner.idp<75,'Dallas Turner missing or improperly indexed');
  assert.deepEqual(live.errors,[],'Real canonical roster valuation parity regression');
  assert(live.packageChecks.every(x=>x.pass),'Mixed IDP/offense package parity regression');
  assert.equal(live.historyModel,'idp-v77-v85-v86-dynasty','V90 valuation model tag absent');
  assert(live.historyRows>=950,'Value History does not expose complete canonical priced rows');
  assert(live.ui.finder&&live.ui.evaluator&&live.ui.history&&live.ui.rankings,
    'Finder/Evaluator/History/Rankings UI hosts missing');
  assert.deepEqual(runtimeErrors,[],'Browser JS error during integrated 32-team audit');

  // Actual navigation/render pass; no update buttons or write paths are used.
  markStage('navigating Player Values, Evaluator, History, and Market Dashboard');
  const surfaceChecks=[];
  for(const tab of ['rankings','evaluator','tradeHistory','valueHistory','finder']){
    const selected=await page.evaluate(tab=>{
      const btn=document.querySelector('.tabs button[data-tab="'+tab+'"]')||
        document.querySelector('[data-home-tab="'+tab+'"]');
      if(!btn)return{tab,clicked:false,reason:'navigation control not found'};
      btn.click();
      return{tab,clicked:true};
    },tab);
    await page.waitForTimeout(650);
    const snapshot=await page.evaluate(tab=>{
      const section=document.getElementById(tab),nav=document.querySelector('.tabs button[data-tab="'+tab+'"]');
      return {tab,section:!!section,hidden:section?.hidden??null,
        textLength:(section?.textContent||'').trim().length,
        textSample:(section?.innerText||'').slice(0,175),
        hasNavigation:!!nav,active:nav?.classList.contains('active')||false};
    },tab);
    surfaceChecks.push({...selected,...snapshot});
  }
  const marketNavigation=await page.evaluate(()=>{
    const tab=document.querySelector('[data-home-tab="valueHistory"][data-home-vh="market"]');
    if(!tab)return{clicked:false};
    tab.click();
    const section=document.getElementById('valueHistory');
    return{clicked:true,visible:!!section&&!section.hidden,model:window.valueHistoryModelV90,
      marketHeader:(section?.innerText||'').slice(0,350)};
  });
  await page.waitForTimeout(650);
  assert(surfaceChecks.every(x=>x.clicked&&x.section&&x.hidden===false&&x.textLength>25),
    'Page navigation / visible core tab rendering regression: '+JSON.stringify(surfaceChecks));
  assert(marketNavigation.clicked&&marketNavigation.visible,'Market Dashboard entry cannot open Value History');
  assert(!/Valuation model changed on 9\/22\/2026/i.test(marketNavigation.marketHeader),
    'Legacy September scheduled-capture metadata mislabeled as valuation-model change');
  assert.deepEqual(runtimeErrors,[],'New JavaScript errors after cross-page navigation');
  console.log('PR488_LIVE_PAGE_SURFACE_ACCEPTANCE '+JSON.stringify({surfaceChecks,marketNavigation}));

  console.log('PR488_EXACT_DEPLOY_PREVIEW_ACCEPTANCE '+JSON.stringify({
    preview,leagueId,sourceDigests,blockedWrites,blockedMutations,...live,
    note:'All browser POSTs aborted; production unmodified; audit-only branch'
  }));

  markStage('Finder acceptance assertions passed');
  console.log('LIVE SLEEPER PREVIEW READ-ONLY ACCEPTANCE PASS '+JSON.stringify({
    commit:process.env.GITHUB_SHA||null,preview,leagueId,rosterCount:rosters.length,
    uniqueRosterPlayers:realPlayerIds.size,previewPlayers:initial.players,
    matchingRosterAssets:overlap.length,
    selectedTeam,target:chosen.name,jonathanTaylorResolved:initial.matches.length>0,taylorCandidates:initial.taylorNames,results:result,blockedWrites,blockedMutations}));
  await context.close();
}finally{if(browser)await browser.close()}
