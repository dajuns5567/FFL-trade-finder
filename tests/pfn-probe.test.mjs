import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("PFN probe function exists and targets the PFN dynasty rankings URL",()=>{
  const source=fs.readFileSync(new URL("../netlify/functions/pfn-probe.mjs",import.meta.url),"utf8");
  assert.match(source,/profootballnetwork\.com\/fantasy-football-dynasty-rankings/);
  assert.match(source,/selected/);
  assert.match(source,/candidateLines/);
});
