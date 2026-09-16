# Fleeced! — Master Project Handoff and Regression Contract

> **Purpose:** This is the durable onboarding document for any future ChatGPT/developer session working on Fleeced!. It records product intent, architectural boundaries, established behavior, historical decisions, known landmines, validation rules, and the exact active work state. It is documentation only and must never be imported by runtime code.
>
> **Critical source-of-truth rule:** This document defines **behavioral invariants and project intent**. GitHub source on the active branch defines the **current implementation**. Before changing any subsystem, inspect the active loader, active implementation, dependencies, tests, workflows, and downstream consumers. Never reconstruct a subsystem from this document alone.
>
> **Conflict rule:** Some older repository notes describe superseded formulas or experiments. When documentation conflicts, prefer (1) explicit recent user decisions captured here, then (2) current active runtime code, then (3) recent subsystem-specific docs, then (4) older historical notes. Do not silently revive stale behavior.

---

## 1. Project identity

**Product:** Fleeced!  
**Repository:** `dajuns5567/FFL-trade-finder`  
**Production branch:** `main`  
**Active working branch at this handoff:** `fix/idp-week1-systemic-weighting-20260915`  
**Long-running PR:** #382  
**Hosting:** Netlify  
**League platform/data:** Sleeper

Fleeced! is a league-specific dynasty fantasy-football application for a 32-team Sleeper league. Major product areas include:

- canonical player and draft-pick valuation
- master overall and positional rankings
- Trade Finder
- Trade Evaluator
- trade fairness and trade-only Value Adjustment
- Trade History
- Value History
- team/league context
- Sleeper roster, transaction, pick, weekly-stat and historical-stat ingestion
- consensus-market ingestion
- draft-pick ownership/projection
- diagnostics and valuation audits
- League Hub / manager / award / historical presentation

The project is mature and layered. Regression prevention is a primary requirement.

---

## 2. Absolute development rules

### 2.1 Never patch individual players

Do not add player-specific multipliers, penalties, bonuses, ID checks, name checks, rank corrections, or hard-coded exceptions to make a result look right.

Players such as Brian Branch, Nick Bosa, Greg Rousseau, Maxx Crosby, T.J. Watt, Aidan Hutchinson, Jaxon Smith-Njigba, Justin Jefferson, etc. may be used as **diagnostic test cases only**.

If a player looks wrong, determine the population-wide/systemic cause.

### 2.2 Fix the earliest incorrect layer

Use this dependency order:

```
Sleeper / consensus / draft / ownership data
        ↓
game qualification and scoring
        ↓
season aggregates
        ↓
PPG and season weighting
        ↓
production component
        ↓
canonical player/pick Value
        ↓
canonical rank
        ↓
trade fairness + trade-only Value Adjustment
        ↓
Finder / Evaluator / Trade History / Value History / UI
```

Never make a downstream screen look correct by corrupting an upstream invariant.

### 2.3 One canonical Value system

There is one authoritative player/pick Value system. Rankings, Finder, Evaluator, current-value Trade History views, League Hub current-value analysis, and other consumers should read canonical Value rather than inventing their own player-value formula.

### 2.4 Canonical Value determines rank

Overall rank must follow canonical final Value. Positional rank must be derived from the same canonical ordering within position.

Do not independently manipulate rank to obtain a desired result.

### 2.5 Trade Value Adjustment is transaction-only

Value Adjustment can modify package fairness. It must never change:

- individual player Value
- player rank
- pick Value
- consensus
- PPG
- production
- Value History

### 2.6 Team fit and intent do not change economic Value

Roster need, team direction, partner fit, Win Now/Future Focus/Balanced context, and recommendation diversity may affect recommendation construction or ordering. They must not rewrite canonical player/pick Value or canonical trade fairness.

### 2.7 Never guess unavailable data

If historical Value, consensus, draft result, pick ownership, or another historical fact is unavailable, report N/A/unavailable. Never substitute today's Value for a missing historical Value.

### 2.8 Validate audits before trusting them

Diagnostics can be wrong. Before changing production because an audit fails, verify that the audit reads the same canonical definitions/fields and compares equivalent concepts.

### 2.9 Keep subsystems isolated

Do not modify Finder because PPG looks wrong. Do not modify fairness because consensus is wrong. Do not modify Value History to repair current Value. Cross subsystem boundaries only after dependency inspection proves it necessary.

### 2.10 Prefer targeted systemic changes

Avoid broad rewrites for local symptoms. Preserve working approved behavior.

### 2.11 No production merge/deploy without explicit permission

Normal instructions such as “move forward,” “take the next step,” or “do it” authorize safe incremental investigation/implementation on the active task, not an unrequested production merge.

---

## 3. League format and context

Established league context:

- 32 teams
- dynasty
- PPR
- Superflex
- IDP included
- two IDP starters
- no required tight-end starting slot
- tradable draft picks
- 32 picks per round
- Sleeper is canonical for current ownership
- pick horizon extends as Sleeper exposes future seasons

Because there are 32 teams, scarcity and pick economics differ materially from typical 10- or 12-team dynasty leagues.

### Scarcity philosophy

Established league-specific scarcity philosophy:

- QB: meaningful/high scarcity
- RB: meaningful scarcity
- WR: meaningful but lower scarcity than QB/RB
- TE: minimal scarcity because there is no required TE slot
- IDP: no artificial scarcity bonus; replacement depth is broad and only a small elite tier should command truly premium Value

An older project note expressed these as approximately QB 15%, RB 15%, WR 10%, TE 2%, IDP 0%. Treat those percentages as historical philosophy unless the active model explicitly uses them.

Team context affects recommendations, not underlying asset Value.

---

## 4. Runtime and activation discipline

The repository contains many historical versioned files. File existence does not mean runtime activation.

At this handoff, `netlify.toml` routes the root to:

`/.netlify/functions/site-v29`

`site-v29.mjs` injects the currently active browser scripts. It currently includes, among others:

- state bridge / value normalization
- TE scoring adapter
- modeled player values
- nonblocking consensus
- partner fit
- style and win-now preference layers
- pick display sync
- specific-player/tier-up/add-assets/max-value routers
- compiled Trade Finder/runtime
- Any-Team evaluator
- selected-position guard
- candidate guard
- canonical trade UI/presentation
- recommended-pick ownership
- methodology
- Value History
- presentation/home
- League Hub

**Before every change, inspect `site-v29.mjs` (or whatever root loader is current) and identify the actual activated version.**

A GitHub commit alone does not prove the browser runs it. Validate:

1. source commit
2. workflow status
3. Netlify preview
4. actual runtime-loaded script
5. data snapshot/runtime source

---

## 5. Canonical valuation architecture

The active scoring/valuation work is currently centered in `valuation-idp-v21.js`, but always inspect the loader and overrides before assuming this remains authoritative.

Important current concepts/functions include:

- `statObj24(row)`: normalize a stats row
- `statNumber24(stats,key)`: read scoring stat with aliases/fallbacks
- `games24(row)`: canonical qualifying-game count accessor
- `activeScoring24()`: active league scoring settings
- age/context helpers
- `consensus24(id)`
- `detail24(id)`
- `historyPlan24()`
- `scoreSeason24(id,year,weight,kind)`
- `realScore24(id,kind)`
- population distributions
- IDP/offense production components
- dynasty context components
- `model24(...)`
- `masterRankings()`
- `playerRankValue(asset)`
- `baseValue(asset)`

Consumers should not duplicate these calculations.

---

## 6. Current offensive valuation

**Current explicit user-approved executable component split:**

- 60% consensus
- 25% scoring / production
- 15% other offensive dynasty context

The prior 70/18/12 formula is superseded. Older docs may also mention 65/25/10; that is stale relative to the explicit current decision.

Current executable form in the active scoring branch is:

`value = .60 * consensus + .25 * productionValue + .15 * otherContext`

Current code also uses consensus-relative guardrails/clamps. Do not casually remove them during scoring work.

Offensive players without usable consensus may fall back to the legacy valuation path. Inspect exact active behavior before changing fallback handling.

Do not recalibrate 60/25/15 merely because selected players look surprising. Verify raw game qualification, season aggregates, PPG, weighting, production, consensus, and context first.

---

## 7. Current IDP valuation

**Current active component split:**

- 50% consensus
- 35% production
- 15% other IDP dynasty context

Older docs may mention 40/40/20. That is stale for the active branch.

IDP production uses the actual league IDP scoring settings, not generic `pts_ppr`.

Current production architecture includes population-relative PPG treatment plus premium-event treatment. In the active branch, the raw production percentile blend is approximately:

- 84% overall IDP PPG percentile
- 16% premium-event percentile

Confidence pulls incomplete evidence toward the population midpoint.

Do not tune this because a few individual IDPs look wrong. Complete the scoring-data audit first.

---

## 8. League IDP scoring

The project has historically documented the user's league IDP scoring as:

- IDP touchdown: 10
- sack: 4.5
- QB hit: 2.5
- tackle for loss: 2.5
- blocked punt / FG / PAT: 5
- interception: 9
- interception return yards: 0.1/yard
- fumble recovery: 7.5
- fumble return yards: 0.1/yard
- forced fumble: 7.5
- safety: 5
- assisted tackle: 0.5
- solo tackle: 1
- pass defended: 6

Combination scoring applies. A sack may also score TFL and QB-hit points; an interception may also score pass-defended points.

**Runtime rule:** use the current Sleeper league `scoring_settings` as canonical when available. Do not hard-code historical documentation over live league settings.

---

## 9. Player-game qualification — critical invariant

A player-game counts for valuation production when:

**snap share >= 20% OR league fantasy points >= 8**

Operator is **OR**.

Use the appropriate phase:

- offensive players → offensive snaps
- IDPs → defensive snaps

A nonqualifying game contributes:

- zero points to the production numerator
- zero games to the PPG denominator

The numerator and denominator must come from the **same exact qualifying game set**.

### Brian Branch diagnostic

The prior denominator defect was illustrated by Brian Branch's 2025 season:

- 169 qualifying fantasy points
- 12 qualifying games
- correct PPG = 169 / 12 = 14.0833

The defective behavior divided qualifying points by 17 total games.

Never divide qualifying points by total NFL appearances when only a subset of games qualify.

---

## 10. Season qualification and current-season behavior

Historical season:

- requires at least 8 qualifying player-games

Current active season:

- historical 8-game season minimum is bypassed while the season is active
- individual games still must satisfy >=20% snaps OR >=8 league fantasy points
- only finalized/completed NFL games/weeks may enter valuation
- do not update production from mid-game/incomplete data

After Week 18 / season completion, the current-season exception ends and the just-finished season becomes historical, subject to the same 8-game minimum.

The current season must be determined dynamically from Sleeper, not hard-coded.

---

## 11. Production season weighting

Historical/offseason baseline:

- most recent qualifying historical season: 60%
- second: 30%
- third: 10%

At Week 1 of the 2026 season:

- 2026 = 10%
- 2025 = 55%
- 2024 = 25%
- 2023 = 10%

As the current season advances, current-year weight rises under the importer/weight-plan policy; historical shares decline proportionally.

### Missing-evidence invariant

Missing historical seasons must **not donate weight to the current season**.

If Week 1 is scheduled at 10%, it must not become effectively 28%, 50%, or 100% merely because historical samples are missing.

Missing evidence lowers confidence/coverage. It does not amplify current-season evidence.

Be careful with older `docs/sleeper-importer.md` wording that says consumers may “renormalize only across available qualifying historical seasons.” The current resolved invariant is more specific: historical handling may redistribute the historical bucket where appropriate, but the current-season scheduled share must never be amplified by missing history.

---

## 12. Current scoring investigation — completed checkpoints

### 12.1 Population season-weight amplification audit — PASSED

Final clean result:

Offense:
- players: 452
- amplified: 0
- maxAmplification: 1
- zeroHistoryCurrent: 45
- incompleteHistoryCurrent: 149

IDP:
- players: 1030
- amplified: 0
- maxAmplification: 1
- zeroHistoryCurrent: 126
- incompleteHistoryCurrent: 416

`offenseAmplifiedCount = 0`  
`idpAmplifiedCount = 0`

Do not reopen this stage without new evidence.

### 12.2 Population season-level PPG audit — PASSED

Final clean result:

- rows: 3844
- players: 1514
- PPG mismatches: 0
- qualification mismatches: 0
- total mismatches: 0
- offense mismatches: 0
- IDP mismatches: 0

This proves that **given the stored season aggregates**, valuation calculates season PPG and season inclusion consistently.

It does **not** prove those aggregates were built from the correct raw weekly player-games.

---

## 13. Diagnostic lessons from the current investigation

Several audits were initially wrong:

1. An early PPG audit read `raw.games` / `raw.pts_ppr` directly while valuation used canonical normalized accessors. This generated thousands of false mismatches.
2. An early IDP audit used `pts_ppr` while canonical IDP scoring reconstructs points from league IDP categories. This generated 1,276 false IDP mismatches.
3. An early offense weighting audit measured current share relative to available evidence rather than the actual scoring denominator, falsely reporting 149 amplified offensive players after the underlying fix was already working.

**Rule:** when an audit fails, validate the audit definition before changing production.

---

## 14. Exact active task — raw player-game qualification audit

This is the precise current stopping point.

Goal: independently reconstruct every qualifying player-game for 2023–2026 using:

**snap share >=20% OR league fantasy points >=8**

Then independently rebuild:

- qualifying game count
- qualifying fantasy points
- season PPG inputs

and compare those against stored season aggregates.

This is the population-wide test for Branch-type numerator/denominator corruption.

### Audit work already added

`scripts/audit-qualified-player-games.mjs`

Relevant commits:

- `7f00c1b` — Add game-level qualification audit
- `172b220` — Archive inputs required for game qualification audit
- `a4bed2a` — Require archived player metadata for scoring audit

The archive initially lacked:

- player metadata
- league scoring settings in manifest

The importer was changed to archive both.

### Fresh importer run already completed

GitHub Actions run:

`35053935366`

Branch:

`fix/idp-week1-systemic-weighting-20260915`

Head SHA:

`a4bed2af9ec550f9d2ce627aa9271d44689ccc41`

Result:

**SUCCESS**

Fresh sleeper-data manifest generated:

`2026-09-16T04:00:59.817Z`

Verified at handoff:

- current season = 2026
- completed week = 1
- league scoring settings present
- qualification rule stored as .20 snap share / 8 fantasy points / OR
- `players.json` exists
- workflow verified `players.json` is non-empty

A connector fetch of the large `players.json` returned blank content. Do not infer that the file is empty; GitHub metadata exists and the workflow explicitly passed a non-empty-file assertion.

### Exact next action

1. Inspect the fresh `sleeper-data` snapshot.
2. Obtain/process archived `players.json`.
3. Execute and validate `scripts/audit-qualified-player-games.mjs`.
4. Rebuild qualifying player-games independently for 2023–2026.
5. Compare both rebuilt qualifying-game counts **and rebuilt qualifying points** against stored aggregates.
6. Report offense and IDP separately.
7. If mismatches exist, inspect the population pattern.
8. Validate the audit itself before modifying production.
9. Identify the systemic importer/aggregation cause.
10. Fix that cause once.
11. Re-import.
12. Rerun the population audit.
13. Require clean raw-game qualification before IDP model calibration.

Do not repeat the already-cleared weighting or season-level PPG audits unless new evidence invalidates them.

---

## 15. Sleeper scoring/import pipeline

Important current files:

- `scripts/import-sleeper-history.mjs`
- `netlify/functions/ppr-scoring.mjs`
- `netlify/functions/sleeper-history-live.mjs`
- `netlify/functions/sleeper-imported-history.mjs`
- `netlify/functions/sleeper-production.mjs`
- `.github/workflows/import-sleeper-history.yml`

Published archival snapshot branch:

`sleeper-data`

Important data:

- `data/sleeper/manifest.json`
- `data/sleeper/weight-plan.json`
- `data/sleeper/players.json`
- yearly weekly stats
- qualified weekly stats where present
- yearly season stats
- league-audit data

Important scoring functions in `ppr-scoring.mjs` include concepts such as:

- standard PPR reconstruction
- row normalization
- weekly aggregation
- `leagueFantasyPoints()`
- `playerSnapShare()`
- `qualifiesCurrentSeasonGame()`
- game-slot/finality classification
- latest fully completed week
- valuation-eligible current-season weeks

The importer is read-only relative to live roster ownership. Historical valuation data must not mutate the canonical current Sleeper roster state.

---

## 16. Consensus architecture and the 9/15 incident

Consensus is an upstream canonical valuation input.

Relevant server-side modules include:

- `consensus-composite.mjs`
- `consensus-composite-v2.mjs`
- `consensus-composite-v3.mjs`
- `consensus-adapters.mjs`
- `consensus-source-overrides.mjs`
- source-specific adapters/probes for KTC, DraftSharks, FanRanked, IDP sources, etc.

Consensus sources used historically include FantasyPros, DraftSharks, KTC, FanRanked, The IDP Show, RotoWire IDP, and other wired feeds.

### Critical terminology

The 2026-09-15 incident was caused by **incorrect consensus data**.

Do not describe it merely as a natural “Value spike.”

Fix consensus corruption at the consensus/input layer. Do not compensate with player-specific valuation tuning, rank manipulation, Finder changes, or arbitrary production changes.

---

## 17. Last-known-good Value reference

For counterfactual/reference comparisons related to the 9/15 incident:

Use the latest available Value History point **at or before 2:00 AM ET on 2026-09-15**.

Do not use 2:07 AM or any later point.

There was prior confusion and accidental deletion of more history than intended. Do not invent a version number such as “v288” as the baseline.

The baseline is time-based:

**latest valid snapshot <= 2:00 AM ET 2026-09-15**

Use this as a diagnostic counterfactual, not an automatic requirement that current Values exactly reproduce the old snapshot.

---

## 18. Reference players for scoring/model diagnostics

Use these as tests, never tuning targets:

- Brian Branch
- Nick Bosa
- Greg Rousseau
- Maxx Crosby
- T.J. Watt
- Aidan Hutchinson

Known observations:

- Branch exposed the qualifying-points/wrong-denominator issue.
- Bosa's historical PPG looked materially too low and helped reveal broader scoring concerns.
- Rousseau's Week 1 score was confirmed accurate even when his Value looked too high.
- T.J. Watt's Week 1 score was confirmed accurate.
- Maxx Crosby had prior explanations that misstated his Value; do not rely on those explanations.
- Hutchinson is useful as a stable high-end comparison.

Population integrity comes first.

---

## 19. Value History

Value History is a descriptive historical record of canonical Value over time.

It must never feed:

- current player Value
- current rankings
- Trade Finder
- Trade Evaluator fairness

Hard durability requirement:

**Value History must remain GitHub-persistent and survive Netlify redeploys, Netlify account switches, application rebuilds, and code deployments.**

The user previously experienced history failure after a Netlify account switch and explicitly requires this not to recur.

Established behavior includes:

- player Value history
- team Value history
- overall Value chart
- rank chart
- player search
- “what’s happening with my team”
- trade events accessible from chart points
- positive changes presented positively/green
- negative changes presented negatively/red
- trades represented as net team-Value events where appropriate

Relevant current runtime includes `value-history-v276.js`, `value-history-ui-defaults-v386.js`, Netlify Value History functions, and archive/headless-refresh workflows. Inspect active code before modification.

Value History records what Value was. It does not determine what Value is.

---

## 20. Draft-pick valuation and ownership

Draft picks are canonical trade assets.

Rules:

- current ownership comes from Sleeper
- never infer ownership from original team alone
- projection context may affect pick quality/value
- projection must never invent/change ownership
- 32 picks per round materially affects pick economics
- pick Value depends on established year/round/projected-slot model
- Finder filters constrain eligible picks but do not revalue them
- current/future pick valuation is separate from historical retroactive Trade History logic

Current display/value code includes `draft-pick-values-v138.js` and normalization/projection layers. Inspect current active normalization before editing.

---

## 21. Trade fairness — architectural contract

Trade fairness compares packages using canonical asset Values and transaction-only adjustment.

Finder and Evaluator must share the same fairness framework for the same package inputs.

Trade History current/historical analyses should use the same conceptual fairness framework applied to the appropriate temporal Values.

Raw totals remain visible and meaningful.

Do not create a separate player-value currency inside fairness.

### Historical vs current implementations

The repo contains older fairness/engine files (`trade-fairness-v93.js`, `trade-engine-v94...v99.js`) and newer compiled runtime logic.

**Do not assume an older readable engine is active. Inspect the current compiled/runtime path.**

At handoff, the compiled runtime contains its own `fair()` / `adjustment()` logic and presentation.

---

## 22. Value Adjustment / consolidation logic

Value Adjustment exists because additive raw Value does not fully represent consolidation into a true centerpiece.

Established philosophy:

- premium centerpiece vs fragmented depth → stronger adjustment
- premium vs similarly premium → much smaller adjustment
- mid-tier vs low-tier → smaller adjustment
- low-value packages → progressively less adjustment

Current philosophy is **continuous centerpiece proximity**, not a hard top-10-only rule and not player-specific exceptions.

Potential inputs include:

- stronger centerpiece Value
- opposing package's strongest-asset proximity
- package fragmentation
- elite counter-pressure

But Value Adjustment is trade-only.

Presentation should distinguish:

- RAW ASSET TOTAL
- VALUE ADJUSTMENT
- TRADE-ADJUSTED TOTAL

Never replace an individual's canonical Value with adjusted trade Value.

---

## 23. Package Quality Penalty — historical decision, currently superseded in active runtime

Older project memory documents a separate **Package Quality Penalty** intended to prevent stacks of weak assets from buying a materially better centerpiece merely because raw Values add up.

Historical principles included:

- trade-only
- no effect on individual Value/rank
- aimed at multi-piece weak-depth consolidation
- distinct from Value Adjustment
- visible in Finder/Evaluator when active
- behavioral tests such as low-ranked-player bundles vs Jadarian Price/Parker Washington

However, **the current compiled runtime explicitly states that package penalty is not used / has been removed**, and the active V98/V99-era direction consolidated package economics into continuous Value Adjustment.

Therefore:

- do not silently reintroduce Package Quality Penalty
- preserve the historical rationale as context
- if the user asks to revisit weak-package economics, inspect current Value Adjustment first
- any reintroduction would be a deliberate model change requiring explicit analysis, not a regression fix

This is an example of why old `PROJECT-MEMORY.md` must not override active runtime/current decisions.

---

## 24. Trade Finder — purpose and boundaries

Trade Finder constructs recommendations. It consumes canonical Values/fairness and may add recommendation context.

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

It must not invent independent player Values.

### Core controls

Established controls include:

- YOUR TEAM
- SEARCH PLAYER
- SELECT ALL
- position targets: ANY / QB / RB / WR / TE / IDP
- “Add assets if needed”

Specific positions clear ANY. Selecting ANY clears specific positions.

### Add assets if needed

Unchecked:
- only selected outgoing assets may be used

Checked:
- selected-only packages should be evaluated/respected first
- Finder may add unselected assets only when needed

Do not casually displace valid selected-only recommendations with unrelated packages.

### Search/selection persistence

Searching locates assets; it should not erase previous selections.

Selecting A, then searching/selecting B, should leave A selected.

Removing a searched selection should synchronize the corresponding checkbox.

Clear selections/trade should clear both visible and internal selection state.

Finder and Evaluator should behave consistently.

---

## 25. Finder recommendation vs fairness

These are separate concepts.

**Fairness:** economic/package comparison based on canonical Values and transaction-only adjustment.

**Recommendation:** may additionally use team fit, roster need, partner fit, team intent, package quality, and diversity.

Recommendation context may reorder otherwise valid trades. It must not rewrite canonical fairness.

Older readable V99 logic used a candidate score approximately:

- 67% fairness
- 13% partner/team fit
- 20% intent

Do not assume those exact percentages remain authoritative. The current compiled runtime at handoff contains different recommendation weighting in at least one path (e.g. a heavily fairness-weighted recommendation). Inspect active runtime before changing.

---

## 26. Finder modes and intent

Established concepts include:

### Balanced
Balances fairness, roster need, context, and package quality.

### Win Now
Prefers current contributors/current production and appropriate roster needs. Future picks may be penalized in recommendation ordering.

### Future Focus / rebuild
Prefers picks and younger/emerging assets with meaningful Value.

These affect recommendation ordering, not canonical Value.

Historical “I’m trying to…” modes also included fair trade, tier up, tier down, and acquire draft picks. Inspect current UI/runtime to determine which are still active and how routing works.

### Tier up
Consolidates outgoing Value into a better centerpiece. Must not let weak filler manufacture unrealistic buying power.

### Tier down
Moves a stronger asset for a less-premium centerpiece plus additional value where appropriate.

### Acquire draft picks
When active, incoming packages should respect selected year/round constraints and actual Sleeper ownership. Large pick packages may be valid when ownership/fairness support them; do not impose arbitrary caps unless active product logic explicitly does.

---

## 27. Finder breadth, diversity, and pagination

Established expectations:

- broad searches should generate a meaningful candidate pool when legitimate trades exist
- recommendations should vary partners/package structures rather than trivially duplicate one trade
- blank-selection Finder behavior historically aimed to vary outgoing assets rather than repeatedly use one player
- current desired presentation has commonly shown 5 recommendations initially with “Load more” revealing additional results in groups of 5
- Load More is presentation only and must not loosen fairness
- sorting/fairness standards remain identical for later results

The repository includes many specialized diversity/specific-player/tier-up/add-assets smoke tests. Run relevant tests before changing Finder.

---

## 28. Finder regression warning from current scoring work

During the scoring investigation, a separate Finder compiled-equivalence workflow failure appeared involving positional-rank display behavior.

It was unrelated to the scoring change.

Do not mix that Finder issue into the raw scoring/valuation investigation.

When returning to Finder, inspect and diagnose it as a separate subsystem task.

---

## 29. Trade Evaluator

Trade Evaluator must use the same:

- canonical player Values
- canonical pick Values
- fairness framework
- transaction Value Adjustment

as Finder.

It must not maintain an independent valuation system.

Evaluator presentation should communicate:

- assets each side receives
- raw totals
- Value Adjustment when applicable
- adjusted totals
- fairness/grade

The user wants the 1–100 trade evaluator grade retained.

The Any-Team evaluator's global player search should synchronize the corresponding roster checkbox/selection.

Inspect the currently activated evaluator version before editing; at handoff `trade-evaluator-any-team-v184.js` is injected by `site-v29`.

---

## 30. Trade History

Trade History analyzes completed Sleeper trades. It is distinct from Finder generation.

Established compact view behavior:

- date/time
- teams
- traded players/assets
- player position
- NFL team
- current overall/positional rank where appropriate

Established team heading style:

**TEAM NAME RECEIVES**

with “Receives” on the same line where the active design supports it.

Major analytical sections:

- Hindsight
- Original Trade Analysis
- Historical Value Comparison

Hindsight and Original Trade Analysis have been intended to default collapsed/closed.

Current Trade History functionality is intertwined with League Hub / Value History services; inspect active runtime before changing.

---

## 31. Hindsight

Definition:

**“Looking back on trades with today’s current value.”**

Hindsight uses today's canonical Values.

It may apply today's transaction fairness/Value Adjustment concepts.

It must not rewrite historical Values.

Current outcome presentation should clearly distinguish team, current Value, and trade-adjusted total where applicable.

---

## 32. Original Trade Analysis

Former name: Trade Evaluator Analysis  
Current established name: **Original Trade Analysis**

This evaluates the transaction using Values available **at the time of the trade**.

If historical player Value is unavailable because the trade predates tracked history:

- show N/A/unavailable
- explain that the trade predates historical Value tracking
- do not substitute today's Value
- do not guess

Original Trade Analysis and Hindsight may legitimately produce different adjustments because they use different temporal Value snapshots.

---

## 33. Historical Value Comparison

Compares:

- AT TIME OF TRADE
- CURRENT OUTCOME

Established UI direction includes Fleeced gold team names.

Historical draft picks should show what actually happened to them when Sleeper draft results are available, including exact selections such as:

`2025 3.02`

If a pick became a player, connect it to the actual selected player. Never guess missing draft results.

---

## 34. Retroactive draft-pick logic — Trade History only

Historical retroactive pick framing must never leak into current/future pick valuation.

Established nearest-year framing:

For a 2024-season trade:
- 2025 nearest
- 2026 second
- 2027 third

For a 2025-season trade:
- 2025 nearest
- 2026 second
- 2027 third

For a 2026-season trade:
- 2026 nearest
- 2027 second
- 2028 third

Historical picks should be tied to actual drafted players/selections where data exists.

The nearest-year retroactive frame may be hidden from UI while logic remains active.

---

## 35. Trade History Value Adjustment

Hindsight:
- uses today's Values

Original Trade Analysis:
- uses at-time Values

Therefore the same historical transaction can legitimately receive different trade-only adjustment amounts under Hindsight vs Original Trade Analysis.

Do not force them to match.

Use the same systemic centerpiece-proximity philosophy appropriate to the temporal Values being analyzed.

---

## 36. League Hub

`league-hub-v451.js` is a large active presentation/analytics layer at handoff.

It includes or interacts with:

- trade history
- weekly reports
- draft history
- manager profiles/history
- awards/rankings
- broadcast/archive presentation
- current Value-based trade hindsight
- Value History navigation
- historical/retroactive pick context

Because League Hub consumes canonical Value and historical data, do not casually embed new valuation logic there.

When current-value analysis is shown, it should consume canonical normalization.

Historical analysis must respect historical-data availability and retroactive-pick boundaries.

---

## 37. Team context / partner fit

Team context is recommendation logic, not valuation logic.

Finder may consider:

- contender/retool/rebuild/purgatory status
- expected wins/playoff outlook where available
- actual roster construction
- positional depth
- relative league strength
- whether outgoing assets leave dangerous holes
- whether the partner has a reason to accept

Important league-specific rule:

**TE is not a required starter.** Do not generate TE need pressure equivalent to QB/RB/WR.

Current partner-fit code explicitly gives TE no required starter slot and treats TE more as a flex asset.

IDP may matter to roster fit, but do not inflate IDP Value through scarcity.

---

## 38. UI / presentation contract

Brand:

**Fleeced!**

Gold is the primary analytical accent. Keep it restrained and readable.

Established preferences include:

- gold analytical bars
- visible outlines
- 0/100 endpoints where applicable
- selected Hindsight/Original Trade Analysis buttons gold
- gold team names in Historical Value Comparison
- compact layouts
- clear spacing between trades
- prominent total Value
- clean player name / position / NFL team alignment
- centered team/value/adjusted-total presentation
- redundant “assets received” labels removed
- Finder YOUR TEAM / SEARCH PLAYER / SELECT ALL labels centered around their controls

The approved logo historically uses a comic speech-bubble treatment with yellow text/black outline and a transaction-style double arrow. Do not touch logo/theme during unrelated logic work unless requested.

---

## 39. Historical Finder/package experiments that must not be mistaken for current requirements

Older `PROJECT-MEMORY.md` contains substantial V115-era backlog and Package Quality Penalty design. Preserve it as project history, but do not assume it is active.

Examples of historical test cases include:

- Jadarian Price for Malik Benson + Barion Brown + Khalil Herbert
- Parker Washington for a weak three-player package
- Chuba Hubbard broad-search candidate generation
- select-all controls
- some-vs-all selected asset modes
- explicit excluded assets
- large pick-package support

Before implementing any of these from old notes, inspect current runtime and ask whether the requirement remains pending/current if not already resolved.

---

## 40. Current known valuation concern after scoring is cleared

The user has observed that many IDPs appear too low, while earlier some were far too high.

Do not calibrate IDP until raw player-game qualification is proven clean.

After raw qualification passes:

1. recalculate the full population
2. compare against the last-known-good <=2:00 AM ET 9/15 reference
3. audit IDP distribution population-wide
4. determine whether remaining discrepancy comes from:
   - consensus
   - PPG distribution
   - premium-event percentile
   - confidence
   - age/context
   - component blend
   - final curve/guardrails
5. test representative IDPs across tiers/ages/roles
6. sanity-check representative offense
7. make only systemic model changes supported by population evidence

The historical reference is diagnostic, not a mandatory target.

---

## 41. Offensive regression concern

The same scoring/weighting foundation feeds offense, so the user correctly required offense to be audited too.

Results so far:

- season-weight amplification: clean
- season-level PPG arithmetic: clean

Do not assume offense is fully cleared until raw game qualification is independently proven.

Current offense component formula remains **60/25/15**.

---

## 42. Known browser audit helpers

Current valuation code has included helpers such as:

- `idpScoringAudit(nameOrId)`
- `offenseScoringAudit(nameOrId)`
- `offenseScoringFoundationAudit(nameOrId)`
- `scoringFoundationPopulationAudit()`
- `ppgIntegrityPopulationAudit()`
- `idpPpgQualificationAudit(nameOrId)`
- `idpPpgQualificationAuditSet(names)`
- `idpWeek1CounterfactualAudit(...)`
- `idpDistributionAudit()`
- `idpWeek1ScoringAudit(...)`
- `idpWeightingAudit()`

Inspect current source before assuming exact signatures.

Prefer population-wide diagnostics before interpreting individual anecdotes.

---

## 43. Recent scoring/integrity commits and why they exist

Recent branch history includes:

- `1c7ecc0` — Document scoring foundation audit course
- `a267106` — Add offense and shared scoring foundation audit
- `ae4b734` — Preserve scheduled Week 1 weight across offense and IDP
- `4ac0479` — Set offense value components to 60/25/15
- `50fca2d` — Align offense weighting audit with scoring denominator
- `428ab02` — Add population PPG integrity audit
- `8cbca84` — Fix PPG audit to use canonical stats fields
- `03fd6f4` — Make PPG audit mirror offense and IDP scoring paths
- `7f00c1b` — Add game-level qualification audit
- `172b220` — Archive inputs required for game qualification audit
- `a4bed2a` — Require archived player metadata for scoring audit

Do not blindly revert these. Read them in context.

---

## 44. Workflow/testing discipline

Relevant workflows include:

- IDP scoring smoke
- Finder runtime smoke
- Sleeper history importer
- Value History archive/headless refresh
- consensus/source diagnostics
- League Hub syntax diagnostics

Relevant smoke tests cover:

- compiled Finder runtime
- selected positions
- select-all behavior
- specific-player routing
- tier-up routing
- add-assets
- family diversity
- value-adjustment monotonicity/calibration
- TE scoring adjustment
- Value History data hub
- offense consensus coverage
- IDP Week 1 weighting

Before changing a subsystem, locate and run its relevant tests. A passing unrelated workflow does not prove the target behavior.

---

## 45. Netlify/data separation

`netlify.toml` redirects:

`/sleeper-data/*`

to raw GitHub content on the separate `sleeper-data` branch.

Therefore app code and valuation data can come from different commits/branches.

When code appears fixed but browser Values do not change, inspect:

- preview commit
- root loader
- runtime script query/version
- sleeper-data manifest timestamp
- data redirect
- browser cache/state

before making another model change.

---

## 46. Persistence and reproducibility

Durable state should live in GitHub-backed storage where appropriate.

Do not move persistent Value History back to ephemeral Netlify-only storage.

Long-term reproducibility ideally includes enough snapshot information to recover:

- effective league state
- pick ownership
- consensus-source state/timestamps or hashes
- scoring settings
- weight plan
- valuation configuration/version

Do not confuse reproducibility work with valuation changes.

---

## 47. How to respond to “move forward” / “take the next step”

When the user says “move forward,” “take the next step,” “do it,” etc.:

- actually inspect/implement/test the next safe step using available tools
- take multiple low-risk investigative steps when appropriate
- do not repeatedly ask permission for ordinary branch-level debugging
- do not merely narrate a plan when you can execute it

Stop before:

- production merge/deploy without explicit authorization
- destructive data action without authorization
- guessing unavailable data
- broad cross-subsystem rewrite unsupported by diagnosis

---

## 48. Before every code change — regression checklist

Ask:

1. What is the earliest incorrect layer?
2. Is the evidence population-wide or anecdotal?
3. Could the audit itself be wrong?
4. What active runtime actually owns this behavior?
5. What are its upstream inputs?
6. What downstream consumers could regress?
7. Am I introducing a player-specific exception?
8. Am I creating a second Value/fairness system?
9. Is there an existing canonical function I should reuse?
10. Which smoke/workflow tests cover this?
11. Is the Netlify preview actually running this commit?
12. Is the browser reading the expected sleeper-data snapshot?
13. Does this preserve current Finder/Evaluator/History/Value History boundaries?
14. Does this preserve historical data rather than overwrite it?
15. Am I changing only what the diagnosis justifies?

---

## 49. New-chat startup procedure

A new development chat should begin by:

1. reading this document in full
2. checking the current branch/PR state
3. reading the current root loader (`netlify.toml` and active site function)
4. inspecting only the active subsystem files needed for the current task
5. checking recent commits since this handoff was last updated
6. checking relevant workflows/tests
7. resuming the “Exact active task” section rather than restarting already-cleared work

If recent commits conflict with this document, determine whether this document is stale and update it after resolving the discrepancy.

---

## 50. Current exact resume instruction

**Resume at the RAW PLAYER-GAME QUALIFICATION AUDIT.**

Do not repeat the already-cleared season-weight or season-level PPG audits.

Fresh importer run:

`35053935366`

Fresh snapshot generated:

`2026-09-16T04:00:59.817Z`

Required work:

- inspect fresh sleeper-data
- process archived `players.json`
- run/validate the independent game-level audit
- rebuild qualifying games and points for 2023–2026
- compare against stored aggregates
- report offense and IDP separately
- investigate systemic mismatch patterns
- validate the audit before changing production
- if necessary, fix importer/aggregation once and re-import
- require clean population results before moving into IDP model calibration

---

# Final operating principle

**Do not make the output look right. Make the underlying system right.**

Fleeced! should remain one coherent system: canonical data and valuation upstream, shared fairness in the middle, and Finder/Evaluator/History/UI as disciplined consumers downstream.
