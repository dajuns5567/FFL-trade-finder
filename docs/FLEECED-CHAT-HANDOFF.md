# FLEECED! — CHAT HANDOFF

This is the **working handoff for continuing Fleeced development in a new ChatGPT conversation**. It is intentionally similar to the handoff that successfully transferred this project previously: it gives the next chat the project knowledge it needs up front without asking it to rediscover the entire repository.

Repository: `dajuns5567/FFL-trade-finder`
Active working branch at handoff: `fix/idp-week1-systemic-weighting-20260915`
Long-running PR: #382
Production: `main`

For deeper historical detail, `docs/FLEECED-MASTER-HANDOFF.md` exists, but **do not read that entire file at startup**. This file is the normal new-chat handoff. Consult the master only for a specific subsystem if needed.

## HOW TO WORK ON FLEECED

- Active GitHub code is the implementation source of truth.
- This handoff is the behavioral/regression contract and continuation state.
- Before modifying a subsystem, inspect its active implementation and downstream consumers.
- Do not scan/retrieve the entire repository. Fetch only files relevant to the current task.
- Never make player-specific valuation patches, multipliers, exceptions, ID/name checks, or rank corrections. Players are diagnostics only.
- Fix systemic causes at the earliest incorrect layer.
- Never guess unavailable historical data.
- Do not repeat completed audits unless new evidence invalidates them.
- Do not merge/deploy production without explicit permission.
- When told “move forward” / “take the next step,” actually perform the next safe GitHub investigation/change/test instead of only explaining it.

## PROJECT / LEAGUE

Fleeced! is a league-specific dynasty fantasy-football application built around Sleeper data and deployed through Netlify.

League context:
- 32 teams
- dynasty
- Superflex
- PPR
- custom IDP
- two IDP starters
- no required TE starting slot
- tradable future draft picks
- 32 picks per round

Major systems:
- canonical player/pick Value
- overall/positional rankings
- Trade Finder
- Trade Evaluator
- trade fairness / Value Adjustment
- Trade History
- Value History
- draft-pick ownership/projection
- Sleeper historical/current scoring pipeline
- League Hub and historical presentation
- consensus-market inputs

## CORE ARCHITECTURE — DO NOT REGRESS

Think upstream to downstream:

Sleeper/consensus/draft/ownership data
→ game qualification/scoring
→ season aggregates
→ PPG/season weighting
→ production
→ canonical player/pick Value
→ canonical rank
→ trade fairness + trade-only Value Adjustment
→ Finder/Evaluator/History/UI.

There is ONE canonical player/pick Value system. Finder, Evaluator, Rankings, Trade History current-value views, etc. consume it.

Canonical Value determines rank. Do not separately manipulate rank.

Trade Value Adjustment is transaction-only. It may change package fairness, but NEVER changes player Value, rank, pick Value, consensus, PPG, production, or Value History.

Team fit, roster need, partner fit, and Win Now/Balanced/Future Focus may reorder Finder recommendations. They do NOT rewrite canonical Value or canonical fairness.

Do not change Finder because scoring is wrong. Do not change fairness because consensus is wrong. Do not change Value History to fix current Value.

## CURRENT VALUATION MODEL

Offense current intended component split:
- 60% consensus
- 25% production/scoring
- 15% other dynasty context

Do NOT revert to stale 70/18/12 or 65/25/10 descriptions.

IDP current intended component split:
- 40% consensus
- 40% production/scoring
- 20% other IDP dynasty context

40/40/20 is the intended IDP model. If active runtime differs, that is an implementation discrepancy to investigate rather than permission to redefine the model.

IDP scoring must use the league's actual IDP scoring settings, not generic `pts_ppr`.

IDP production has population-relative production/premium-event context. Do not tune individual players to force expected ranks.

## SCORING / PPG RULES

A player-game qualifies for valuation production when:

**snap share >=20% OR league fantasy points >=8**

The operator is OR.

Offense uses offensive snaps.
IDP uses defensive snaps.

A nonqualifying game contributes neither points nor games.

PPG numerator and denominator MUST use the exact same qualifying games.

Historical season:
- requires >=8 qualifying games.

Current active season:
- bypasses the historical 8-game season minimum while active;
- each individual game must still satisfy >=20% snaps OR >=8 fantasy points;
- only completed/finalized NFL weeks enter valuation.

After the season ends, the normal historical >=8 qualifying-game requirement applies.

Important diagnostic example:
Brian Branch 2025 had 169 qualifying points in 12 qualifying games. Correct PPG = 169/12 = 14.0833. The old defective behavior divided qualifying points by total games.

## SEASON WEIGHTING

Historical/offseason baseline:
- latest historical season 60%
- second 30%
- third 10%

2026 Week 1 plan:
- 2026: 10%
- 2025: 55%
- 2024: 25%
- 2023: 10%

Missing historical seasons must NEVER donate their missing weight to the current season. Missing evidence reduces confidence/coverage instead of amplifying Week 1/current-season evidence.

## CURRENT SCORING INVESTIGATION — COMPLETED WORK

Population season-weight amplification audit PASSED:

Offense:
- players 452
- amplified 0
- maxAmplification 1
- zeroHistoryCurrent 45
- incompleteHistoryCurrent 149

IDP:
- players 1030
- amplified 0
- maxAmplification 1
- zeroHistoryCurrent 126
- incompleteHistoryCurrent 416

Both offense and IDP amplified count = 0.

Do not repeat this unless new evidence invalidates it.

Population season-level PPG integrity audit PASSED:

- 3,844 player-season rows
- 1,514 players
- PPG mismatches 0
- qualification mismatches 0
- offense mismatches 0
- IDP mismatches 0

Interpretation: valuation correctly calculates PPG FROM THE STORED SEASON AGGREGATES. It does NOT yet prove the stored aggregates were built from the correct raw qualifying games.

Audit lesson: previous diagnostics themselves produced false failures by using raw `games`/`pts_ppr`, generic IDP PPR, or an incorrect weighting denominator. Validate audits before changing production.

## EXACT CURRENT TASK

The next unresolved layer is the **RAW PLAYER-GAME QUALIFICATION AUDIT**.

Goal: independently reconstruct qualifying player-games for 2023–2026 using:

snap share >=20% OR league fantasy points >=8

Then rebuild:
- qualifying game count
- qualifying fantasy points
- season PPG inputs

Compare those independently rebuilt aggregates against stored season aggregates, offense and IDP separately.

This is specifically intended to catch Branch-type corruption where qualifying points are divided by total games or where the stored season aggregate includes/excludes the wrong raw games.

Audit script:
`scripts/audit-qualified-player-games.mjs`

Relevant commits:
- `7f00c1b` Add game-level qualification audit
- `172b220` Archive inputs required for game qualification audit
- `a4bed2a` Require archived player metadata for scoring audit

The importer was updated because independent reconstruction required archived player metadata and league scoring settings.

Fresh manual importer workflow ALREADY completed successfully:

Run ID: `35053935366`
Head SHA: `a4bed2af9ec550f9d2ce627aa9271d44689ccc41`
Fresh sleeper-data manifest generated: `2026-09-16T04:00:59.817Z`

Verified:
- current season 2026
- completed week 1
- currentLeagueScoringSettings present
- qualification rule .20 snaps / 8 fantasy points / OR
- `players.json` exists
- workflow asserted `players.json` is non-empty

A GitHub connector may return blank content for the large players.json; do not infer it is empty.

### NEXT STEPS, IN ORDER

1. Inspect the fresh sleeper-data snapshot needed by the audit, narrowly.
2. Obtain/process archived players.json.
3. Run/validate `scripts/audit-qualified-player-games.mjs`.
4. Independently rebuild qualifying games and points for 2023–2026.
5. Compare rebuilt game counts AND points against stored aggregates.
6. Report offense and IDP separately.
7. If mismatches exist, validate the audit itself first.
8. Identify the SYSTEMIC importer/aggregation cause.
9. Fix that cause once, not individual players.
10. Re-import and rerun the raw-game audit.
11. Require clean population results before IDP calibration.

Do NOT return to already-cleared season weighting or stored-aggregate PPG arithmetic without new evidence.

## DIAGNOSTIC PLAYERS

Track/use as test cases only:
- Brian Branch
- Nick Bosa
- Greg Rousseau
- Maxx Crosby
- T.J. Watt
- Aidan Hutchinson

Known context:
- Branch exposed wrong denominator behavior.
- Bosa historical PPG looked substantially too low.
- Rousseau and Watt Week 1 league scores were confirmed accurate.
- Many IDPs appear too low population-wide, but calibration is deferred until scoring integrity is proven.
- The user is also concerned the same foundational scoring problems could affect offense; offense has therefore been included in the population audits.

Never tune these players individually.

## CONSENSUS / 9-15 INCIDENT

The bad valuation period beginning around 2:07 AM ET on 2026-09-15 was caused by **incorrect consensus data**, not a natural “Value spike.”

Fix consensus corruption at the consensus/input layer. Do not compensate with production changes, player multipliers, rank manipulation, or Finder changes.

For later counterfactual/reference comparisons, use the latest valid Value History point **at or before 2:00 AM ET on 2026-09-15**.

Do not use the deleted 2:07 AM point or any later point.

This reference is diagnostic; current Values do not have to be forced to match it exactly.

## VALUE HISTORY

Value History records canonical Value over time. It NEVER feeds current Value, rankings, Finder, or Evaluator fairness.

Hard requirement: Value History must remain GitHub-persistent and survive Netlify redeploys/account switches.

Established features include:
- player Value history
- team Value history
- overall Value chart
- rank chart
- player search
- “what’s happening with my team”
- trade events accessible from overall chart data points
- positive changes green / negative changes red
- trades represented as net team-Value events where appropriate

The user previously experienced Value History failure after switching Netlify accounts and explicitly requires durable GitHub persistence.

## TRADE FAIRNESS / VALUE ADJUSTMENT

Finder and Evaluator must use the same canonical player/pick Values and the same fairness architecture.

Raw asset totals remain meaningful.

Value Adjustment is trade-only and handles consolidation/package economics: a true centerpiece may deserve an adjustment when the other side is fragmented depth.

Current philosophy uses **continuous centerpiece proximity**, not player-specific rules and not a crude top-10-only rule.

General direction:
- premium centerpiece vs fragmented depth → larger adjustment
- premium vs similarly premium → smaller adjustment
- mid-tier vs low-tier → smaller adjustment
- low-value packages → progressively less adjustment

Presentation should distinguish:
- RAW ASSET TOTAL
- VALUE ADJUSTMENT
- TRADE-ADJUSTED TOTAL

Older project work discussed a separate Package Quality Penalty. Current runtime direction removed/separated that older mechanism in favor of the active continuous Value Adjustment architecture. Do not silently reintroduce an old package penalty.

## TRADE FINDER

Trade Finder GENERATES recommendations. It consumes canonical Value/fairness and may use recommendation context.

It may consider:
- selected outgoing assets
- desired incoming player
- target positions
- tier direction
- package assistance
- roster need
- team mode
- partner fit
- recommendation diversity
- pick ownership/projection

These recommendation concerns do not create new player Values.

Core controls include:
- YOUR TEAM
- SEARCH PLAYER
- SELECT ALL
- ANY / QB / RB / WR / TE / IDP position targets
- “Add assets if needed”

Specific positions clear ANY; ANY clears specific positions.

“Add assets if needed” unchecked:
- Finder uses only selected outgoing assets.

Checked:
- Finder respects/evaluates selected assets first and may add unselected assets only when needed.

Searching for a player should not erase prior selections. Search/checkbox state should synchronize. Clearing selections should clear internal and visible state.

### Finder recommendation vs fairness

Fairness is economic/package comparison.

Recommendation may additionally use:
- roster need
- partner fit
- Win Now/Balanced/Future Focus intent
- package quality
- diversity

Recommendation context may reorder valid trades but may NOT rewrite canonical fairness.

### Modes

Balanced: balances fairness/context/package quality.

Win Now: leans toward current contributors/current production and roster need.

Future Focus/rebuild: leans toward picks and younger/emerging assets with meaningful Value.

Tier-up/down/acquire-picks behavior exists historically; inspect current runtime before changing routing.

TE is not a required starter in this league, so team-fit logic must not create artificial TE need equivalent to QB/RB/WR.

IDP should not receive artificial scarcity inflation merely because it is a roster category.

### Finder regression isolation

During current scoring work, a separate compiled Finder equivalence/positional-rank display issue appeared. It is unrelated to scoring. Do not alter Finder while completing the raw scoring audit unless dependency evidence proves it is necessary.

## TRADE EVALUATOR

Evaluator must use the same:
- player Values
- pick Values
- canonical fairness
- transaction Value Adjustment

as Finder.

No independent evaluator valuation system.

Keep the 1–100 trade evaluator grade.

Evaluator should clearly show assets, raw totals, Value Adjustment where applicable, adjusted totals, and fairness/grade.

Any-Team global search should synchronize corresponding roster selection/checkbox behavior.

## TRADE HISTORY

Trade History analyzes completed Sleeper trades.

Established compact view:
- date/time
- teams
- traded assets
- player position
- NFL team
- current ranks where appropriate

Major sections:
- Hindsight
- Original Trade Analysis
- Historical Value Comparison

Hindsight and Original Trade Analysis are intended to default collapsed.

### Hindsight
“Looking back on trades with today’s current value.”

Uses TODAY'S canonical Values and today's package analysis.

### Original Trade Analysis
Uses Values AT THE TIME OF TRADE.

If historical player Value is unavailable because the trade predates tracked history, show N/A/unavailable. Never substitute today's Value or guess.

### Historical Value Comparison
Compares at-time value with current outcome.

Historical picks should show actual Sleeper draft results/selections when known, e.g. `2025 3.02`.

### Retroactive draft-pick logic
Trade History only. Never leak this into current/future pick valuation.

Nearest-year framing:
- 2024-season trade → 2025 / 2026 / 2027
- 2025-season trade → 2025 / 2026 / 2027
- 2026-season trade → 2026 / 2027 / 2028

Hindsight and Original Trade Analysis may have different Value Adjustments because they use different temporal Values.

## DRAFT PICKS

Current ownership comes from Sleeper. Never infer ownership from original team alone.

Projection may affect pick quality/value but must not invent ownership.

32 picks per round matters to pick economics.

Current/future pick valuation is separate from Trade History retroactive pick logic.

## RUNTIME / NETLIFY / DATA

The repository contains many historical versioned scripts. File existence does not mean activation.

At the handoff, root routing goes through `netlify.toml` and `netlify/functions/site-v29.mjs`. Always inspect the current loader before editing a versioned file.

Important: app source and scoring data can come from different commits/branches. `/sleeper-data/*` is served from the separate GitHub `sleeper-data` branch.

When a code fix does not appear in the browser, distinguish:
- source commit
- workflow result
- Netlify preview
- active runtime-loaded script
- sleeper-data snapshot timestamp
- browser/cache state

Do not make another model change until those are checked.

## UI / PRESENTATION

Fleeced gold is the main analytical accent. Keep UI compact/readable.

Established preferences include:
- gold analytical bars
- clear outlines
- 0/100 endpoints where applicable
- selected Hindsight/Original buttons gold
- gold team names in Historical Value Comparison
- clear spacing between trades
- prominent total Value
- clean player name / position / NFL team alignment
- redundant “assets received” labels removed
- centered team/value/adjusted-total presentation
- centered Finder labels/controls where already established

Do not regress UI during logic fixes.

## TEST / CHANGE DISCIPLINE

Before a code change:
1. identify the earliest wrong layer
2. inspect active runtime implementation
3. inspect upstream inputs/downstream consumers
4. verify the audit itself
5. make the smallest systemic change
6. run relevant targeted smoke/workflow tests
7. validate the preview/runtime/data version
8. confirm unrelated subsystems remain untouched

Population-wide diagnostics outrank anecdotes.

Do not blindly revert recent scoring commits:
- 1c7ecc0 scoring foundation audit course
- a267106 offense/shared scoring foundation audit
- ae4b734 preserve scheduled Week 1 weight
- 4ac0479 offense 60/25/15
- 50fca2d align offense weighting audit denominator
- 428ab02 population PPG integrity audit
- 8cbca84 canonical stats fields for PPG audit
- 03fd6f4 mirror offense/IDP scoring paths
- 7f00c1b game-level qualification audit
- 172b220 archive audit inputs
- a4bed2a require archived player metadata

## AFTER RAW SCORING PASSES

Do not immediately tune IDPs.

First:
1. recalculate population
2. compare against <=2:00 AM ET 9/15 reference
3. inspect IDP distribution population-wide
4. isolate remaining cause among consensus, production percentile, premium-event treatment, confidence, age/context, component blend, final curve/guardrails
5. test representative IDPs across tiers/ages/roles
6. sanity-check offense
7. make only systemic evidence-supported model changes

Current intended formulas remain:
- offense 60/25/15
- IDP 40/40/20

## FINAL RULE

**Do not make the output look right. Make the underlying system right.**
