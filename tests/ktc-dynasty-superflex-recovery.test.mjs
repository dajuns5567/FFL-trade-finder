import test from 'node:test';
import assert from 'node:assert/strict';
import {extractKtcSuperflexRankings,refreshKtc} from '../netlify/functions/ktc-adapter.mjs';

function fixture(count=360){
 return Array.from({length:count},(_,i)=>({
  playerName:'Fixture Player '+(i+1),
  position:['QB','RB','WR','TE'][i%4],
  superflexValues:{rank:i+1,value:9999-i*10},
  oneQBValues:{rank:count-i,value:100+i}
 }));
}
const embed=players=>'<script type="application/json" id="ktc-players">'+JSON.stringify(players)+'</script>';
const next=players=>'<script id="__NEXT_DATA__" type="application/json">'+
 JSON.stringify({props:{pageProps:{data:{players}}}})+'</script>';
const mock=resolve=>async url=>({ok:true,text:async()=>resolve(url)});
const extract=html=>extractKtcSuperflexRankings(html);

test('reads 360 dynasty Superflex ranks from existing ktc-players JSON, never 1QB ranks',()=>{
 const result=extract(embed(fixture()));
 assert.equal(result.rows.length,360);
 assert.equal(result.parserMode,'explicit-rank');
 assert.equal(result.extractionMethod,'embedded-json:ktc-players');
 assert.equal(result.rows[0].rank,1);
 assert.equal(result.rows.at(-1).rank,360);
});
test('reads alternative nested bootstrap JSON with script attribute order variation',()=>{
 const result=extract(next(fixture()));
 assert.equal(result.rows.length,360);
 assert.equal(result.extractionMethod,'embedded-json:__NEXT_DATA__');
});
test('reads inline literal playersArray, including escaped player names',()=>{
 const players=fixture();players[0].playerName='Fixture "Quoted" Player';
 const result=extract('<script>const playersArray = '+JSON.stringify(players)+';</script>');
 assert.equal(result.rows.length,360);
 assert.equal(result.rows[0].player,'Fixture "Quoted" Player');
 assert.equal(result.extractionMethod,'inline-array:playersArray');
});
test('never jumps from playersArray=JSON.parse(...) into an unrelated later array',()=>{
 const fake='<script>var playersArray = JSON.parse(document.getElementById("ktc-players").textContent); const later = [1,2,3];</script>';
 assert.throws(()=>extract(fake),/ranking array was not found/);
 assert.equal(extract(fake+embed(fixture())).rows.length,360);
});
test('draft picks and IDP are never promoted into the offensive rankings',()=>{
 const players=[...fixture(),{playerName:'2027 1.01',position:'RDP',superflexValues:{rank:1,value:9999}},
  {playerName:'Test EDGE',position:'DL',superflexValues:{rank:2,value:9000}}];
 const result=extract(embed(players));
 assert.equal(result.rows.length,360);
 assert.equal(result.excludedDraftPicks,1);
 assert.equal(result.excludedNonOffense,1);
 assert.ok(result.rows.every(row=>['QB','RB','WR','TE'].includes(row.position)));
});
test('source may derive Superflex ranks from genuine Superflex values when rank fields are absent',()=>{
 const players=fixture().map(p=>({...p,superflexValues:{value:p.superflexValues.value}}));
 const result=extract(embed(players));
 assert.equal(result.rows.length,360);
 assert.equal(result.parserMode,'derived-from-superflex-value');
 assert.equal(result.rows[0].rank,1);
});
test('refresh uses explicit Superflex URL first, retaining reduced consensus weighting',async()=>{
 const urls=[];
 const result=await refreshKtc({fetchImpl:mock(url=>{urls.push(url);return next(fixture())})});
 assert.equal(result.valid,true);
 assert.equal(result.status,'refreshed');
 assert.equal(result.format,'dynasty-superflex');
 assert.equal(result.reducedWeight,true);
 assert.match(urls[0],/dynasty-rankings\?format=2/);
 assert.equal(urls.length,1);
});
test('retry original dynasty URL when explicit format returns blocked or invalid HTML',async()=>{
 const urls=[];
 const result=await refreshKtc({fetchImpl:mock(url=>{
  urls.push(url);
  return url.includes('?format=2')?'<html>unavailable</html>':embed(fixture());
 })});
 assert.equal(result.valid,true);
 assert.equal(result.diagnostics.attempts.length,2);
 assert.equal(urls.length,2);
});
test('fail closed when both responses are blocked, incomplete, or fabricated',async()=>{
 for(const html of ['<html>Access denied</html>',embed(fixture(299)),
  '<script>var playersArray=[{"playerName":"Only One","position":"QB","superflexValues":{"rank":1}}]</script>']){
  const result=await refreshKtc({fetchImpl:mock(()=>html)});
  assert.equal(result.valid,false);
  assert.equal(result.status,'failed');
  assert.equal(result.rankings.length,0);
  assert.match(result.error,/previous verified consensus must be retained/i);
  assert.equal(result.diagnostics.attempts.length,2);
 }
});
test('duplicate names and duplicate source ranks cannot pass 300-player validation',async()=>{
 const names=fixture().map(p=>({...p,playerName:'Same Player'}));
 const result=await refreshKtc({fetchImpl:mock(()=>embed(names))});
 assert.equal(result.valid,false);
 assert.equal(result.rankings.length,0);
});

test('KTC November inline oneQBPlayers bootstrap extracts real Superflex ranks while playersArray is empty',async()=>{
 const players=[...fixture(),{playerName:'2027 1.01',position:'RDP',superflexValues:{rank:1,value:9999}}];
 const html='<script>var oneQBPlayers = '+JSON.stringify(players)+'; var playersArray = []; var ktcPoolReady = ktcFetchPlayerPool("dynasty","version");</script>';
 const parsed=extract(html);
 assert.equal(parsed.rows.length,360);
 assert.equal(parsed.extractionMethod,'inline-array:oneQBPlayers');
 assert.equal(parsed.rows[0].player,'Fixture Player 1');
 assert.equal(parsed.rows[0].rank,1);
 assert.equal(parsed.rows.at(-1).rank,360);
 assert.equal(parsed.excludedDraftPicks,1);
 const result=await refreshKtc({fetchImpl:mock(()=>html)});
 assert.equal(result.valid,true);
 assert.equal(result.diagnostics.extraction_method,'inline-array:oneQBPlayers');
});

test('balanced inline KTC JSON handles escaped quotes, backslashes and brackets in strings',()=>{
 const players=fixture();
 players[2].playerName='Fixture "[\\\\] Quoted" Player';
 const html='<script>var oneQBPlayers = '+JSON.stringify(players)+'; var playersArray=[];</script>';
 const parsed=extract(html);
 assert.equal(parsed.rows.length,360);
 assert.equal(parsed.rows[2].rank,3);
 assert.equal(parsed.extractionMethod,'inline-array:oneQBPlayers');
});

test('realistic 3-player server seed requires async pool and cannot replace verified consensus',async()=>{
 const html='<script>var oneQBPlayers = '+JSON.stringify(fixture(3))+
   ';var playersArray=[];var ktcPoolReady=ktcFetchPlayerPool("dynasty","v");</script>';
 const result=await refreshKtc({fetchImpl:mock(()=>html)});
 assert.equal(result.valid,false);
 assert.equal(result.rankings.length,0);
 assert.match(result.error,/full rankings are loaded asynchronously/i);
 assert.equal(result.diagnostics.attempts[0].oneqb_parsed_rows,3);
 assert.equal(result.diagnostics.attempts[0].asynchronous_player_pool,true);
});

test('KTC fetches full asynchronous dynasty player-pool JSON when HTML has three seed players',async()=>{
 const version='2611232340-testversion';
 const html='<script>var oneQBPlayers = '+JSON.stringify(fixture(3))+
   '; var playersVersion = "'+version+'"; var playersArray = []; '+
   'var ktcPoolReady = ktcFetchPlayerPool("dynasty", playersVersion);</script>';
 const urls=[];
 const result=await refreshKtc({fetchImpl:async url=>{
  urls.push(url);
  return {ok:true,text:async()=>url.includes('/player-pool')?JSON.stringify(fixture()):html};
 }});
 assert.equal(result.valid,true);
 assert.equal(result.ranking_rows,360);
 assert.equal(result.diagnostics.extraction_method,'same-origin:dynasty-player-pool');
 assert.ok(urls.some(url=>url.includes('/dynasty-rankings/player-pool')));
 assert.equal(result.rankings[0].player,'Fixture Player 1');
});

test('KTC fetch uses versioned URL without an unverified custom request header',async()=>{
 const version='2611240010-a-realistic-build-token';
 const html='<script>var oneQBPlayers = '+JSON.stringify(fixture(3))+
  ';var playersVersion = "'+version+'";var playersArray=[];'+
  'var ktcPoolReady=ktcFetchPlayerPool("dynasty", playersVersion);</script>';
 const requests=[];
 const result=await refreshKtc({fetchImpl:async (url,options)=>{
  requests.push({url,headers:options?.headers});
  return {ok:true,text:async()=>url.includes('/player-pool')?JSON.stringify(fixture()):html};
 }});
 assert.equal(result.valid,true);
 const pool=requests.find(x=>x.url.includes('/player-pool'));
 assert.ok(pool);
 assert.equal(pool.headers['X-KTC-Players-Version'],undefined);
 const parsedUrl=new URL(pool.url);
 assert.equal(parsedUrl.pathname,'/dynasty-rankings/player-pool');
 assert.equal(parsedUrl.searchParams.get('v'),version);
 assert.equal(parsedUrl.searchParams.get('sr'),'2');
 assert.equal(pool.headers.accept,'application/json');
 assert.equal(result.format,'dynasty-superflex');
 assert.equal(result.reducedWeight,true);
});

test('HTTP 403 player-pool responses fail closed with classified non-sensitive diagnostics',async()=>{
 const html='<script>var oneQBPlayers = '+JSON.stringify(fixture(3))+
  ';var playersVersion="test-v-123";var playersArray=[];var ktcPoolReady=ktcFetchPlayerPool("dynasty",playersVersion);</script>';
 const result=await refreshKtc({fetchImpl:async url=>url.includes('/player-pool')
  ? {ok:false,status:403,headers:{get:key=>({
       "content-type":"text/html; charset=utf-8",
       "cf-mitigated":"challenge",
       "server":"cloudflare"}[key]||null)}}
  : {ok:true,text:async()=>html}});
 assert.equal(result.valid,false);
 assert.equal(result.rankings.length,0);
 assert.match(result.error,/HTTP_RESPONSE/);
 assert.match(result.error,/cf_mitigated/);
 assert.match(result.error,/previous verified consensus must be retained/i);
});

test('HTTP 403 policy diagnosis classifies only known response codes without leaking body',async()=>{
 const html='<script>var oneQBPlayers = '+JSON.stringify(fixture(3))+
  ';var playersVersion="fixture-1234";var playersArray=[];'+
  'ktcFetchPlayerPool("dynasty",playersVersion);</script>';
 const result=await refreshKtc({fetchImpl:async url=>url.includes('/player-pool')
  ? {ok:false,status:403,headers:{get:()=> 'text/plain'},text:async()=> 'ROBOTS_DENIED do not expose raw provider response'}
  : {ok:true,text:async()=>html}});
 assert.equal(result.valid,false);
 assert.match(result.error,/robots-denied/);
 assert.doesNotMatch(result.error,/do not expose raw provider response/);
});

import {reuseVerifiedKtc} from '../netlify/functions/consensus-ktc-lkg.mjs';
function recentKtcFixture(overrides={}){
 const now='2026-11-24T00:00:00.000Z';
 const failedKtc={id:'ktc',source:'KTC',valid:false,rankings:[],status:'failed',error:'HTTP 403',timestamp:now};
 const fresh=Array.from({length:6},(_,i)=>({id:'source'+i,source:'Source '+i,valid:true,rankings:[]}));
 const previous={sources:{KTC:{kind:'offense',reducedWeight:true,
  updated:'2026-11-23T00:00:00.000Z',
  data:Object.fromEntries(fixture().map(p=>[p.playerName.toLowerCase(),p.superflexValues.rank]))}},
  sourceManifest:[{source:'KTC',status:'fresh',snapshot_timestamp:'2026-11-23T00:00:00.000Z'}]};
 return {refresh:{results:[...fresh,failedKtc]},previous,now,...overrides};
}
test('recent verified KTC cache can complete six-source refresh without claiming live KTC success',()=>{
 const f=recentKtcFixture(),result=reuseVerifiedKtc(f.refresh,f.previous,f.now);
 assert.ok(result);
 assert.equal(result.refresh.results.length,7);
 assert.equal(result.refresh.results[6].valid,true);
 assert.equal(result.refresh.results[6].status,'last-known-good');
 assert.equal(result.refresh.results[6].reducedWeight,true);
 assert.equal(result.refresh.results[6].rankings.length,360);
 assert.equal(result.failedAttempt.error,'HTTP 403');
 assert.equal(result.snapshotTimestamp,'2026-11-23T00:00:00.000Z');
});
test('KTC cache never replaces a fresh KTC result or other failed consensus',()=>{
 const f=recentKtcFixture();
 assert.equal(reuseVerifiedKtc({...f.refresh,results:f.refresh.results.map(x=>({...x,valid:true}))},f.previous,f.now),null);
 const broken={results:f.refresh.results.map((x,i)=>i===0?{...x,valid:false}:x)};
 assert.equal(reuseVerifiedKtc(broken,f.previous,f.now),null);
});
test('KTC stale, unverified, malformed or reordered old snapshots cannot be recovered',()=>{
 const f=recentKtcFixture();
 const changed=(props)=>({...f.previous,sources:{KTC:{...f.previous.sources.KTC,...props}}});
 assert.equal(reuseVerifiedKtc(f.refresh,changed({updated:'2026-11-01T00:00:00.000Z'}),f.now),null);
 assert.equal(reuseVerifiedKtc(f.refresh,changed({reducedWeight:false}),f.now),null);
 assert.equal(reuseVerifiedKtc(f.refresh,changed({data:{'single player':1}}),f.now),null);
 const names=Object.keys(f.previous.sources.KTC.data),sameRank={...f.previous.sources.KTC.data,[names[0]]:2};
 assert.equal(reuseVerifiedKtc(f.refresh,changed({data:sameRank}),f.now),null);
 assert.equal(reuseVerifiedKtc(f.refresh,{...f.previous,sourceManifest:[]},f.now),null);
});

test('consensus update pipeline wires verified KTC fallback without relaxing all-source gate',async()=>{
 const {readFileSync}=await import('node:fs');
 const {spawnSync}=await import('node:child_process');
 const source=readFileSync(new URL('../netlify/functions/update.mjs',import.meta.url),'utf8');
 assert.match(source,/reuseVerifiedKtc\(refresh,previous\)/);
 assert.match(source,/buildConsensusPayload\(recovered\?\.refresh\|\|refresh,players\)/);
 assert.match(source,/integrityReady=results\.length>=7&&failedSources\.length===0/);
 assert.match(source,/reused_ktc_snapshot:!!recovered/);
 assert.match(source,/snapshot\.freshness=recovered&&name==="KTC"/);
 assert.match(source,/old\?\.freshness\|\|null/);
 assert.match(source,/last-known-good/);
 const check=spawnSync(process.execPath,['--check','netlify/functions/update.mjs'],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
});
