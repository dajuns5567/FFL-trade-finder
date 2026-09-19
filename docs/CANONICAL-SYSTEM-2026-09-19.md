# Fleeced! — Canonical Current System State

**Snapshot date:** 2026-09-19  
**Purpose:** Durable source of truth for the current Fleeced! valuation architecture, trade engine, Value History, product invariants, and recent accepted work.

This document is intentionally non-executable. Runtime source code remains authoritative for exact formulas. When this document and older project notes conflict, **this document describes the accepted 2026-09-19 state**. Do not import this file into runtime code.

---

## 1. Operating principles

Fleeced! is a league-specific dynasty trade market for a 32-team Sleeper league.

Core product surfaces:
- Player Values
- Trade Finder
- Trade Evaluator
- Trade History
- Value History
- League Hub
- League / roster context
- Methodology / diagnostics

Non-negotiable engineering rules:
- One canonical player/pick value system feeds Finder, Evaluator, Player Values, Trade History, and Value History.
- Team fit may affect partner choice, candidate ordering, and rationale. It must not change a player or pick's underlying canonical value.
- Rank is an output of calculated valuation. Do not feed displayed overall/positional rank back into valuation as a step bonus.
- Do not hard-code individual player boosts, locks, anchors, ordering constraints, or historical values to force a preferred result.
- Do not invent Sleeper roster or pick ownership.
- Do not let partial current-week NFL results enter valuation.
- Do not merge to production or deploy production without explicit user authorization.
- Audit the exact mechanism before patching. Avoid speculative stacked fixes.

---

## 2. Current repository / recovery state

Repository: `dajuns5567/FFL-trade-finder`

Current working branch:
- `release/precision-idp-runtime-20260919`

Draft PR:
- PR #385 — `Validated IDP + precision runtime candidate`

Primary preview:
- `https://deploy-preview-385--precious-stroopwafel-196eae.netlify.app`

Current code recovery baseline:
- `baseline/20260919-home-valuehistory-aligned`
- commit `4f566de1976939139cf5ffa4441a43ea8aefd54a`

Current Value History data recovery baseline:
- `baseline/20260919-value-history-reset`
- commit `928d5c7ff6e131fe85ddc72fe1659fa8582cdee9`

Canonical documentation recovery baseline:
- `baseline/20260919-canonical-project-memory`

These branches are recovery points. Do not rewrite or delete them during ordinary work.

---

## 3. Layered valuation architecture

The valuation system is deliberately layered.

### Layer A — league and asset truth

Sleeper supplies:
- league / season state
- rosters and teams
- player identity
- draft-pick ownership
- transaction history
- imported weekly player statistics

Draft-pick ownership must always come from actual league state. Original roster is metadata; current owner determines who can trade the pick.

### Layer B — shared scoring foundation

Shared scoring helpers live in:
- `netlify/functions/ppr-scoring.mjs`

Current-season player-game qualification:
- **>=18% offensive/defensive snaps OR >=8 league fantasy points**

Historical season qualification:
- historical seasons require **>=8 qualifying games**

Current season:
- bypasses the historical 8-game season minimum while the season is in progress
- returns to normal completed-season treatment after the season

Current NFL week gate:
- a week enters valuation only when every non-ignored scheduled game slot for that week is final
- partial live weeks must not affect valuation

Week-1 weighting contract:
- 2026: 10%
- 2025: 55%
- 2024: 25%
- 2023: 10%

Missing historical evidence reduces confidence/coverage. It must not donate missing weight to the current season and accidentally amplify a one-game sample.

### Layer C — consensus refresh

Consensus refresh is a seven-source validated batch.

Current refresh contract:
- promote the refreshed composite only when the complete source batch validates
- otherwise retain the validated last-known-good composite
- after consensus/scoring refresh, rebuild master ranking caches and the canonical V319 map

Relevant runtime:
- `nonblocking-consensus-v277.js`

The refresh exposes:
- `window.__fllConsensusRefresh`
- `window.__fllValueRefresh`

Value History and scheduled capture use these markers to avoid recording intermediate valuations.

### Layer D — IDP modeled valuation

Accepted baseline is documented in:
- `docs/idp-valuation-baseline-2026-09-19.md`

The accepted IDP architecture is:
- 40% consensus
- 40% league scoring production
- 20% league/dynasty context

Important accepted IDP refinements:
- restrained 20% same-role benchmark blend for LB production
- established EDGE players with >=2 historical seasons and top-decile calculated scoring receive a 0.60 minimum production-confidence floor
- V72 continuous market floor: 0.60–0.76 by upstream baseline plus 75% of eligible shield contribution
- DB/S generic floor calibration of -0.015
- mild continuous taper for mature EDGE players age 29+
- EDGE/LB upside support must be evidence/role/production based, never player-specific
- missing seasons remain missing evidence; confidence mechanics must not fabricate production

### Layer E — offense modeled valuation

Offense and IDP share the same scoring/finality principles.

Do not broadly retune accepted offense while fixing IDP, Trade Finder, UI, or persistence bugs. Sparse-history and zero-history handling already exist in the offense chain and should be preserved unless the user explicitly requests a valuation change.

### Layer F — combined-market precision

File:
- `combined-market-precision-v386.js`

Purpose:
- rank the combined offense + IDP market using full terminal precision when available
- preserve served/display values separately
- use V72 exact terminal precision for IDP
- use covered offense terminal exact values where present
- preserve uncovered offense fallback behavior

Important invariant:
- nearby players may tie, cross, or move naturally
- rank changes do not themselves create valuation boosts

### Layer G — canonical display/trade currency

File:
- `trade-value-normalization-v139.js`

Current canonical player currency:
- max player value: 9,999
- minimum floor: 120
- overall rank #1 maps to 9,999
- rank curve is continuous and rounded to 5
- rank 325 is a current curve breakpoint around 1,825
- deeper players continue on a compressed lower curve

The **modeled market determines rank/order**. The canonical normalization converts that order into the common currency used throughout the product.

Draft picks:
- preserve the existing source projection / year / round / projected-slot logic
- nearest-year strongest first is normalized around 7,000
- canonical pick value is proportional to the existing source curve
- filters and Finder intent never revalue picks

This canonical currency is the value shown/used across Player Values, Finder, Evaluator, and current Trade History.

---

## 4. Trade engine — current accepted state

Current runtime:
- `trade-runtime-v256-compiled.js`
- `trade-finder-v256-compiled.js`
- canonical values from `trade-value-normalization-v139.js`

### 4.1 Value Adjustment

**Current runtime uses Value Adjustment as the consolidation mechanism.**

Value Adjustment:
- is trade-only
- does not change master player/pick value
- can add premium value to the side containing the stronger centerpiece when the other side includes sufficient depth/value
- is continuous and depends on premium strength, counterpart strength, package depth, elite pressure, and raw gap
- Finder and Evaluator use the same fairness engine

### 4.2 Package Quality Penalty status

Older project notes describe a separate Package Quality Penalty.

**That mechanism is not active in the current V256 runtime.**

Current runtime rationale explicitly states:
- Value Adjustment is the only consolidation adjustment
- Package penalty is not used

Do not silently reintroduce a package penalty from older project memory. That would be a new trade-engine change requiring explicit user direction and validation.

### 4.3 Current fairness formula

In `trade-runtime-v256-compiled.js`, current fairness is based on effective totals after Value Adjustment.

Definitions:
- `aEffective = aRaw + aAdj`
- `bEffective = bRaw + bAdj`
- `hi = max(aEffective, bEffective, 1)`
- `rel = abs(aEffective - bEffective) / hi`
- scale factor increases with trade size
- score is a bounded 1–100 function of relative effective-value difference
- ratio = lower effective side / higher effective side

Current rejection rule in the engine:
- reject when score < 55 OR effective-value ratio < 0.62

Current labels:
- 94–100: Excellent Fit
- 82–93: Fair
- below 82 but not rejected: Negotiable

Finder may apply additional intent/candidate filters before a result is displayed.

---

## 5. Trade Finder — functioning structure and intent

File:
- `trade-finder-v256-compiled.js`

Finder is a candidate-construction / partner-selection layer around the shared canonical values and shared fairness engine.

It must not create a second valuation model.

### Current construction behavior

Finder can construct:
- single-player trades
- player + pick packages
- multi-player packages
- pick-only packages in draft-pick mode
- selected outgoing assets
- blank-selection exploratory packages
- optional added outgoing assets when "Add assets if needed" is enabled

Current candidate logic includes:
- partner roster ownership
- selected target positions
- tier-up / tier-down / neutral / draft intent
- package-shape variety
- actual pick ownership
- selected pick years/rounds where applicable
- partner fit
- duplicate suppression
- candidate diversification
- UI yielding during large searches

### Recommendation ordering

Base recommendation is primarily fairness with a smaller partner-fit contribution.

Default path:
- approximately 92% fairness
- approximately 8% partner fit

Need-based mode may use the dedicated partner-fit recommendation layer when available.

### Finder presentation

- results use the same canonical values shown elsewhere
- results use the shared fairness engine
- Value Adjustment is visible where it applies
- first 5 results display initially
- Load More reveals 5 more at a time
- Load More is presentation only and must not loosen trade standards

### Current "maximum value" presentation logic

Some Finder modes apply additional candidate/presentation scoring for maximum-value searches. This is a candidate-ranking/presentation layer and must not modify the underlying canonical player/pick values.

---

## 6. Trade Evaluator — functioning structure and intent

Evaluator is intentionally simpler than Finder.

It:
- lets the user choose two teams and explicit assets
- reads the exact same canonical player/pick values
- calls the same shared `fair(give, recv)` engine
- uses the same Value Adjustment
- displays raw totals, adjustment, effective totals, score, and label

Evaluator must agree with Finder on the effective values and fairness result for the same package. Finder may differ only in recommendation/partner-fit ordering because Finder is searching for candidates.

---

## 7. Trade History

Trade History is separate from Finder/Evaluator generation.

Core intent:
- compact historical trade list
- Hindsight = today/current valuation
- Original Trade Analysis = valuation reference used for the historical trade
- Historical Value Comparison = asset/pick outcome context

Do not guess unavailable historical values.

### Current special historical reference

For the trade(s) that occurred in the scrubbed 2026-09-16 through 2026-09-19 window, Original Trade Analysis is intentionally remapped to the verified **2026-09-19 6:01 PM ET** valuation snapshot minute.

Current code marker:
- `V494_TRADE_REFERENCE_MINUTE='2026-09-19T22:01'`
- response marker: `requested-2026-09-19-1801-et`

This is a deliberate historical-reference rule. It must not change active current player values.

---

## 8. Value History — current architecture

Primary files:
- `netlify/functions/value-history.mjs`
- `value-history-v276.js`
- `scripts/value-history-headless-refresh.mjs`
- `scripts/archive-value-history.mjs`
- `.github/workflows/value-history-headless-refresh.yml`
- `.github/workflows/value-history-archive.yml`

### 8.1 Snapshot readiness

Interactive page-load/manual snapshots now wait for:
- player state populated
- full valuation refresh not in flight
- consensus refresh complete
- modeled player values ready
- Sleeper history complete
- no loading/updating/refreshing status
- two canonical `currentRows()` reads that are identical across a stability interval

Scheduled headless capture uses the same principle:
- wait for complete refresh state
- capture canonical rows twice
- require identical rows before persistence

This prevents intermediate values from entering the chart/archive.

### 8.2 Active Value History baseline

The active Value History era begins at the verified stable snapshot:

- **2026-09-19 6:01:38.323 PM ET**
- UTC: `2026-09-19T22:01:38.323Z`

Runtime constant:
- `V496_BASELINE_T='2026-09-19T22:01:38.323Z'`

Rules:
- all active Value History reads ignore earlier points
- the live Blob buffer performs a one-time physical cleanup of earlier points
- market/riser/faller/team calculations ignore earlier points
- archive ingestion rejects points earlier than the baseline
- old points must not reappear after archive retries or Netlify changes

### 8.3 Durable archive state at this snapshot

The old active GitHub archive was intentionally scrubbed.

Data branch:
- `value-history-data`
- baseline/reset commit: `928d5c7ff6e131fe85ddc72fe1659fa8582cdee9`

At the moment this canonical document was created:
- old pre-baseline durable points were removed
- index/month/latest were reset
- the exact 6:01 PM baseline existed in the preview live Blob buffer and had not yet been copied into the durable GitHub archive

This is a known persistence follow-up:
- archive the verified 6:01 baseline and later valid points to GitHub before relying on Netlify-local storage across site/account changes

### 8.4 Large archive handling

Monthly history bundles can exceed GitHub Contents API inline-content limits.

Archive reader rule:
- if Contents API omits large-file content, fetch the Git blob by SHA
- never interpret an omitted >1 MB file body as an empty archive

---

## 9. Home page data reuse

Home must not maintain parallel valuation/history loaders.

Current accepted behavior:
- Player Values Home preview calls `playerValuesV139.homeTopPlayers(10)`
- Value History Home preview calls `valueHistoryV331.marketData()`
- Home consensus readiness uses the authoritative `window.__fllConsensusRefresh` marker

Home is a presentation of the existing Player Values and Value History data, not a separate data model.

Current layout intent:
- Player Values and Value History Home boxes use matched row geometry
- same rank font size
- same player-name font size
- same metadata font size
- same row height
- same two-column spacing
- Player Values reserves the same right-side width that Value History uses for movement values so text aligns

---

## 10. Refresh / update intent

"Update" is a real data refresh, not merely a UI redraw.

Expected sequence:
1. mark full valuation refresh in flight
2. refresh Sleeper/core data
3. hydrate verified scoring snapshot
4. refresh consensus sources
5. validate complete consensus batch
6. rebuild modeled values / master ranking / canonical maps
7. mark refresh complete
8. only then allow Value History persistence
9. Home reads the same canonical outputs after completion

If consensus fails:
- preserve last-known-good validated consensus
- do not record a half-refreshed intermediate market

---

## 11. Recent accepted fixes that must be preserved

1. Value History POST writes were re-enabled after an audit pause was accidentally left in place.
2. Player Value History now records page-load observations again.
3. Trade History fetch retries transient failures instead of immediately showing "temporarily unavailable".
4. GitHub archive handling supports large monthly bundles.
5. Netlify archive credential handling can try both configured credentials independently.
6. Value History snapshot writes wait for stable completed valuation state.
7. Scheduled headless snapshots also wait for stable canonical rows.
8. Known unstable 2026-09-19 5:47:21 PM ET scheduled snapshot was removed/blocked.
9. Active Value History was reset to the verified 2026-09-19 6:01:38 PM ET valuation era.
10. Original Trade Analysis for affected in-window historical trades uses the verified 6:01 PM reference minute.
11. Home Player Values and Value History panels now reuse their respective tab data APIs.
12. Home preview boxes were aligned to shared row/typography geometry.
13. Finder/IDP smoke tests were updated to validate behavior rather than obsolete cache-bust/version strings.

---

## 12. Validation / regression contracts

Important automated checks:
- `.github/workflows/idp-scoring-smoke.yml`
- Finder runtime smoke workflow
- `tests/idp-valuation-refresh-contract.test.mjs`
- `tests/idp-week1-weighting.test.mjs`
- `scripts/value-history-data-hub-v331-smoke.mjs`

Before calling a change complete:
- smoke tests must pass
- primary `precious-stroopwafel` preview must build
- runtime Player Values must populate
- if Value History changes, verify newest graph point equals current canonical value
- if Trade History changes, verify the exact historical reference timestamp
- if Finder/Evaluator changes, verify both use the same canonical values and shared fairness engine

A successful Netlify build proves deployment, not runtime correctness.

---

## 13. Change protocol for future work

### Valuation changes
Require explicit user intent and population-level validation.

Do not:
- tune one player to fix a systemic issue
- use displayed rank as a valuation multiplier
- introduce hidden historical anchors
- change Finder logic and accidentally move Player Values

### Finder / Evaluator changes
Preserve:
- canonical values
- shared fairness engine
- Value Adjustment behavior unless explicitly changing it
- actual Sleeper ownership
- existing working modes and candidate variety

### Value History changes
Preserve:
- stable-row readiness
- GitHub durability goal
- active 2026-09-19 6:01:38 PM ET baseline
- no pre-baseline reintroduction
- exact timestamp integrity

### Deployment
- preview commits are allowed during development
- production merge/deploy requires explicit user authorization
- state clearly what changed and what did not

---

## 14. Source-of-truth precedence

When recovering the project in a new chat/session:

1. Current runtime source code on the active work branch
2. This file: `docs/CANONICAL-SYSTEM-2026-09-19.md`
3. `docs/idp-valuation-baseline-2026-09-19.md`
4. current smoke/regression tests
5. `PROJECT-MEMORY.md` for older product history
6. historical chats/notes only when not contradicted by current code/docs

Older notes that conflict with this document are historical, not current instructions.
