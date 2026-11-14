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
    fetch:async()=>({ok:true,json:async()=>structuredClone(data)}),setInterval:()=>0,console,Date,Number,String,JSON,Math,Promise,
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


test('complete 2027 first-round cohort assigns original 32 values monotonically to 50/50 projected slots',async()=>{
  const src=readFileSync(new URL('../draft-pick-rankings-v527.js',import.meta.url),'utf8');
  const picks=Array.from({length:32},(_,i)=>({type:'pick',id:'pick-2027-1-'+(i+1),season:2027,round:1,original_owner:i+1,owner:i+1}));
  const legacy=x=>({projectedSlot:x.original_owner,value:7000-(33-x.original_owner)*110,source:'old ranking'});
  const teams=picks.map((p,i)=>({roster_id:i+1,wins:9,losses:0,ties:0,points_for:900+i,record_rank:1,points_rank:32-i,combined_rank:32-i,projected_slot:i+1}));
  const data={status:'current',source:'sleeper-live-rosters',league_id:'1316867686394769408',season:2026,standings_season:2026,completed_week:9,teams};
  const normalization={pickContext:x=>({...legacy(x)}),pickValue:x=>Number(win.draftPickProjection92(x).value),canonicalValue:x=>Number(win.draftPickProjection92(x).value)};
  const doc={readyState:'complete',hidden:false,getElementById:()=>({id:'pickRankingHealthV527'}),createElement:()=>({}),addEventListener:()=>{}};
  const win={draftPickProjection90:legacy,draftPickProjection92:legacy,tradeValueNormalizationV139:normalization,state:{allAssets:picks,league:{league_id:data.league_id,season:2026}},renderAll:()=>{},addEventListener:()=>{}};
  const context={window:win,document:doc,localStorage:{getItem:()=>null,setItem:()=>{}},fetch:async()=>({ok:true,json:async()=>structuredClone(data)}),setInterval:()=>0,console,Date,Number,String,JSON,Math,Promise,encodeURIComponent};
  vm.runInNewContext(src,context,{filename:'draft-pick-rankings-v527.js'});
  await win.draftPickRankingsV527.refresh(true);
  const oldValues=picks.map(p=>legacy(p).value).sort((a,b)=>b-a);
  const newValues=picks.map(p=>win.draftPickProjection92(p).value);
  assert.deepEqual(newValues,oldValues,'must redistribute exact existing value curve, without altering total cohort supply');
  for(let i=1;i<newValues.length;i++)assert.ok(newValues[i-1]>=newValues[i],'2027 1.'+String(i).padStart(2,'0')+' cannot be valued less than later 1.'+String(i+1).padStart(2,'0'));
  assert.equal(normalization.pickContext(picks[3]).value,newValues[3]);
  assert.equal(normalization.canonicalValue(picks[6]),newValues[6]);
});


test('verified 50/50 slots restore original V92 slope from a flat source cohort across all three draft rounds',async()=>{
  const src=readFileSync(new URL('../draft-pick-rankings-v527.js',import.meta.url),'utf8');
  const years=[2027,2028,2029],rounds=[1,2,3];
  const anchors={2027:{1:7000,2:1930,3:615},2028:{1:6870,2:1930,3:615},2029:{1:6870,2:1930,3:615}};
  const picks=years.flatMap(year=>rounds.flatMap(round=>Array.from({length:32},(_,i)=>({
    type:'pick',id:'pick-'+year+'-'+round+'-'+(i+1),season:year,round,original_owner:i+1,owner:i+1
  }))));
  const source=x=>({value:anchors[x.season][x.round],projectedSlot:16,source:'flat legacy cache'});
  const norm={pickContext:source,pickValue:x=>win.draftPickProjection92(x).value,
    canonicalValue:x=>win.draftPickProjection92(x).value};
  const teams=Array.from({length:32},(_,i)=>({roster_id:i+1,wins:9,losses:0,ties:0,
    points_for:900+i,record_rank:1,points_rank:32-i,combined_rank:32-i,projected_slot:i+1}));
  const data={status:'current',source:'sleeper-live-rosters',league_id:'1316867686394769408',
    season:2026,standings_season:2026,completed_week:9,teams};
  const doc={readyState:'complete',hidden:false,getElementById:()=>({id:'pickRankingHealthV527'}),
    createElement:()=>({}),addEventListener:()=>{}};
  const win={draftPickProjection90:source,draftPickProjection92:source,
    tradeValueNormalizationV139:norm,state:{allAssets:picks,league:{league_id:data.league_id,season:2026}},
    renderAll:()=>{},addEventListener:()=>{}};
  const ctx={window:win,document:doc,localStorage:{getItem:()=>null,setItem:()=>{}},
    fetch:async()=>({ok:true,json:async()=>structuredClone(data)}),setInterval:()=>0,
    console,Date,Number,String,JSON,Math,Promise,encodeURIComponent};
  vm.runInNewContext(src,ctx,{filename:'draft-pick-rankings-v527.js'});
  await win.draftPickRankingsV527.refresh(true);
  for(const year of years)for(const r of rounds){
    const group=picks.filter(x=>x.season===year&&x.round===r);
    const values=group.map(norm.canonicalValue);
    const priorYear=years[years.indexOf(year)-1];
    if(!priorYear)assert.equal(values[0],anchors[year][r],year+' round '+r+' nearest-year value remains anchored');
    else{
      const preceding=picks.filter(x=>x.season===priorYear&&x.round===r).map(norm.canonicalValue);
      for(let i=0;i<values.length;i++){
        const cap=Math.max(5,Math.floor(preceding[i]*.88/5)*5);
        assert.ok(values[i]<=cap,year+' round '+r+' slot '+(i+1)+' must retain V92 future-year discount');
      }
      assert.equal(values[0],Math.min(anchors[year][r],Math.max(5,Math.floor(preceding[0]*.88/5)*5)),
        year+' round '+r+' cannot recover an undiscounted cached top pick');
      assert.ok(values[0]<preceding[0],year+' round '+r+' must be below the prior draft');
    }
    assert.ok(values[3]>values[6],year+' round '+r+' 1.04 must exceed 1.07');
    assert.ok(values[0]>values[31],year+' round '+r+' earliest pick must exceed latest');
    for(let i=1;i<values.length;i++)
      assert.ok(values[i-1]>=values[i],year+' round '+r+' monotonic at slot '+(i+1));
    for(const pick of group)
      assert.equal(norm.pickContext(pick).value,norm.canonicalValue(pick),
        'Trade Finder, Evaluator and Player Values must share canonical pick value');
  }
  assert.equal(norm.canonicalValue(picks.find(x=>x.season===2027&&x.round===1&&x.original_owner===1)),7000);
});


test('real V139 canonical pricing and trade baseValue consume projected-slot curve consistently',async()=>{
  const normalization=readFileSync(new URL('../trade-value-normalization-v139.js',import.meta.url),'utf8');
  const overlay=readFileSync(new URL('../draft-pick-rankings-v527.js',import.meta.url),'utf8');
  const picks=Array.from({length:32},(_,i)=>({type:'pick',id:'pick-2027-1-'+(i+1),
    season:2027,round:1,original_owner:i+1,owner:i+1}));
  const legacy=x=>({value:7000,projectedSlot:16,source:'legacy flat price'});
  const standings={status:'current',source:'sleeper-live-rosters',league_id:'1316867686394769408',
    season:2026,standings_season:2026,completed_week:9,
    teams:Array.from({length:32},(_,i)=>({roster_id:i+1,wins:9,losses:0,ties:0,
      points_for:900+i,record_rank:1,points_rank:32-i,combined_rank:32-i,projected_slot:i+1}))};
  const win={state:{league:{league_id:standings.league_id,season:2026},allAssets:picks},
    draftPickProjection90:legacy,draftPickProjection92:legacy,
    baseValue:x=>7000,pickValue:x=>7000,packageValue:xs=>xs.length*7000,
    renderAll:()=>{},addEventListener:()=>{}};
  const doc={readyState:'complete',hidden:false,getElementById:()=>({id:'pickRankingHealthV527'}),
    createElement:()=>({}),addEventListener:()=>{}};
  const ctx={window:win,document:doc,localStorage:{getItem:()=>null,setItem:()=>{}},
    fetch:async()=>({ok:true,json:async()=>structuredClone(standings)}),
    setInterval:()=>0,console,Date,Number,String,JSON,Math,Promise,encodeURIComponent};
  vm.runInNewContext(normalization,ctx,{filename:'trade-value-normalization-v139.js'});
  vm.runInNewContext(overlay,ctx,{filename:'draft-pick-rankings-v527.js'});
  await win.draftPickRankingsV527.refresh(true);
  const v=win.tradeValueNormalizationV139;
  for(let i=0;i<32;i++){
    const pick=picks[i],current=v.canonicalValue(pick);
    assert.equal(win.baseValue(pick),current,'Trade Finder must read canonical current value');
    assert.equal(win.packageValue([pick]),current,'package scoring must read current value');
    assert.equal(v.pickValue(pick),current,'Evaluator must read current value');
    assert.equal(v.pickContext(pick).value,current,'Player Values must show current value');
    assert.equal(win.draftPickProjection92(pick).value,current,'projected slot must use current curve');
    if(i>0)assert.ok(current<=v.canonicalValue(picks[i-1]),'slot curve is monotonic at '+(i+1));
  }
  assert.equal(v.canonicalValue(picks[0]),7000,'original nearest-year first-round anchor remains 7000');
  assert.ok(v.canonicalValue(picks[3])>v.canonicalValue(picks[6]),'1.04 must be worth more than 1.07');
  assert.ok(v.canonicalValue(picks[0])>v.canonicalValue(picks[21]),'1.01 must be worth more than 1.22');
});

test('future-year correction does not discount already discounted source cohorts twice',async()=>{
 const src=readFileSync(new URL('../draft-pick-rankings-v527.js',import.meta.url),'utf8');
 const picks=[2027,2028].flatMap(year=>Array.from({length:32},(_,i)=>({
  type:'pick',id:'pick-'+year+'-2-'+(i+1),season:year,round:2,original_owner:i+1,owner:i+1
 })));
 const legacy=x=>({value:x.season===2027?2000-(x.original_owner-1)*10:1200-(x.original_owner-1)*5,projectedSlot:16});
 const teams=Array.from({length:32},(_,i)=>({roster_id:i+1,wins:9,losses:0,ties:0,
  points_for:900+i,record_rank:1,points_rank:32-i,combined_rank:32-i,projected_slot:i+1}));
 const data={status:'current',source:'sleeper-live-rosters',league_id:'1316867686394769408',
  season:2026,standings_season:2026,completed_week:9,teams};
 const norm={pickContext:legacy,pickValue:x=>win.draftPickProjection92(x).value,
  canonicalValue:x=>win.draftPickProjection92(x).value};
 const doc={readyState:'complete',hidden:false,getElementById:()=>({id:'pickRankingHealthV527'}),
  createElement:()=>({}),addEventListener:()=>{}};
 const win={draftPickProjection90:legacy,draftPickProjection92:legacy,tradeValueNormalizationV139:norm,
  state:{allAssets:picks,league:{league_id:data.league_id,season:2026}},
  renderAll:()=>{},addEventListener:()=>{}};
 const ctx={window:win,document:doc,localStorage:{getItem:()=>null,setItem:()=>{}},
  fetch:async()=>({ok:true,json:async()=>structuredClone(data)}),
  setInterval:()=>0,console,Date,Number,String,JSON,Math,Promise,encodeURIComponent};
 vm.runInNewContext(src,ctx,{filename:'draft-pick-rankings-v527.js'});
 await win.draftPickRankingsV527.refresh(true);
 for(const pick of picks)
  assert.equal(norm.canonicalValue(pick),legacy(pick).value,
   'do not compound the discount when source future-year cohort is already conservative');
});

test('incomplete later-year cohort retains conservative original source fallback',async()=>{
 const src=readFileSync(new URL('../draft-pick-rankings-v527.js',import.meta.url),'utf8');
 const picks=[...Array.from({length:32},(_,i)=>({type:'pick',id:'pick-2027-2-'+(i+1),
  season:2027,round:2,original_owner:i+1,owner:i+1})),
  {type:'pick',id:'pick-2029-2-1',season:2029,round:2,original_owner:1,owner:1}];
 const legacy=x=>({value:x.season===2029?900:1900,projectedSlot:16});
 const teams=Array.from({length:32},(_,i)=>({roster_id:i+1,wins:9,losses:0,ties:0,
  points_for:900+i,record_rank:1,points_rank:32-i,combined_rank:32-i,projected_slot:i+1}));
 const data={status:'current',source:'sleeper-live-rosters',league_id:'1316867686394769408',
  season:2026,standings_season:2026,completed_week:9,teams};
 const norm={pickContext:legacy,pickValue:x=>win.draftPickProjection92(x).value,
  canonicalValue:x=>win.draftPickProjection92(x).value};
 const doc={readyState:'complete',hidden:false,getElementById:()=>({id:'pickRankingHealthV527'}),
  createElement:()=>({}),addEventListener:()=>{}};
 const win={draftPickProjection90:legacy,draftPickProjection92:legacy,tradeValueNormalizationV139:norm,
  state:{allAssets:picks,league:{league_id:data.league_id,season:2026}},
  renderAll:()=>{},addEventListener:()=>{}};
 vm.runInNewContext(src,{window:win,document:doc,localStorage:{getItem:()=>null,setItem:()=>{}},
  fetch:async()=>({ok:true,json:async()=>structuredClone(data)}),setInterval:()=>0,
  console,Date,Number,String,JSON,Math,Promise,encodeURIComponent},{filename:'draft-pick-rankings-v527.js'});
 await win.draftPickRankingsV527.refresh(true);
 assert.equal(norm.canonicalValue(picks.at(-1)),900,'missing comparison cohort must not be synthesized');
});


test('2027–2029 discounted picks propagate to Player Values, Finder, Evaluator and current Trade History Hindsight without rewriting original trades',async()=>{
 const normalization=readFileSync(new URL('../trade-value-normalization-v139.js',import.meta.url),'utf8');
 const overlay=readFileSync(new URL('../draft-pick-rankings-v527.js',import.meta.url),'utf8');
 const history=readFileSync(new URL('../value-history-v276.js',import.meta.url),'utf8');
 const runtime=readFileSync(new URL('../trade-runtime-v130.js',import.meta.url),'utf8');
 const years=[2027,2028,2029],rounds=[1,2,3];
 const anchors={1:7000,2:1930,3:615};
 const picks=years.flatMap(year=>rounds.flatMap(round=>Array.from({length:32},(_,i)=>({
  type:'pick',id:'pick-'+year+'-'+round+'-'+(i+1),season:year,round,
  original_owner:i+1,owner:i+1
 }))));
 const legacy=x=>({value:anchors[x.round],projectedSlot:16,source:'flat per-year source'});
 const standings={status:'current',source:'sleeper-live-rosters',league_id:'1316867686394769408',
  season:2026,standings_season:2026,completed_week:9,
  teams:Array.from({length:32},(_,i)=>({roster_id:i+1,wins:9,losses:0,ties:0,
   points_for:900+i,record_rank:1,points_rank:32-i,combined_rank:32-i,projected_slot:i+1}))};
 const win={state:{league:{league_id:standings.league_id,season:2026},allAssets:picks},
  draftPickProjection90:legacy,draftPickProjection92:legacy,
  baseValue:()=>7000,pickValue:()=>7000,packageValue:()=>7000,
  renderAll:()=>{},addEventListener:()=>{}};
 const doc={readyState:'complete',hidden:false,
  getElementById:()=>({id:'pickRankingHealthV527'}),createElement:()=>({}),
  addEventListener:()=>{}};
 const context={window:win,document:doc,localStorage:{getItem:()=>null,setItem:()=>{}},
  fetch:async()=>({ok:true,json:async()=>structuredClone(standings)}),
  setInterval:()=>0,console,Date,Number,String,JSON,Math,Promise,encodeURIComponent};
 vm.runInNewContext(normalization,context,{filename:'trade-value-normalization-v139.js'});
 vm.runInNewContext(overlay,context,{filename:'draft-pick-rankings-v527.js'});
 await win.draftPickRankingsV527.refresh(true);
 const norm=win.tradeValueNormalizationV130;
 const sourceBetween=(a,b)=>history.slice(history.indexOf(a),history.indexOf(b,history.indexOf(a)));
 const extract=[
  sourceBetween('function currentPickRows(){','function currentTeamRows('),
  sourceBetween('function currentEvaluatorValue(asset){','function tradeHistoryNearestDraftYear('),
  sourceBetween('function historicalPickSnapshotRow(side,p){','function historicalPickProjectedSlot('),
  sourceBetween('function completedHistoricalPick(asset){','function tradeResultScoreboard(')
 ];
 for(const chunk of extract)assert.ok(chunk.length>100&&chunk.length<4000,
  'Trade History audit must target known live implementation, not an absent or changed helper');
 const histCtx={window:win,state:win.state,Math,Number,String,Date,Map,Array,
  activeNearestDraftYear:()=>2027,
  currentPickProjectionSlot:a=>norm.pickContext(a).projectedSlot,
  retroactiveTradeHistoryPickValue:()=>{throw Error('historical reconstruction not expected for unexpired draft picks')}};
 vm.runInNewContext(extract.join('\n'),histCtx,{filename:'value-history-v276-extracted-current-pricing.js'});
 // These runtime entry points are consumed by the actual Finder and Evaluator;
 // guard against replacing their canonical dependency with a stale pick curve.
 assert.match(runtime,/const av=x=>Math\.max\(0,Number\(norm\(\)\.canonicalValue\?\.\(x\)\)\|\|0\)/);
 assert.match(runtime,/const raw=xs=>\(xs\|\|\[\]\)\.reduce\(\(s,x\)=>s\+av\(x\),0\)/);
 assert.match(runtime,/function generateFinder\(\)/);
 assert.match(runtime,/function syncEval\(side\)/);
 assert.match(runtime,/function assetMarkup\(x\)/);
 assert.match(history,/function hindsightFair\(give,recv,trade\)\{return fairWithValue\(give,recv,a=>hindsightValue\(a,trade\)\)\}/);
 assert.match(history,/function tradeHistoryEvaluatorValue\(asset,trade\)/);
 const datedTrade={created:'2026-10-15T12:00:00.000Z'};
 const baseline={then_picks:[{id:'pick-2029-2-1',value:2450,projected_slot:1}]};
 const historicPick={season:2029,round:2,original_roster_id:1};
 for(const round of rounds){
  for(const rid of [1,4,16,32]){
   const values=years.map(y=>{
    const p=picks.find(a=>a.season===y&&a.round===round&&a.original_owner===rid);
    const current=norm.canonicalValue(p);
    assert.equal(win.baseValue(p),current,'Finder canonical asset lookup');
    assert.equal(win.packageValue([p]),current,'Finder package totals');
    assert.equal(norm.pickValue(p),current,'Evaluator current value');
    assert.equal(norm.pickContext(p).value,current,'Player Values displayed current value');
    assert.equal(win.draftPickProjection92(p).value,norm.sourceValue(p),'source projected slot valuation');
    assert.equal(histCtx.currentEvaluatorValue(p),current,'Trade History live asset value');
    assert.equal(histCtx.hindsightValue(p,datedTrade),current,'Hindsight current valuation');
    return current;
   });
   assert.ok(values[0]>values[1]&&values[1]>values[2],
    'round '+round+' slot '+rid+' must strictly decrease by future draft year in every current-value consumer');
  }
 }
 const reported=histCtx.currentPickRows();
 assert.equal(reported.length,picks.length);
 for(const p of picks){
  const row=reported.find(r=>r.id===p.id);
  assert.equal(row.value,norm.canonicalValue(p),'Trade History current pick records must use canonical value');
 }
 assert.equal(histCtx.historicalPickValue(baseline,historicPick),2450,
  'Original Trade History must preserve its captured pick value, even when today’s value is discounted');
 assert.notEqual(histCtx.currentEvaluatorValue(picks.find(p=>p.id==='pick-2029-2-1')),2450);
});
