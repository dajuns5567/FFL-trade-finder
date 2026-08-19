# Fleeced! valuation calculation freeze

## Status

The player-value and draft-pick-value **calculation code** is frozen at production baseline commit:

`e95105e0a062faca352b0fd7f88d0a4bcd45ce69`

This freeze was requested after V141 was confirmed working in production.

## Critical distinction: formulas are frozen; values are NOT frozen

This contract must never be interpreted as a request to save, cache, hard-code, or permanently preserve the numeric values visible on the site at the time of the freeze.

The following are intentionally dynamic and must continue to refresh normally:

- consensus/expert source data and rankings
- Sleeper rosters and ownership
- draft-pick ownership
- projected draft slot / team-strength inputs
- scoring history and production inputs
- player rankings produced from refreshed model inputs
- player values produced from those rankings
- draft-pick source values produced from year/round/projected-slot inputs
- all resulting displayed and trade-engine values

A player or pick may therefore have a different numeric value tomorrow, next week, or next season without violating this freeze. That is expected behavior when the underlying inputs change.

## What is frozen

The current mathematical pipeline and transformation rules are protected. Do not change them unless the user explicitly asks to change valuation calculations.

Protected calculation areas include:

- `trade-value-normalization-v139.js`
  - player rank-to-Value curve
  - 9,999 top-player anchor
  - player dispersion curve and rounding behavior
  - draft-pick proportional scaling
  - ~7,000 strongest-nearest-year-first anchor
  - canonical player/pick/package value routing
- `draft-pick-context-v92.js`
  - year discount logic
  - round/slot source curve
  - projected-slot weighting logic
  - 2027 first-round source adjustment currently present in the model
- `draft-pick-v86.js`
  - draft-pick context/projection inputs used by the active pick model
- `team-context-v90.js`
  - team-strength/projection calculations that feed projected pick slot
- `rank-lookup-v58.js`
  - active master-rank lookup behavior
- all root `valuation*.js` calculation modules currently present at the baseline commit
  - offense valuation/scoring modules
  - IDP valuation/scoring modules
  - consensus/model adjustment modules
- the core value functions in `index.html` used as part of the underlying pipeline:
  - `masterRankings`
  - `ensureMaster`
  - `playerRankValue`
  - `pickValue`
  - `baseValue`
  - `packageValue`

## What is NOT frozen

The following may change without changing the valuation formula contract:

- source data files and fetched source snapshots
- consensus refresh results
- Sleeper API responses
- player statistics/history data
- draft-pick ownership data
- team projection source data
- UI layout, styling, labels, filters, and navigation
- Finder partner-selection/team-fit logic, provided it does not alter the underlying player/pick values
- trade presentation and pagination

If an unrelated UI or Finder change requires touching a protected calculation file, refactor around the protected formula instead of modifying it.

## Regression rule

`.github/workflows/valuation-freeze.yml` runs `scripts/check-valuation-freeze.mjs` on pull requests and pushes. It compares protected calculation code against the confirmed-working baseline above.

Any change to protected valuation calculation code is expected to fail that check. The freeze should only be intentionally rebased or changed after an explicit user request to alter the valuation formula itself.

## Do not create a numeric snapshot

Do **not** create a file containing today's complete player values or draft-pick values as the source of truth. Do **not** replace live calculations with constants. Do **not** key the model to current names, ranks, ownership, or values.

The permanent source of truth is the **calculation method**, not the current outputs.