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

import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

test('KTC outage does not pass the strict current seven-source consensus gate',()=>{
 const update=readFileSync(new URL('../netlify/functions/update.mjs',import.meta.url),'utf8');
 assert.match(update,/integrityReady=results.length>=7&&failedSources.length===0/);
 assert.match(update,/const candidate=buildConsensusPayload\(refresh,players\)/);
 assert.doesNotMatch(update,/reuseVerifiedKtc|reused_ktc_snapshot/);
 const check=spawnSync(process.execPath,['--check','netlify/functions/update.mjs'],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
});

test('KTC refresh failures are unmistakable on the homepage and diagnostics screen',()=>{
 const ui=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(ui,/KTC NOT UPDATING/);
 assert.match(ui,/KTC IS NOT UPDATING/);
 assert.match(ui,/Last verified snapshot/);
 assert.match(ui,/last successful date and failure/i);
 assert.match(ui,/state.ktcNotUpdating/);
});

test('a rejected versioned player-pool request records the attempted feed without exposing sensitive payloads',async()=>{
 const version='2611240010-public-version';
 const html='<script>var oneQBPlayers = '+JSON.stringify(fixture(3))+
  ';var playersVersion="'+version+'";var playersArray=[];ktcFetchPlayerPool("dynasty",playersVersion);</script>';
 const requests=[];
 const result=await refreshKtc({fetchImpl:async (url,options)=>{
  requests.push({url,options});
  return String(url).includes('/player-pool')
   ? {ok:false,status:403,headers:{get:name=>name==='content-type'?'text/plain':null},text:async()=> 'Forbidden'}
   : {ok:true,text:async()=>html};
 }});
 assert.equal(result.valid,false);
 assert.equal(result.rankings.length,0);
 assert.equal(result.diagnostics.attempts.length,2);
 for(const item of result.diagnostics.attempts){
  assert.equal(item.pool_requested,true);
  assert.equal(item.pool_endpoint,'/dynasty-rankings/player-pool');
  assert.deepEqual(item.pool_query_keys,['v','sr']);
  assert.equal(item.pool_version_present,true);
  assert.match(item.error,/403/);
 }
 const poolRequests=requests.filter(x=>String(x.url).includes('/player-pool'));
 assert.equal(poolRequests.length,2);
 assert.ok(poolRequests.every(x=>new URL(x.url).searchParams.get('v')===version));
 assert.ok(poolRequests.every(x=>new URL(x.url).searchParams.get('sr')==='2'));
});

import {parseKtcRenderedPage,validateKtcRenderedPages,deriveKtcSuperflexRanksFromPublishedValues,mergeKtcPublishedOverallRanks,describeKtcPublishedOverallConflicts} from '../netlify/functions/ktc-html-pages.mjs';
function ktcHtmlPage(start,count=50){
 const rows=Array.from({length:count},(_,i)=>{
  const rank=start+i,position=['QB','RB','WR','TE'][i%4];
  return '<div class="onePlayer"><div class="single-ranking-wrapper"><div class="single-ranking">'+
   '<div class="rank-number"><p>'+rank+'</p></div>'+
   '<div class="player-name"><p><a href="/player/'+rank+'">Fixture Player '+rank+'</a><span class="player-team">NYG</span></p></div>'+
   '<div class="position-team"><p class="position">'+position+rank+'</p></div>'+
   '<div class="value"><p>'+(9999-rank)+'</p></div></div></div></div>';
 });
 return '<html><div class="" id="rankings-page-rankings">'+rows.join('')+'</div></html>';
}
test('parse 50 actual-shape KTC ranking HTML rows, not sidebar or 1QB arrays',()=>{
 const html=ktcHtmlPage(1);
 const rows=parseKtcRenderedPage(html);
 assert.equal(rows.length,50);
 assert.deepEqual(rows[0],{rank:1,player:'Fixture Player 1',position:'QB',value:9998});
 assert.equal(rows[49].rank,50);
 assert.equal(parseKtcRenderedPage('<div class="topFiveName">Fixture Player 1</div>').length,0);
});
test('validated page HTML rejects duplicated or missing ranking pages',()=>{
 const pages=Array.from({length:6},(_,i)=>ktcHtmlPage(i*50+1));
 assert.equal(validateKtcRenderedPages(pages)?.length,300);
 assert.equal(validateKtcRenderedPages([pages[0],pages[0],...pages.slice(2)]),null);
 assert.equal(validateKtcRenderedPages(pages.slice(0,5)),null);
});

function ktcPositionPage(position,page){
 const offset=page===1?1:91;
 const positions=['QB','RB','WR','TE'];
 const idx=positions.indexOf(position);
 const rows=Array.from({length:50},(_,i)=>{
  const num=offset+i,value=9950-(idx*100+page*50+i);
  return '<div class="onePlayer"><div class="single-ranking-wrapper"><div class="single-ranking">'+
    '<div class="rank-number"><p>'+num+'</p></div>'+
    '<div class="player-name"><p><a href="/player/'+position+num+'">'+position+' Fixture '+num+'</a></p></div>'+
    '<div class="position-team"><p class="position">'+position+num+'</p></div>'+
    '<div class="value"><p>'+value+'</p></div></div></div></div>';
 });
 return '<html><div class="" id="rankings-page-rankings">'+rows.join('')+'</div></html>';
}
test('derive combined Superflex ranks from 400 sourced, position-filtered KTC values',()=>{
 const html=['QB','RB','WR','TE'].flatMap(pos=>[1,2].map(page=>ktcPositionPage(pos,page)));
 const rows=deriveKtcSuperflexRanksFromPublishedValues(html);
 assert.equal(rows.length,400);
 assert.equal(rows[0].rank,1);
 assert.ok(rows.every(row=>['QB','RB','WR','TE'].includes(row.position)));
 assert.equal(deriveKtcSuperflexRanksFromPublishedValues(html.slice(0,5)),null);
});

function overlappingKtcHtml(start){
 const rows=Array.from({length:50},(_,i)=>{
  const rank=start+i;
  if(rank>500)return "";
  const position=['QB','RB','WR','TE'][(rank-1)%4];
  return '<div class="onePlayer"><div class="single-ranking-wrapper"><div class="single-ranking">'+
   '<div class="rank-number"><p>'+rank+'</p></div>'+
   '<div class="player-name"><p><a href="/player/'+rank+'">Published Fixture '+rank+'</a><span class="player-team">NYG</span></p></div>'+
   '<div class="position-team"><p class="position">'+position+rank+'</p></div>'+
   '<div class="value"><p>'+(9999-rank)+'</p></div></div></div></div>';
 });
 return '<html><div class="" id="rankings-page-rankings">'+rows.join('')+'</div></html>';
}
test('merge KTC public overlapping page slices without inventing ranks or double-counting',()=>{
 const pages=[overlappingKtcHtml(1),...Array.from({length:7},(_,i)=>overlappingKtcHtml(48+i*43))];
 const merged=mergeKtcPublishedOverallRanks(pages);
 assert.ok(merged);
 assert.ok(merged.length>=300);
 assert.equal(merged[0].rank,1);
 assert.ok(merged.every((r,i)=>i===0||r.rank>merged[i-1].rank));
 assert.equal(mergeKtcPublishedOverallRanks(pages.slice(0,4)),null);
 assert.equal(mergeKtcPublishedOverallRanks([...pages,overlappingKtcHtml(2).replace('9997','1234')]),null);
});
test('live-format KTC pagination validates 300+ unique published Superflex ranks',async()=>{
 const requested=[];
 const result=await refreshKtc({fetchImpl:async url=>{
  requested.push(url);
  const u=new URL(url),raw=u.searchParams.get('page');
  const page=raw===null?0:Number(raw);
  const html=page===0?overlappingKtcHtml(1):overlappingKtcHtml(48+(page-1)*43);
  return {ok:true,text:async()=>html};
 }});
 assert.equal(result.valid,true);
 assert.ok(result.players_extracted>=300);
 assert.equal(result.diagnostics.extraction_method,'server-rendered:paginated-superflex-overall');
 assert.equal(result.format,'dynasty-superflex');
 assert.equal(result.reducedWeight,true);
 assert.ok(requested.every(url=>!url.includes('/player-pool')));
 assert.ok(requested.some(url=>new URL(url).searchParams.get('page')==='7'));
 assert.ok(requested.filter(url=>new URL(url).searchParams.has('page')).every(url=>new URL(url).searchParams.get('format')==='2'));
});

test('diagnoses conflicting publisher rank and player rows without relaxing validation',()=>{
 const pages=[overlappingKtcHtml(1),...Array.from({length:7},(_,i)=>overlappingKtcHtml(48+i*43))];
 assert.equal(describeKtcPublishedOverallConflicts(pages).conflict_count,0);
 const conflicting=[...pages,overlappingKtcHtml(2).replace('9997','1234')];
 const report=describeKtcPublishedOverallConflicts(conflicting);
 assert.equal(mergeKtcPublishedOverallRanks(conflicting),null);
 assert.ok(report.conflict_count>0);
 assert.ok(report.conflicts.some(x=>x.kind==='rank-conflict'&&x.earlier.rank===2&&x.current.value===1234));
 assert.ok(report.conflicts.length<=12);
 assert.equal(describeKtcPublishedOverallConflicts(pages.slice(0,2)).below_minimum,true);
});

test('one inconsistent adjacent publisher batch is replaced by a complete freshly retrieved batch',async()=>{
 const calls=new Map();
 const result=await refreshKtc({pause:async()=>{},fetchImpl:async url=>{
  const u=new URL(url),page=Number(u.searchParams.get('page')||0);
  const n=(calls.get(page)||0)+1;calls.set(page,n);
  let html=page===0?overlappingKtcHtml(1):overlappingKtcHtml(48+(page-1)*43);
  if(page===5&&n===1)html=html.replace('Published Fixture 270</a>','Published Fixture 269</a>');
  return {ok:true,text:async()=>html};
 }});
 assert.equal(result.valid,true);
 assert.equal(result.diagnostics.attempts[0].rendered_html_conflict_retry,true);
 assert.ok(result.diagnostics.attempts[0].rendered_html_initial_rejection.conflict_count>0);
 assert.equal(calls.get(0),2);
 assert.equal(calls.get(5),2);
 assert.equal(result.rankings.find(r=>r.rank===270).player,'Published Fixture 270');
 assert.equal(new Set(result.rankings.map(r=>r.player)).size,result.ranking_rows);
});
test('persistent adjacent page conflict still fails closed after one bounded batch replacement',async()=>{
 let reads=0;
 const result=await refreshKtc({pause:async()=>{},fetchImpl:async url=>{
  const u=new URL(url),page=Number(u.searchParams.get('page')||0);
  if(page===5)reads++;
  let html=page===0?overlappingKtcHtml(1):overlappingKtcHtml(48+(page-1)*43);
  if(page===5)html=html.replace('Published Fixture 270</a>','Published Fixture 269</a>');
  return {ok:true,text:async()=>html};
 }});
 assert.equal(result.valid,false);
 assert.equal(result.rankings.length,0);
 assert.equal(reads,2);
 assert.equal(result.diagnostics.attempts[0].rendered_html_conflict_retry,true);
 assert.ok(result.diagnostics.attempts[0].rendered_html_rejection.conflict_count>0);
});
