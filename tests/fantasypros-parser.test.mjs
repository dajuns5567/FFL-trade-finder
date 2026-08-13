import test from "node:test";
import assert from "node:assert/strict";
import {
  CONSENSUS_SOURCES,
  extractFantasyProsRankings,
  refreshSource
} from "../netlify/functions/consensus-adapters.mjs";

test("extracts overall ECR from FantasyPros structured data",()=>{
  const players=Array.from({length:80},(_,index)=>({
    player_name:index===0?"Ja'Marr Chase":`Dynasty Player ${index+1}`,
    rank_ecr:index+1,
    pos_rank:`WR${index+10}`
  }));
  players.push({player_name:"Ja'Marr Chase",rank_ecr:4,pos_rank:"WR99"});
  players.push({player_name:"Not Ranked",rank_ecr:null,pos_rank:"WR1"});
  players.push({player_name:"",rank_ecr:81,pos_rank:"WR2"});
  const fixture=`<script>var ecrData = ${JSON.stringify({players})};</script>`;

  const parsed=extractFantasyProsRankings(fixture);
  assert.equal(parsed.parser,"fantasypros-ecrData");
  assert.equal(parsed.rawRankingRows,83);
  assert.equal(parsed.rows.length,80);
  assert.deepEqual(parsed.rows[0],{player:"Ja'Marr Chase",rank:1});
  assert.deepEqual(parsed.rows[1],{player:"Dynasty Player 2",rank:2});
  assert.equal(parsed.rows.some(row=>row.rank===10&&row.player==="Dynasty Player 10"),true);
  assert.equal(parsed.rows.some(row=>row.player==="Not Ranked"),false);
  assert.equal(parsed.rows.some(row=>row.rank===99),false);
});

test("FantasyPros adapter validates a full structured Dynasty PPR response",async()=>{
  const players=Array.from({length:80},(_,index)=>({
    player_name:`Player ${index+1}`,
    rank_ecr:index+1,
    pos_rank:`WR${80-index}`
  }));
  const html=`<!doctype html><title>Dynasty PPR Rankings</title><script>window.ecrData=${JSON.stringify({players})};</script>`;
  const fetchImpl=async url=>({
    ok:true,
    text:async()=>html
  });
  const source=CONSENSUS_SOURCES.find(item=>item.id==="fantasypros");

  assert.match(source.urls[0],/dynasty-overall\.php\?scoring=PPR$/);
  const result=await refreshSource(source,{fetchImpl,timeoutMs:100});
  assert.equal(result.valid,true);
  assert.equal(result.ranking_rows,80);
  assert.equal(result.players_extracted,80);
  assert.equal(result.diagnostics.fetch_method,"direct");
  assert.equal(result.diagnostics.parser,"fantasypros-ecrData");
  assert.equal(result.diagnostics.raw_ranking_rows,80);
  assert.deepEqual(result.diagnostics.first_10,players.slice(0,10).map(row=>({
    rank:row.rank_ecr,
    player:row.player_name
  })));
});
