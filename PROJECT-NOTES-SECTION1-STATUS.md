# Fleeced! Project Notes — Section 1

## Permanent guardrails
- Player Values and displayed overall rankings are the master valuation layer. Trade Finder / Evaluator work must not silently alter those values or ranks.
- Team fit affects recommendation/partner selection only; it does not change player value.
- Value Adjustment and Package Quality Penalty are trade-only fairness mechanisms. They do not alter any individual player/pick Value or rank.
- Value Adjustment exists to recognize centerpiece / concentration differences that raw additive Value can understate. It is not required on every trade.
- Package Quality Penalty exists specifically to prevent consolidation of multiple very low-ranked depth players into a materially better asset at full additive Value. It is not required on every package.
- Package Quality Penalty never applies to a one-player-for-one-player trade.
- A side that receives a Package Quality Penalty does not also receive a Value Adjustment. The opposite/premium side may receive the pre-existing Value Adjustment when applicable.
- TE is not a required starter and must not be treated as an artificial positional need.
- Acquire Draft Picks is a manual user intent and takes priority over roster-fit logic for incoming asset construction.
- No deployment is allowed without explicit user approval.
- Approved Fleeced! logo is locked unless the user explicitly requests a logo change.

## Current Section 1 implementation work — V115 (NOT DEPLOYED)
1. Strengthen Package Quality Penalty for consolidation of multiple low-ranked players (overall rank >= 350), with increasingly severe discounts deeper in the rankings and an additional fragmentation multiplier when 3+ low-tier players are stacked.
2. Preserve zero package penalty for single-player-for-single-player trades.
3. Preserve the existing Value Adjustment as a separate mechanism; do not replace it with package penalty.
4. Recalculate post-penalty fairness from the stronger effective package value rather than adding a second arbitrary score punishment.
5. Expand broadly unconstrained Make a Fair Trade searches with additional candidates when the primary generator produces too few qualifying options (e.g. Chuba Hubbard).
6. Finder pagination target: show 5 recommended trades at a time, then Load More reveals the next 5, ordered by existing fairness/recommendation quality.

## Incomplete tasks — next work after V115 verification
1. Search/selection persistence in Finder and Evaluator: selecting player A, then searching/selecting B/C/etc. must retain all explicit selections. Explicit removal must uncheck the matching checkbox.
2. Benson + Brown Finder package: stable results across Make a Fair Trade, Tier Up, and Acquire Draft Picks; no flash/disappear behavior.
3. Finder tie-breaking must preserve underlying ranking/CV/TV differences when two players share the same rounded displayed Value.
4. Add outgoing selection controls: Select all assets, Select all players, Select all draft picks.
5. For 2+ selected outgoing assets only, allow an optional “I want to trade some of the selected assets” mode. Default remains “trade all selected assets.” One selected asset never invokes some/all logic.
6. “Some selected assets” treats the selected set as an eligible pool and explores varied sensible subsets/package structures. “All selected assets” requires every selected asset in the outgoing package and evaluates the complete package under the existing fairness framework.
7. When Add assets if needed is enabled, allow the user to exclude specific assets from ever being auto-added.
8. Preserve broad package diversity and roster-balance logic from Section 2 requirements.

## Deployment/data preservation requirement
Every approved deployment must record the release identifier, merge commit, active trade/valuation script versions, and the data-source/snapshot state used by that release. Live external-source data cannot be considered permanently reproducible unless a repository snapshot is saved. A deployment-snapshot workflow/manifest remains required before this can be claimed as fully archival/reproducible.
