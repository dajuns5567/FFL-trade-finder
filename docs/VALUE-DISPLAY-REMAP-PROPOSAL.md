# V122 Uniform Value Rescale Proposal — Staged, Not Deployed

## Goal
Apply one smooth monotonic transformation to the CURRENT numeric Value already produced by the site, without changing how that Value was determined.

This is analogous to changing the numerical ruler used to present Value after the valuation engine has finished its work. It is not a new player model, not a new draft-pick model, and not a new ranking model.

## Core rule
The same mathematical transformation is applied to every existing player Value and every existing draft-pick Value.

`new displayed/trade Value = f(current Value)`

There is no rank matching, no player-equivalence lookup, and no re-evaluation of a pick.

If a player and a pick are worth the same current Value before the rescale, they receive the same new Value after the rescale. If one asset is worth more than another before the rescale, the monotonic function preserves that ordering afterward.

## What remains unchanged
- Overall player rankings and positional rankings.
- CV and TV.
- Consensus inputs and source weighting.
- League scoring adjustments.
- Scarcity inputs.
- Age, production, role, and all other player valuation calculations.
- Draft-pick year/round/projected-slot calculations.
- Draft-pick ownership and Sleeper data.
- Team-fit logic.
- Value Adjustment logic itself.
- Approved Fleeced! logo.

## Why this is different from the earlier staging draft
The earlier draft first remapped players by rank and then tried to infer where picks should sit on the new player curve. That is superseded.

The corrected design does not ask what player a pick resembles. The current draft-pick model produces its Value exactly as it does today, and then that numeric Value is passed through the same presentation transform used for players.

Example concept only:
- Current player Value = X -> displayed/trade Value becomes f(X).
- Current pick Value = X -> displayed/trade Value also becomes f(X).

This preserves the current player-vs-pick valuation relationship while changing only the numerical scale used to express it.

## Smooth full-spectrum transformation
The transform operates on CURRENT Value, not rank. It is continuous and monotonic from the existing 120 floor to a 9,999 display ceiling.

The intended shape:
- Compress the extreme gap between the very top asset and the rest of the elite tier.
- Spread more meaningful players through the 6,000–9,000 range.
- Preserve ordering throughout the middle.
- Give the bottom of the market much more room to fall toward 120 so replacement-level assets do not retain excessive additive buying power.

There are no hard rank tiers or rank-triggered changes in this rescaling.

## Where the rescaled number is used during the experiment
Once activated, the rescaled Value should be the number presented and summed in:
- Player Values.
- Trade Finder.
- Trade Evaluator.
- Player/pick raw package totals.
- Inputs to the existing Value Adjustment.

The canonical pre-rescale Value remains preserved for diagnostics and rollback.

## Package penalty experiment
Package-penalty work remains preserved separately in `docs/PACKAGE-PENALTY-EXPERIMENT-SNAPSHOT.md` and the pre-normalization implementation.

The intended comparison is:
- existing valuation/ranking systems unchanged;
- existing draft-pick valuation unchanged;
- one uniform Value rescaling applied after valuation;
- existing Value Adjustment retained;
- package penalty disabled for the comparison.

If this better numerical spectrum naturally prevents Benson/Brown/waiver-level stacking while preserving sensible mid-tier package behavior, package penalty can later be retired rather than tuned further.

## Preserved rollback state
Pre-remap production remains preserved on branch `snapshot/pre-value-display-remap-2026-08-16` at commit `b214f85badc337e3c66c6f88980c73d3d272fec7`.

The active experiment remains on branch `experiment/v122-smooth-value-spectrum` and is intentionally not wired into the production site wrapper.

## Pre-deployment validation
Before deployment, compare:
- Player Values across the full range.
- Several projected first-, second-, and third-round picks before/after the rescale.
- Player/pick pairs that currently have similar Values to verify they remain similarly valued afterward.
- Benson + Brown.
- Benson + Brown + Herbert for Parker Washington.
- Benson + Brown + Herbert for Jadarian Price.
- Dobbins + Boston + Brooks for Ja'Marr Chase.
- Jordan Tyson package benchmark.
- Jayden Daniels premium package benchmark.
- Ordinary one-for-one trades.

Success criteria:
- Rank sequencing is identical.
- Draft-pick projection/ownership logic is identical.
- Similar current player/pick Values remain similar after rescaling.
- No rank-150 player becomes worth multiple firsts solely because of the display transformation.
- Very deep players lose additive buying power naturally.
- Mid-tier packages are not punished by a blanket package penalty.
- Value Adjustment remains available for premium consolidation.
- No production deployment occurs until explicitly approved.
