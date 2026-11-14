# IDP source integrity — November 14, 2026 (Preview #466 audit)

Read-only evidence: user-exported `ffl-full-valuation-audit-2026-11-14T20-58-44-127Z.json`, generated from `deploy-preview-466--precious-dango-fb4633.netlify.app` before this correction. It is not a ranking source. Do not use the historical snapshot to infer any live market movement.

## Verified scope

- 1,041 master-ranked players; 463 IDP, 578 offense; 543 rostered player IDs.
- Source confidence: 267/463 IDPs have publisher consensus. The remaining 196 have no imported consensus. **191 of those 196 have qualified Sleeper regular-season production** and must retain conservative production-backed fallback.
- All first 40 IDP positions have consensus; exactly one of the first 100 is missing consensus: Marlon Humphrey, IDP #72, overall #337, with four scoring seasons.
- **Exactly five IDPs are missing BOTH consensus and a qualifying Sleeper season**, and formerly inherited an unearned neutral 520-point scoring prior:
  - Justin Jefferson (ID 13524), overall #724 / IDP #159, model TV 206, no qualifying history.
  - Bud Clark (13452), overall #730 / IDP #165, TV 204.
  - Isaiah Foskey (10909), overall #732 / IDP #167, TV 203.
  - Tycen Anderson (8377), overall #743 / IDP #178, TV 198.
  - Johnathan Edwards (13107), overall #744 / IDP #179, TV 198.
- This is distinct from the offensive Josh Allen (4984) and IDP Josh Allen (2212) identity collision; two name matches are **not** duplicate Sleeper IDs. The IDP Josh Allen has publisher consensus and zero scoring history, so he is **not** affected by the no-source/no-scoring rule. His source validity and roster/team identity remain an explicit review item.

## Systemic cause and correction

`valuation-idp-v25-perf.js` previously used the scoring model's neutral `value:520` when there were no qualifying seasons, even when the player also lacked a dynasty consensus source. The old no-source formula `.40*score+.20*context` then assigned unverified production credit. The new V73 guard substitutes the scoring model's **existing verified minimum of 180** only when both independent evidence channels are absent. It leaves all players with dynasty consensus or qualifying Sleeper production unchanged; the normal IDP 20% / 45% / 35% mix and V72 downstream curve remain intact. Production metadata includes the raw neutral prior, evidence-qualified effective scoring input and explicit fallback reason. Player Values explains the same logic.

Do not manually rank the five affected players, invent their consensus, or delete them from the eligible player universe. New ranking positions require a fresh combined build.

## Near-name identity risk found during the follow-up audit

The composite source parser previously allowed a publisher's fuzzy first-name match even when more than one *different Sleeper IDP identity* shared that surname and a compatible first-name prefix. Same-canonical-name identity guards (e.g. Chris Jones variants) were already strict, but the near-alias case was not. The following **potential** collision cohorts exist in the imported snapshot (the same displayed CV alone is not proof of a bad source match, because the IDP curve floors low-ranked source values):

- Quinnen Williams (6118) / Quincy Williams (6214)
- Christian Gonzalez (10881) / Chris Gonzalez (5404)
- Carlton Davis III (5054) / Carl Davis (2395)
- Jonathan Cooper (1574) / Jonathon Cooper (7765)
- Marcus Jones (8359) / Marcel Jones (1187)

The source composite now accepts a publisher's **exact canonical name** for each player as before, and preserves uniquely owned aliases. When different IDP Sleeper players could both plausibly own one fuzzy publisher row, it refuses to assign that row to a different-canonical player. It does **not** transfer the source value to a guessed identity. Offensive ownership logic and source values are unchanged. The new regression tests use synthetic candidates rather than hardcoding adjustments for the listed players.

## Remaining evidence limitations

- Myles Garrett: 20.55 current-year league PPG from **2 games**, alongside 36 games in the 2024–26 actual aggregate; review the game-count qualification, not the value by fiat.
- Micah McFadden: 22.5 current-year league PPG from **2 games**; similarly flag the small sample.
- Fred Warner: audited 2026 and 2024 seasons but no qualifying 2025 record; this alone does **not** prove missing import. The absence may reflect fewer than eight regular-season games in that year, because historical qualification uses an eight-game cutoff.
- Dallas Turner: #129 / IDP #18, 17.71 2026 PPG across eight games; Fred Warner: #139 / IDP #21, 17.43 PPG across eight. Both values incorporate multi-year evidence. Do not hand-boost either.
- No duplicate **IDs**, playerRankValue mismatches, or final-value inversions were found in the full 1,041-player snapshot.
- Original audit's five `STALE_OFFENSE_PRECISION` flags refer to V384 uncovered offensive-source fallback, **not IDP defects**; leave offense unmodified in this release.

## Repeatable validation

The active IDP runtime exposes `window.idpSourceIntegrityAuditV73()` as a purely read-only source-by-source and scoring-evidence diagnostic. It returns all ranked IDP players, their exact Sleeper IDs, source counts/names, qualifying seasons, current-game samples and explicitly flagged cohorts. It performs no POST, refresh, ranking update, or historical archive write.

`node --test tests/idp-unverified-fallback-v73.test.mjs tests/idp-source-integrity-audit-v73.test.mjs` checks:
- Missing consensus **and** zero scored seasons → conservative effective scoring minimum.
- A real source **or** a single qualified season prevents this guard.
- Evidence monotonicity and non-IDP isolation.
- Metadata/UI explanation.
- Same-name offense/IDP identities are not falsely treated as duplicate defensive players.
- Repeatable read-only source-provenance reporting.

PR #467 is a draft IDP-only fix. PR #466 is a separate unpublished cross-subsystem integration candidate. Neither is a production authorization.
