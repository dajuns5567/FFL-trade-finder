# Player Value Display Remap Proposal

## Goal
Correct the presentation scale for lower-ranked players without changing the underlying player-ranking logic or the relative value logic used to determine player quality.

The current display compresses too much of the lower half of the player pool into values around 1,200-1,500 even though players beyond roughly rank 500 are effectively replacement-level or near-worthless in this 32-team league. The proposal is to use more of the existing 120-to-9,999 display range while preserving the current rankings and the underlying valuation inputs/calculations.

## Explicit non-goals / guardrails
- Do not change player rankings.
- Do not change CV, TV, consensus inputs, scoring inputs, age/production logic, scarcity logic, or any other underlying valuation calculation.
- Do not change Value Adjustment.
- Do not change Trade Finder partner-fit logic.
- Do not change Trade Evaluator fairness logic as part of this display remap.
- Do not alter draft-pick values.
- Do not deploy automatically.
- Do not modify the paused package-penalty experiment while this remap is evaluated.

## Anchor values supplied for current scale
Current examples:
- Rank 290 Ollie Gordon: 1,710
- Rank 391 Drew Allar: 1,475
- Rank 490 Sam Roush: 1,370
- Rank 590 Dillon Gabriel: 1,285
- Rank 690 Zay Jones: 1,210
- Rank 790 K'Lavon Chaisson: 940
- Rank 890 Isaiah McDuffie: 625
- Rank 907 Kadarius Calloway: 120

## Proposed behavior
1. Preserve values for players ranked above 300 exactly.
2. Starting after rank 300, remap only the DISPLAYED value onto a progressively steeper declining curve.
3. Keep the 300-400 region relatively compressed so small rank changes there produce only modest display-value changes.
4. Increase the slope through ranks 400-500.
5. Make the decline substantially steeper beyond rank 500, because these players are increasingly replacement-level in this league.
6. Use the full lower display range, approaching the existing 120 floor by the bottom of the ranked player pool.
7. The curve should be monotonic: a worse rank can never display a higher value than a better rank solely because of the remap.
8. The remap should be deterministic and presentation-only. The underlying valuation/ranking object should remain untouched and available for all existing calculations.

## Suggested shape
Use a piecewise monotonic mapping tied to overall rank, with continuity at each boundary:
- Ranks 1-300: unchanged.
- Ranks 301-400: gentle decline from the current rank-300 value toward a lower anchor near the existing rank-400 area.
- Ranks 401-500: moderate decline.
- Ranks 501-700: strong decline toward low hundreds.
- Ranks 701-bottom: very strong decline toward the 120 floor.

Exact breakpoints and anchor values should be calibrated against the current full ranking table before implementation so the remap does not create discontinuities or reorder anyone.

## Validation requirements before any deployment
- Spot-check ranks 290, 391, 490, 590, 690, 790, 890, and 907.
- Confirm ranks 1-300 are byte-for-byte unchanged in displayed Value.
- Confirm overall rank ordering is unchanged across the entire player pool.
- Confirm CV and TV are unchanged.
- Confirm trade construction/ranking logic receives the same underlying valuation inputs as before; only the rendered/display metric is remapped.
- Confirm no source path involved in Value Adjustment, draft-pick valuation, or package-penalty logic was altered.

## Why this may solve the low-asset stacking problem
If the site visually communicates the practical insignificance of deep players more accurately, users will no longer see a large stack of replacement-level players as apparently equivalent to meaningful assets merely because the displayed scale compresses them near 1,200-1,400. This proposal intentionally does not use the display remap itself as a new trade-calculation rule unless explicitly authorized later.

## Rollback / preservation
A full pre-remap snapshot exists on branch `snapshot/pre-value-display-remap-2026-08-16` at commit `b214f85badc337e3c66c6f88980c73d3d272fec7`. The package-penalty experiment is documented separately in `docs/PACKAGE-PENALTY-EXPERIMENT-SNAPSHOT.md`.
