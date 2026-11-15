#!/usr/bin/env node
// Draft-only live-league acceptance. Never write Sleeper, Netlify or archive data.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const preview=process.env.FFL_PREVIEW_URL||'https://deploy-preview-466--precious-dango-fb4633.netlify.app';
const origin=new URL(preview).origin;
assert(/^https:\/\/(?:deploy-preview-466|[a-z0-9]+)--precious-dango-fb4633\.netlify\.app$/.test(origin),
  'Refusing a non-PR-466 Netlify origin');
const leagueId='1316867686394769408';
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
assert.equal(String(league.league_id),leagueId,'Wrong live league ID');
assert.equal(Number(league.total_rosters),32,'Real Sleeper league does not contain 32 teams');
assert.equal(rosters.length,32,'Incomplete real Sleeper rosters');
assert.equal(new Set(rosters.map(x=>Number(x.roster_id))).size,32,'Duplicate Sleeper roster ID');
const realPlayerIds=new Set(rosters.flatMap(x=>x.players||[]).map(String));
assert(realPlayerIds.size>250,'Suspiciously incomplete 32-team player roster snapshot');

let browser,blockedWrites=0,blockedMutations=0,failedAssets=[];
try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',route=>{
    const request=route.request(),url=new URL(request.url());
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
  const page=await context.newPage();
  page.on('response',r=>{
    if(r.status()>=400&&/\.(?:js|css)(?:\?|$)/.test(r.url()))failedAssets.push({status:r.status(),url:r.url()});
  });
  await page.goto(preview,{waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForFunction(()=>{
    const state=window.state;
    return Array.isArray(state?.teams)&&state.teams.length===32&&
      Array.isArray(state?.allAssets)&&state.allAssets.filter(x=>x?.type==='player').length>250;
  },null,{timeout:45000});
  // Teams/assets can populate before the Sleeper player metadata dictionary.
  // A premature lookup reads numeric IDs as names and classifies every player as IDP.
  await page.waitForFunction(()=>{
    const players=window.state?.players||{};
    const rows=(window.state?.allAssets||[]).filter(x=>x?.type==='player');
    return Object.keys(players).length>250&&rows.some(x=>{
      const p=players[String(x.id)];
      return !!(p?.full_name||p?.first_name)&&Array.isArray(p?.fantasy_positions)&&p.fantasy_positions.includes('RB');
    });
  },null,{timeout:45000});
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
  console.log('LIVE SLEEPER PREVIEW READ-ONLY ACCEPTANCE PASS '+JSON.stringify({
    commit:process.env.GITHUB_SHA||null,preview,leagueId,rosterCount:rosters.length,
    uniqueRosterPlayers:realPlayerIds.size,previewPlayers:initial.players,
    matchingRosterAssets:overlap.length,
    selectedTeam,target:chosen.name,jonathanTaylorResolved:initial.matches.length>0,taylorCandidates:initial.taylorNames,results:result,blockedWrites,blockedMutations}));
  await context.close();
}finally{if(browser)await browser.close()}
