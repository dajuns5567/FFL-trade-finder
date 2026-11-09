import pickRankingHandler from '../netlify/functions/pick-order-v527.mjs';
import {completedRosterStandings} from '../netlify/functions/pick-order-v527.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {rank5050,standingsFromCompletedMatchups,postCutoverTrade,getPickOrder5050} from '../netlify/functions/lib/pick-order-5050.mjs';

const recordRows=()=>Array.from({length:32},(_,i)=>({id:i+1,wins:i<16?i%10:9,losses:9-(i<16?i%10:9),ties:0,pf:(i+1)*100}));
function matchupWeek(){
  return Array.from({length:32},(_,i)=>({roster_id:i+1,matchup_id:Math.floor(i/2)+1,points:100+i*2}));
}
test('best record and most PF rank #1 in their own categories; weakest combined gets 1.01',()=>{
  const ranks=rank5050(recordRows());
  const high=ranks.find(t=>t.id===32),low=ranks.find(t=>t.id===1);
  assert.equal(high.recordRank,1,'undefeated team is record #1');
  assert.equal(high.pointsRank,1,'highest PF team is PF #1');
  assert.equal(high.projectedSlot,32,'strongest team picks last');
  assert.equal(low.projectedSlot,1,'weakest 50/50 combination picks 1.01');
  assert.deepEqual(ranks.map(t=>t.projectedSlot),Array.from({length:32},(_,i)=>i+1));
});
test('tied undefeated teams both receive record rank #1',()=>{
  const rows=recordRows();rows[0].wins=9;rows[0].losses=0;
  const ranks=rank5050(rows);
  assert.equal(ranks.find(x=>x.id===1).recordRank,1);
  assert.equal(ranks.find(x=>x.id===32).recordRank,1);
});
test('only fully observed 32-team matchup weeks advance the draft order',()=>{
  const week1=matchupWeek(),week2=matchupWeek().map(x=>({...x,points:x.points+10}));
  const result=standingsFromCompletedMatchups({1:week1,2:week2},2);
  assert.equal(result.length,32);
  const first=result.find(x=>x.id===1);
  assert.equal(first.games,2);
  assert.equal(first.pf,100+110);
  assert.equal(first.losses,2);
  assert.throws(()=>standingsFromCompletedMatchups({1:week1,2:week2.slice(1)},2),/missing complete/);
  assert.throws(()=>standingsFromCompletedMatchups({1:week1},2),/missing complete/);
  assert.throws(()=>rank5050(recordRows().slice(1)),/32 teams/);
});
test('trade-time ranking begins after 2026-09-24 ET, earlier history is immutable',()=>{
  assert.equal(postCutoverTrade({created:'2026-09-25T03:59:59.000Z'}),false);
  assert.equal(postCutoverTrade({created:'2026-09-25T04:00:00.000Z'}),true);
});
test('matchup fetches share bounded cache and never invent missing games',async()=>{
  let calls=0;
  const fetchImpl=async url=>{calls++;return{ok:true,json:async()=>matchupWeek()}};
  const a=await getPickOrder5050('1316867686394769408',2,{fetchImpl});
  const b=await getPickOrder5050('1316867686394769408',2,{fetchImpl});
  assert.equal(a.length,32);assert.equal(b.length,32);assert.equal(calls,2);
});
test('client projected order changes while dynasty pick values remain byte-for-byte stable',async()=>{
  const src=readFileSync(new URL('../draft-pick-rankings-v527.js',import.meta.url),'utf8');
  const pick={type:'pick',id:'pick-2027-1-1',season:2027,round:1,original_owner:1,owner:2};
  const legacy=x=>({projectedSlot:16,value:5835,source:'original valuation source'});
  let renderCount=0;
  const data={status:'current',source:'sleeper-live-rosters',league_id:'1316867686394769408',season:2026,standings_season:2026,completed_week:9,
    teams:Array.from({length:32},(_,i)=>({roster_id:i+1,wins:9,losses:0,ties:0,points_for:500+i*10,record_rank:1,points_rank:32-i,combined_rank:32-i,projected_slot:i+1}))};
  data.teams[0].projected_slot=1;
  const normalization={pickContext:x=>({...legacy(x),value:7000}),canonicalValue:x=>7000,sourceValue:x=>5835};
  const storage=new Map();
  const doc={readyState:'complete',hidden:false,getElementById:()=>({id:'pickRankingHealthV527'}),createElement:()=>({}),
    addEventListener:()=>{}};
  const win={draftPickProjection90:legacy,draftPickProjection92:legacy,tradeValueNormalizationV139:normalization,
    state:{league:{league_id:data.league_id,season:2026}},renderAll:()=>{renderCount++},
    addEventListener:()=>{}};
  const ctx={window:win,document:doc,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    fetch:async()=>({ok:true,json:async()=>data}),setInterval:()=>0,console,Date,Number,String,JSON,Math,Promise,
    encodeURIComponent};
  vm.runInNewContext(src,ctx,{filename:'draft-pick-rankings-v527.js'});
  // Before any verified standings arrive, MIDA's old projected slot must
  // never leak through, although the original valuation must remain exact.
  assert.equal(win.draftPickProjection90(pick).projectedSlot,null);
  assert.equal(win.draftPickProjection92(pick).projectedSlot,null);
  assert.equal(normalization.pickContext(pick).projectedSlot,null);
  assert.equal(win.draftPickProjection90(pick).value,5835);
  assert.equal(normalization.pickContext(pick).value,7000);
  await win.draftPickRankingsV527.refresh(true);
  assert.equal(win.draftPickProjection90(pick).projectedSlot,1);
  assert.equal(win.draftPickProjection92(pick).projectedSlot,1);
  assert.equal(normalization.pickContext(pick).projectedSlot,1);
  assert.equal(win.draftPickProjection90(pick).value,5835);
  assert.equal(win.draftPickProjection92(pick).value,5835);
  assert.equal(normalization.pickContext(pick).value,7000);
  assert.equal(normalization.canonicalValue(pick),7000);
  assert.equal(renderCount,1);
  // A same-week Sleeper PF correction is a new ranking revision, even
  // when the resulting 1.01–1.32 slots have not changed.
  data.teams[0].points_for+=.25;
  await win.draftPickRankingsV527.refresh(true);
  assert.equal(renderCount,2);
  assert.equal(normalization.pickContext(pick).value,7000);
  // Same-week imported PF from a stale audit cannot replace newer live PF.
  data.source='sleeper-importer-audit';
  data.teams[0].points_for-=.25;
  await win.draftPickRankingsV527.refresh(true);
  assert.equal(win.draftPickRankingsV527.status.source,'sleeper-live-rosters');
  assert.equal(renderCount,2);
  // An older importer snapshot must never roll back the displayed week.
  data.completed_week=8;
  for(const t of data.teams){t.wins=8;t.losses=0}
  await win.draftPickRankingsV527.refresh(true);
  assert.equal(win.draftPickRankingsV527.status.completed_week,9);
  assert.equal(renderCount,2);
  assert.equal(win.draftPickProjection90(pick).value,5835);
  assert.equal(normalization.pickContext(pick).value,7000);
  // The next completed Sleeper week must supersede the previous one
  // automatically, with updated PF and no user-triggered revaluation.
  data.source='sleeper-live-rosters';
  data.completed_week=10;
  for(const t of data.teams){t.wins=10;t.losses=0;t.points_for+=90}
  await win.draftPickRankingsV527.refresh(true);
  assert.equal(win.draftPickRankingsV527.status.completed_week,10);
  assert.equal(renderCount,3);
  assert.equal(normalization.canonicalValue(pick),7000);
});
test('existing trade snapshot values remain untouched by the post-cutover ranking overlay',()=>{
  const backend=readFileSync(new URL('../netlify/functions/value-history.mjs',import.meta.url),'utf8');
  const frontend=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
  assert.match(backend,/trade\.ranking_at_trade=slots\?/);
  assert.match(frontend,/trade\?\.ranking_at_trade\?\.slots/);
  assert.match(frontend,/historicalPickSnapshotRow\(side,p\)\?\.projected_slot/);
  assert.match(frontend,/Date\.parse\('2026-09-25T04:00:00\.000Z'\)/);
  assert.match(backend,/then_picks:thenPicks\.values/);
  assert.match(frontend,/value:then/);
});

test('importer roster standings supply complete league record and PF without matchup pairs',()=>{
  const source=Array.from({length:32},(_,i)=>({
    roster_id:i+1,
    settings:{wins:i===31?9:Math.floor(i/4),losses:i===31?0:9-Math.floor(i/4),
      ties:0,fpts:250+i*19,fpts_decimal:i%100}
  }));
  const read=completedRosterStandings(source);
  assert.equal(read.completedWeek,9);
  assert.equal(read.rows[0].pf,250);
  assert.equal(read.rows[31].pf,250+31*19+.31);
  const ranks=rank5050(read.rows);
  assert.equal(ranks.find(x=>x.id===32).recordRank,1);
  assert.equal(ranks.find(x=>x.id===32).pointsRank,1);
  assert.equal(ranks.find(x=>x.id===32).projectedSlot,32);
  assert.equal(ranks.find(x=>x.id===1).projectedSlot,1);
  assert.throws(()=>completedRosterStandings(source.slice(0,31)),/32-team/);
  const missing=structuredClone(source);delete missing[0].settings.wins;
  assert.throws(()=>completedRosterStandings(missing),/incomplete/);
  const partial=structuredClone(source);partial[2].settings.losses--;
  assert.throws(()=>completedRosterStandings(partial),/same completed week/);
  const invalid=structuredClone(source);invalid[1].settings.fpts_decimal=100;
  assert.throws(()=>completedRosterStandings(invalid),/incomplete/);
});
test('ranking endpoint uses importer-compatible roster source and never calls matchups for current standings',()=>{
  const backend=readFileSync(new URL('../netlify/functions/pick-order-v527.mjs',import.meta.url),'utf8');
  assert.match(backend,/sourceJson\(SLEEPER\+'\/league\/'.*'\/rosters'\)/);
  assert.match(backend,/sourceJson\(AUDIT\+'\/'.*'\/rosters\.json/);
  assert.match(backend,/completedRosterStandings\(live\)/);
  assert.match(backend,/completedRosterStandings\(archived\)/);
  assert.doesNotMatch(backend,/getPickOrder5050\(sourceLeague,completedWeek\)/);
  assert.match(backend,/rank5050\(current\.rows\)/);
});

test('Netlify ranking endpoint serves 200 from actual importer roster shape without matchup fetches',async()=>{
  const league={season:'2026',settings:{playoff_week_start:15}},rosters=Array.from({length:32},(_,i)=>({
    roster_id:i+1,settings:{wins:i===31?9:i%9,losses:i===31?0:9-i%9,ties:0,fpts:100+i*10,fpts_decimal:25}
  }));
  const previous=globalThis.fetch,calls=[];
  globalThis.fetch=async url=>{
    calls.push(String(url));
    if(String(url).endsWith('/league/1316867686394769408'))return new Response(JSON.stringify(league),{status:200});
    if(String(url).endsWith('/league/1316867686394769408/rosters'))return new Response(JSON.stringify(rosters),{status:200});
    return new Response('Not Found',{status:404});
  };
  try{
    const res=await pickRankingHandler(new Request('https://test.invalid/.netlify/functions/pick-order-v527'));
    assert.equal(res.status,200);
    const body=await res.json();
    assert.equal(body.status,'current');
    assert.equal(body.source,'sleeper-live-rosters');
    assert.equal(body.completed_week,9);
    assert.equal(body.teams.length,32);
    assert.equal(body.teams.find(x=>x.roster_id===32).projected_slot,32);
    assert.equal(body.teams.find(x=>x.roster_id===1).projected_slot,1);
    assert.equal(calls.length,2,'do not query expensive or incomplete weekly matchups');
  }finally{globalThis.fetch=previous}
});
test('Netlify ranking endpoint can recover verified importer audit roster data',async()=>{
  const previous=globalThis.fetch,calls=[];
  const rosters=Array.from({length:32},(_,i)=>({roster_id:i+1,settings:{
    wins:i%5,losses:4-i%5,ties:0,fpts:240+i*7,fpts_decimal:5
  }}));
  globalThis.fetch=async url=>{
    calls.push(String(url));const u=String(url);
    if(u.endsWith('/league/1316867686394769408'))return new Response(JSON.stringify({season:'2026',settings:{playoff_week_start:15}}));
    if(u.includes('/league-audit/2026/rosters.json'))return new Response(JSON.stringify(rosters));
    return new Response('Not Found',{status:404});
  };
  try{
    const res=await pickRankingHandler(new Request('https://test.invalid/.netlify/functions/pick-order-v527'));
    assert.equal(res.status,200);
    const body=await res.json();
    assert.equal(body.source,'sleeper-importer-audit');
    assert.equal(body.completed_week,4);
    assert.equal(body.teams.length,32);
    assert.equal(calls.length,3);
  }finally{globalThis.fetch=previous}
});
