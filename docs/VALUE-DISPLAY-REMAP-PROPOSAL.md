# V122 Smooth Normalized Trade / Display Value Proposal — Staged, Not Deployed

## Goal
Translate the existing master player ordering into a better-distributed 120–9,999 numerical currency without changing why any player is ranked where he is.

This is not a new football valuation model. CV, TV, consensus, scoring, age/production, scarcity, Sleeper data, positional rankings, and the master rank order remain unchanged. The new number is a deterministic translation of the already-finished ordering.

## Smooth curve, not rank tiers
The first staging draft used piecewise anchors. That approach is superseded.

V122 now uses one continuous monotonic curve across the entire ranked player pool. There are no hard breakpoints at ranks 100, 200, 300, 400, etc. The slope changes smoothly from elite players through replacement-level players.

The current staging function is approximately:

`value(rank) = 120 + (9,999 - 120) * (1 - x^0.52437)^1.97479`

where `x = (rank - 1) / (maxRank - 1)`.

The resulting reference points for a pool ending around rank 907 are approximately:
- #1: 9,999
- #5: 8,895
- #10: 8,337
- #20: 7,593
- #50: 6,220
- #100: 4,824
- #150: 3,865
- #200: 3,136
- #300: 2,080
- #400: 1,359
- #500: 857
- #600: 512
- #700: 288
- #800: 163
- #900: 120

These are reference outputs from one continuous curve, not manually assigned tiers. The exact bottom rank adapts to the current ranked pool while preserving the 120 floor and 9,999 ceiling.

## What remains unchanged
- Master overall player rank order.
- Positional rankings.
- CV and TV.
- Consensus inputs and source weighting.
- League scoring adjustments.
- Scarcity inputs.
- Age, production, role, and all underlying valuation calculations.
- Sleeper roster/pick ownership.
- Team-fit logic; fit remains recommendation/partner selection only.
- Existing draft-pick projection logic, including year/round/projected-slot behavior.
- Approved Fleeced! logo.

## Normalized trade currency
When activated, the smooth value is the numerical currency shown and summed in:
- Player Values.
- Trade Finder.
- Trade Evaluator.
- Raw package totals.
- The existing Value Adjustment calculations.

This changes the translation of existing valuation into trade currency, but not the underlying valuation or ranking itself.

## Draft-pick normalization
Draft picks must move onto the same new numerical spectrum so a player does not suddenly become worth multiple firsts simply because only players were rescaled.

V122 does NOT change how a draft pick is valued. Existing year, round, ownership, projected-slot, and pick-context logic still produces the pick's current underlying value first.

The display/trade-currency translation then preserves the pick's current player-equivalent buying power:
1. Build the current player market as pairs of `(old player Value, new smooth Value)`.
2. Take the pick's existing underlying Value.
3. Locate/interpolate the players with the most similar existing Value.
4. Give the pick the corresponding normalized Value on the new curve.

Example concept: if the current model considers a projected pick approximately equivalent to a player around rank 150, after normalization that pick should remain approximately equivalent to the same caliber/rank-150 player. Both numbers change together.

This means V122 does not independently make firsts, seconds, or thirds stronger or weaker. It only changes the numerical ruler used to express the equivalence relationship the current pick model already determined.

## Package penalty experiment
The package-penalty work remains preserved separately in `docs/PACKAGE-PENALTY-EXPERIMENT-SNAPSHOT.md` and in the pre-normalization code.

The intended V122 test remains normalized player/pick currency plus the existing Value Adjustment, with package penalty disabled for the comparison. Package penalty is not deleted while testing. If the smooth curve naturally prevents Benson/Brown/waiver-tier stacking, package penalty can later be retired cleanly.

## Why this may remove the need for package penalty
The existing currency is compressed at the bottom. Several players who are barely above replacement level still carry enough numerical Value to stack into meaningful assets.

On the smooth curve, replacement-level players naturally approach 120 without a special trade-time punishment. At the same time, premium players below rank #1 occupy more of the 6,000–9,000 range, so the top of the market is not artificially dominated by one or two values.

Value Adjustment remains available for premium consolidation, so flattening the elite raw-value gap does not imply that elite players become easier to acquire.

## Preserved rollback state
Pre-remap production is preserved on branch `snapshot/pre-value-display-remap-2026-08-16` at commit `b214f85badc337e3c66c6f88980c73d3d272fec7`.

The smooth experiment lives on branch `experiment/v122-smooth-value-spectrum` and is intentionally not wired into the production site wrapper.

## Pre-deployment validation targets
Before deployment, compare:
- Player values near ranks 1, 5, 10, 20, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, and 900.
- Several projected first-, second-, and third-round picks versus players they are currently closest to in trade value.
- Benson + Brown.
- Benson + Brown + Herbert for Parker Washington.
- Benson + Brown + Herbert for Jadarian Price.
- Dobbins + Boston + Brooks for Ja'Marr Chase.
- Jordan Tyson package benchmark.
- Jayden Daniels premium package benchmark.
- Ordinary one-for-one trades.

Success criteria:
- Rank sequencing is identical.
- Player/pick equivalence is materially preserved.
- Rank ~150 does not become worth multiple firsts solely because of rescaling.
- Very deep players lose additive buying power naturally.
- Mid-tier packages do not need a blanket package penalty.
- Value Adjustment remains the only special premium-consolidation mechanism during the comparison.
- No production deployment occurs until explicitly approved.
