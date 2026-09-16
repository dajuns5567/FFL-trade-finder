# FLEECED — CHAT HANDOFF

Repository: `dajuns5567/FFL-trade-finder`
Working branch: `fix/idp-week1-systemic-weighting-20260915`
PR: #382

This is the compact continuation handoff. **Do not scan the repository and do not read the master handoff at startup.** GitHub is the implementation source of truth. Inspect only the active files needed for the current step.

## NON-NEGOTIABLE REGRESSION CONTRACT

- Fleeced has ONE canonical player/pick Value system. Finder, Evaluator, rankings, current-value Trade History, etc. consume it.
- Rank derives from canonical Value. Never manipulate rank independently.
- Never make player-specific multipliers, bonuses, penalties, exceptions, name/ID checks, or valuation fixes. Players may be diagnostic examples only.
- Fix the earliest systemic layer that is wrong: source data → game qualification/scoring → season aggregates → PPG/weighting → production → canonical Value → rank → trade fairness → consumers/UI.
- Value Adjustment is trade-only. It may affect package fairness, never individual player/pick Value, rank, PPG, consensus, production, or Value History.
- Team fit/need/Win Now/Future Focus/partner fit may affect Finder recommendation ordering, not canonical Value or fairness.
- Never guess unavailable historical data.
- Validate an audit before changing production because of it.
- Before editing, inspect the active implementation and affected consumers. The repo contains many obsolete versioned files; file existence does not mean activation.
- Do not merge/deploy production without explicit permission.

## CURRENT VALUE / SCORING RULES

Offense intended components: **60% consensus / 25% production / 15% other dynasty context**.

IDP intended components: **40% consensus / 40% production / 20% other IDP dynasty context**. If runtime differs, that is an implementation discrepancy, not a new intended formula.

A player-game qualifies for valuation production when:

**snap share >=20% OR league fantasy points >=8**

Offense uses offensive snaps; IDP uses defensive snaps. Numerator and denominator must use the same qualifying games.

Historical season: >=8 qualifying games.
Current active season: bypass the historical 8-game season minimum, but each game still must qualify and only completed/finalized weeks count.

Historical baseline season weighting: 60/30/10.
2026 Week 1 plan: **2026 10% / 2025 55% / 2024 25% / 2023 10%**.

Missing historical evidence must NOT amplify current-season weight.

Brian Branch diagnostic: 2025 = 169 qualifying points / 12 qualifying games = 14.0833 PPG. The prior bug-like behavior divided qualifying points by total appearances. Never fix Branch specifically.

## COMPLETED CURRENT AUDITS — DO NOT REPEAT

Season-weight amplification population audit passed:
- offense: 452 players, 0 amplified
- IDP: 1030 players, 0 amplified
- max amplification = 1 for both

Stored-season PPG/qualification audit passed:
- 3,844 rows
- 1,514 players
- 0 PPG mismatches
- 0 qualification mismatches
- 0 offense mismatches
- 0 IDP mismatches

Meaning: valuation arithmetic is correct **given stored season aggregates**. It does not prove those aggregates were built from the correct raw player-games.

## EXACT CURRENT TASK

The **raw player-game qualification audit is complete and clean** on workflow run `35059817028` (head `bd71cf89f668be4052977b88a9f464e13d7d1f6f`): 120,503 player-games, offense 20,892 qualified / 0 aggregate mismatches, IDP 22,762 qualified / 0 aggregate mismatches, and every year 2023–2026 has 0 aggregate mismatches. The audit excludes Sleeper TEAM_/DEF/DST pseudo-player rows after the validated audit-only fix `bd71cf8`.

Resume with **population-wide post-Week-1 model validation and consumer regression**. Validate IDP consensus vs production vs context/final curve, confirm offense remains sane under the same clean scoring foundation, then validate canonical Value/rank propagation through Finder and Evaluator. Do not tune toward the pre-Week-1 snapshot; Week 1 is legitimate evidence at its documented weight. Use the <=2:00 AM 9/15 snapshot only as a diagnostic reference.

V73 systemic recalibration selected from population diagnostics: center/width `2050/300 -> 250/150`, and the broad young EDGE/LB emerging .55 shield requires evidence >= .20. This is systemic, not player-specific. It was validated diagnostically before production change.

### Completed raw audit details

The prior raw-audit task is complete.

Audit script:
`scripts/audit-qualified-player-games.mjs`

Purpose: independently rebuild 2023–2026 qualifying player-games using >=20% snaps OR >=8 league fantasy points, then compare rebuilt:
1. qualifying game counts
2. qualifying fantasy points
3. resulting season PPG inputs

against stored season aggregates, offense and IDP separately.

Relevant commits:
- `7f00c1b` game-level qualification audit
- `172b220` archive required audit inputs
- `a4bed2a` require archived player metadata

Fresh importer run already succeeded:
- workflow run `35053935366`
- head `a4bed2af9ec550f9d2ce627aa9271d44689ccc41`
- manifest `2026-09-16T04:00:59.817Z`
- current season 2026 / completed week 1
- scoring settings archived
- qualification rule archived
- `players.json` exists and workflow verified it is non-empty

A connector may return blank content for large `players.json`; do not infer the file is empty.

### Resume here

Inspect only the raw/stat/player files required by the audit, run/validate the audit, and report offense/IDP population results. If mismatches exist, first prove the audit is comparing equivalent definitions, then identify the systemic importer/aggregation cause. Fix once, re-import, rerun. Require a clean raw-game audit before IDP calibration.

## IMPORTANT RECENT CONTEXT

Many IDPs appear too low, and the user is concerned offense could share scoring/weighting defects. Do not calibrate IDP or offense until the raw-game foundation is proven clean.

Diagnostic players include Brian Branch, Nick Bosa, Greg Rousseau, Maxx Crosby, T.J. Watt, and Aidan Hutchinson. They are tests, never tuning targets. Rousseau/Watt 2026 Week 1 league scores were confirmed accurate.

The bad Value period beginning around 2:07 AM ET 9/15 was caused by incorrect consensus data. For counterfactual reference, use the latest valid Value History point **at or before 2:00 AM ET 9/15/2026**; never use the deleted 2:07 point or anything later.

## TRADE / FINDER CONTRACT TO RETAIN

Trade Finder and Trade Evaluator use the same canonical Values and fairness concepts, while remaining separate flows.

Fairness compares canonical asset Values plus trade-only Value Adjustment. Current adjustment philosophy is continuous centerpiece proximity/consolidation: premium centerpiece vs fragmented depth can justify more adjustment; similarly premium assets reduce it. Do not revive player-specific or crude top-10-only logic.

Finder generates recommendations and may use roster need, partner fit, team direction and diversity to order valid trades. Those factors do not change economic Value/fairness.

Finder controls/behavior to preserve:
- YOUR TEAM, SEARCH PLAYER, SELECT ALL
- ANY/QB/RB/WR/TE/IDP target filters
- specific positions clear ANY; ANY clears specifics
- searching must not erase prior selections
- search/checkbox/internal selection state stays synchronized
- “Add assets if needed” off = selected outgoing assets only
- on = respect selected assets first; add unselected assets only when needed
- no required TE starter, so do not manufacture TE need/scarcity
- no artificial IDP scarcity bonus
- recommendation context may reorder valid trades but not rewrite fairness

A separate Finder compiled-equivalence/positional-rank display issue appeared during scoring work. Keep it isolated from the scoring investigation.

Evaluator must retain canonical Values, fairness/Value Adjustment, team-independent support, and the 1–100 grade.

## TRADE HISTORY / PICKS / VALUE HISTORY

Hindsight = today's canonical Values.
Original Trade Analysis = Values at time of trade. If unavailable, show N/A; never substitute today's Value.
Historical Value Comparison should use actual draft results when available.

Retroactive pick framing is Trade-History-only and must never alter current/future pick valuation.

Current pick ownership comes from Sleeper; never infer ownership from original team.

Value History records canonical Value over time and must never feed current Value/Finder/Evaluator. It must remain GitHub-persistent across Netlify redeploys/account changes.

## RUNTIME DISCIPLINE

At this handoff, root activation is through `netlify.toml` / `netlify/functions/site-v29.mjs`, but inspect current activation before editing.

App code and `sleeper-data` may come from different branches/snapshots. When browser behavior does not match code, distinguish source commit, workflow, Netlify preview, loaded runtime script, sleeper-data timestamp, and cache/state before making another model change.

## AFTER RAW AUDIT PASSES

Then evaluate remaining IDP/offense model behavior population-wide. For IDP, isolate consensus vs production distribution vs premium events vs confidence vs age/context vs final curve/guardrails before changing the model. Use the <=2:00 AM 9/15 snapshot as a diagnostic reference, not a forced target.

For deeper history only when a specific issue requires it: `docs/FLEECED-MASTER-HANDOFF.md`.

**Operating rule: do not make the output look right; make the underlying system right.**
