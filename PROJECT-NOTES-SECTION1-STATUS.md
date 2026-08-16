# Fleeced! Project Notes — Section 1

## Permanent guardrails
- Player Values and displayed overall rankings are the master valuation layer. Trade Finder / Evaluator work must not silently alter those values or ranks.
- Team fit affects recommendation/partner selection only; it does not change player value.
- Value Adjustment and Package Quality Penalty are trade-only fairness mechanisms. They do not alter any individual player/pick Value or rank.
- Value Adjustment exists to recognize centerpiece / concentration differences that raw additive Value can understate. It may apply to a one-for-one trade and is not required on every trade.
- Package Quality Penalty exists specifically to prevent consolidation of multiple very low-ranked depth players into a materially better asset at full additive Value. It is not required on every package and never applies to a one-player-for-one-player trade.
- Package penalties grow harsher as multiple deeper-ranked players are stacked. They are specifically intended for depth pieces such as the Benson/Brown/Herbert/Virgil tier rather than normal mid/high-tier multi-asset trades.
- A side that receives a Package Quality Penalty does not also receive a Value Adjustment. The opposite/premium side may receive the pre-existing Value Adjustment when applicable.
- Fairness is based on effective post-adjustment/post-penalty value, but the same absolute/percentage gap is not treated identically at every package tier. A roughly 1,200-point effective gap in an ~11,000-point package should generally land around Negotiable/high-70s-low-80s rather than comfortably Fair.
- Recommendation ordering and fairness score are separate. The best or only available recommendation is never automatically 100/100. A 100/100 trade requires extremely close effective value after applicable adjustments/penalties.
- TE is not a required starter and must not be treated as an artificial positional need.
- Acquire Draft Picks is a manual user intent and takes priority over roster-fit logic for incoming asset construction.
- No deployment is allowed without explicit user approval.
- Approved Fleeced! logo is locked unless the user explicitly requests a logo change.

## Current Section 1 implementation work — V116
1. Replace overlapping legacy Section 1 trade post-processors with a single V116 owner for Finder/fairness rendering. Older trade overlays are no longer loaded into the production Section 1 path; approved logo styling and draft-filter/clear controls are preserved in isolated compatibility modules.
2. Strengthen Package Quality Penalty specifically for consolidation of 2+ low-ranked players (overall rank >= 350), with increasingly severe discounts deeper in the rankings and an additional fragmentation multiplier when 3+ low-tier players are stacked.
3. Preserve zero package penalty for single-player-for-single-player trades and ordinary multi-asset packages that do not contain at least two low-tier players.
4. Preserve the existing Value Adjustment as a separate mechanism. A penalized side does not also receive Value Adjustment; the opposite premium side may still receive it.
5. Use tier-aware fairness sensitivity: effective value gaps become more consequential on large premium packages than the prior one-size multiplier allowed, while still scaling relative to package size.
6. Finder builds a final candidate pool before rendering so Benson/Brown results cannot flash and disappear after a later filter pass.
7. Finder supports neutral/fair, tier-up, and draft-pick-only candidate generation under the unified V116 fairness function. Equal displayed Values are tie-broken with underlying overall rank when selecting among otherwise similar candidates.
8. If one or more recommendations exist, no-trades/empty-state messaging is removed. The empty state appears only when zero final recommendations remain.
9. Broad unconstrained searches such as Chuba Hubbard search across all partner teams and varied one-player, player+pick, and two-player structures rather than presenting only supplemental “Alternative” cards.
10. Finder shows 5 recommendations initially. Load More reveals the next 5 while preserving the same fairness/recommendation ordering and qualification standard.
11. Recommendation rank does not inflate fairness. Finder can rank a Negotiable trade first if it is the best available option.

## Incomplete tasks — next work after V116 verification
1. Search/selection persistence in Finder and Evaluator: selecting player A, then searching/selecting B/C/etc. must retain all explicit selections. Explicit removal must uncheck the matching checkbox.
2. Add outgoing selection controls: Select all assets, Select all players, Select all draft picks.
3. For 2+ selected outgoing assets only, allow an optional “I want to trade some of the selected assets” mode. Default remains “trade all selected assets.” One selected asset never invokes some/all logic.
4. “Some selected assets” treats the selected set as an eligible pool and explores varied sensible subsets/package structures. “All selected assets” requires every selected asset in the outgoing package and evaluates the complete package under the existing fairness framework.
5. When Add assets if needed is enabled, allow the user to exclude specific assets from ever being auto-added.
6. Preserve broad package diversity and roster-balance logic from Section 2 requirements.

## Deployment/data preservation requirement
Every approved deployment must record the release identifier, merge commit, active trade/valuation script versions, and the data-source/snapshot state used by that release. Live external-source data cannot be considered permanently reproducible unless a repository snapshot is saved. A deployment-snapshot workflow/manifest remains required before this can be claimed as fully archival/reproducible.
