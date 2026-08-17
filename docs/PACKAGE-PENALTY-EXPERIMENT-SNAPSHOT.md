# Package Penalty Experiment Snapshot

Saved before the proposed player-value display remap.

## Purpose
The package penalty was introduced to reduce the apparent buying power of stacked low-tier players in trade packages, especially when multiple low-value depth assets are combined to acquire a materially stronger asset.

## Current intended behavior from project testing
- Package penalty is a trade-only fairness mechanism. It must not alter Player Values, rankings, consensus inputs, scoring, or draft-pick values.
- Value Adjustment remains a separate fairness mechanism and is not replaced by package penalty.
- Package penalty is primarily intended for combinations of low-ranked / low-value players, not ordinary mid-tier or premium packages.
- Single-player-for-single-player trades should not receive package penalty.
- Draft-pick-only sides should not receive package penalty.
- A side containing multiple low-tier players may receive package penalty even if the other side is draft-pick-only.
- The strongest historical examples for a meaningful penalty are packages containing players such as Malik Benson, Barion Brown, Khalil Herbert, Reggie Virgil, and similarly low-tier assets.
- Mid-tier packages such as J.K. Dobbins + Denzel Boston + Jonathon Brooks should not receive the same severe penalty as very low-tier stacks.
- Premium packages involving players such as Trevor Lawrence, Jayden Daniels, Ja'Marr Chase, etc. should generally be handled through the existing Value Adjustment / fairness logic rather than a low-tier package penalty.

## Most recent rule proposal that is now PAUSED
This was discussed immediately before the value-display remap idea and is being preserved here so it can be restored or discarded independently:
- Apply package penalty only when multiple players ranked 325+ are combined on one side.
- Players ranked 1-324 should not trigger package penalty.
- Players ranked 325-400 would receive only a small penalty.
- Penalty severity should increase progressively with worse rank, becoming much harsher in the 800+ range.
- Never apply package penalty to a side containing only draft picks.

## Status
PAUSED. Do not further modify or deploy package-penalty logic while the alternative player-value display remap is evaluated. This file exists so package-penalty progress can be discarded later without losing the prior design state.
