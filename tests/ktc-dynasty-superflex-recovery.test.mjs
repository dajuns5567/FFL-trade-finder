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
