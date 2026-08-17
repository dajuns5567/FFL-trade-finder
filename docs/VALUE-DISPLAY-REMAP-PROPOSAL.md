# V122 Normalized Trade / Display Value Proposal — Staged, Not Deployed

## Goal
Translate the existing master player ordering into a better-distributed 120–9,999 numerical currency without changing why any player is ranked where he is.

This is not a new football valuation model. CV, TV, consensus, scoring, age/production, scarcity, Sleeper data, positional rankings, and the master rank order remain unchanged. The new number is a deterministic translation of the already-finished ordering.

## Why change the full curve
The existing presentation is too steep at the top and too compressed at the bottom: an elite #1 player can sit above 10,000 while a player around #20 is near 5,200, yet fringe players hundreds of ranks apart remain crowded around 1,000–1,500. That makes low-tier assets look too additive in packages.

The proposed translation spreads more legitimate premium players into the 6,000–9,000 range while allowing replacement-level players to fall much more aggressively toward the existing 120 floor.

## Staged anchor curve
- #1: 9,999
- #5: 9,500
- #10: 9,000
- #20: 7,800
- #50: 6,200
- #100: 4,700
- #200: 3,000
- #300: 1,900
- #400: 1,400
- #500: 1,000
- #600: 750
- #700: 520
- #800: 330
- #900: 180
- #1000+: 120 floor

Interpolation between anchors is monotonic and deterministic; values are rounded to 5-point increments for display consistency.

## Three layers that must remain separate
1. Canonical valuation/ranking layer — unchanged. This determines the master order and preserves all existing football inputs.
2. Normalized trade/display currency — the proposed 120–9,999 translation used consistently in Player Values, Trade Finder, Trade Evaluator, and raw package totals once activated.
3. Value Adjustment — remains a separate trade-only consolidation mechanism for premium concentration where simple additive normalized values are insufficient.

## Draft picks
Draft-pick values are not remapped by V122. They remain on their existing valuation path unless a later explicit calibration is approved. This allows the player-value experiment to be isolated and prevents unrelated pick logic from changing at the same time.

## Package penalty experiment
The existing package-penalty work is preserved separately in `docs/PACKAGE-PENALTY-EXPERIMENT-SNAPSHOT.md` and in the current V121 implementation.

The proposed V122 comparison should test the normalized player currency with package penalty disabled. The purpose is to determine whether the better-shaped value curve plus the existing Value Adjustment makes package penalty unnecessary. Package penalty is not deleted during this experiment.

## Explicit guardrails
- Do not change master player rank order.
- Do not change CV or TV.
- Do not change consensus/scoring/scarcity/age/production calculations.
- Do not change Sleeper ownership or roster data.
- Do not change team-fit valuation rules; fit remains partner-selection only.
- Do not change the approved Fleeced! logo.
- Do not change draft-pick values as part of this experiment.
- Do not deploy without explicit user approval.

## Preserved rollback state
Pre-remap production is preserved on branch `snapshot/pre-value-display-remap-2026-08-16` at commit `b214f85badc337e3c66c6f88980c73d3d272fec7`.

The package-penalty experiment is preserved separately so it can either be restored or retired after V122 testing without reconstruction.

## Staging implementation
`trade-value-normalization-v122.js` contains the deterministic rank-to-currency mapping. It is intentionally NOT referenced by `netlify/functions/site-v20.mjs`, so creating the staging file does not alter the live site.

## Pre-deployment validation targets
Check both player sequencing and familiar trades before activation:
- #1 / #5 / #10 / #20 / #50 / #100 values expand more naturally through the premium range.
- #300 / #400 remain meaningful assets but no longer crowd the lower tiers.
- #500 and below fall much faster toward replacement-level values.
- #800–#900 players approach minimal buying power.
- No player changes relative rank order.
- Known low-tier packages such as Benson + Brown and Benson + Brown + Herbert should lose additive buying power naturally.
- Mid-tier packages such as Dobbins + Boston + Brooks should not be punished merely for containing multiple players.
- Premium consolidation such as packages for Ja'Marr Chase should be controlled primarily by Value Adjustment rather than a blanket package penalty.
