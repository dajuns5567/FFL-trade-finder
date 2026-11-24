import test from "node:test";
import assert from "node:assert/strict";
import {extractKtcSuperflexRankings, refreshKtc} from "../netlify/functions/ktc-adapter.mjs";

function fixture() {
  const players = Array.from({length: 350}, (_, i) => ({
    playerName: "Test Player " + (i + 1),
    position: ["QB", "RB", "WR", "TE"][i % 4],
    oneQBValues: {rank: 350 - i, value: 100 + i},
    superflexValues: {rank: i + 1, value: 9999 - i}
  }));
  players.push({playerName:"2027 Early 1st",position:"RDP",superflexValues:{rank:1,value:9999}});
  return '<script>var oneQBPlayers = ' + JSON.stringify(players) +
    '; var playersArray = []; var ktcPoolReady = ktcFetchPlayerPool("dynasty", "version");</script>';
}

test("KTC inline oneQBPlayers bootstrap yields Superflex—not 1QB—ranking", () => {
  const result = extractKtcSuperflexRankings(fixture());
  assert.equal(result.rows.length, 350);
  assert.equal(result.extractionMethod, "inline-array:oneQBPlayers");
  assert.equal(result.rows[0].player, "Test Player 1");
  assert.equal(result.rows[0].rank, 1);
  assert.equal(result.rows[349].rank, 350);
  assert.equal(result.excludedDraftPicks, 1);
  assert.ok(result.rows.every(row => row.position !== "RDP"));
});

test("KTC successful refresh validates 300+ unique offensive Superflex rankings", async () => {
  const result = await refreshKtc({fetchImpl: async () => ({ok:true,text:async()=>fixture()})});
  assert.equal(result.valid,true);
  assert.equal(result.format,"dynasty-superflex");
  assert.equal(result.diagnostics.extraction_method,"inline-array:oneQBPlayers");
  assert.equal(result.ranking_rows,350);
});

test("empty playersArray and unrelated later arrays cannot pass validation", async () => {
  const html = '<script>var oneQBPlayers = []; var playersArray = []; var unrelated = [{"a":1}];</script>';
  const result = await refreshKtc({fetchImpl:async()=>({ok:true,text:async()=>html})});
  assert.equal(result.valid,false);
  assert.equal(result.ranking_rows,0);
  assert.equal(result.diagnostics.validation_result,false);
});
