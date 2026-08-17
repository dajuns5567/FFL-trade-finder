# Fleeced! Project Notes — Section 1

## Permanent guardrails
- Player Values and displayed overall rankings are the master valuation layer. Trade Finder / Evaluator work must not silently alter those values or ranks.
- Team fit affects recommendation/partner selection only; it does not change player value.
- Value Adjustment and Package Quality Penalty are trade-only fairness mechanisms. They do not alter any individual player/pick Value or rank.
- Value Adjustment recognizes centerpiece / concentration differences that raw additive Value can understate. It may apply to one-for-one or package trades and is not required on every trade.
- Package Quality Penalty exists primarily to stop multiple very low-value depth assets from manufacturing a materially better asset at full additive Value. It is not a generic multi-player penalty.
- Package penalty is value-first: strongest below 1500 Value, occasional/light from 1500–2500, and normally zero above 2500. Rank is secondary context, not the trigger.
- Premium centerpiece packages should be governed primarily by Value Adjustment. Do not blanket-penalize a side containing a premium asset such as Trevor Lawrence merely because it contains multiple assets.
- A side that receives a Package Quality Penalty does not also receive a Value Adjustment. The opposite/premium side may receive Value Adjustment when applicable.
- Fairness is based on effective post-adjustment/post-penalty value, and the same absolute gap is not treated identically at every package tier. A roughly 1,200-point effective gap in an ~11,000-point package should generally be Negotiable/high-70s-low-80s rather than comfortably Fair.
- Recommendation ordering and fairness score are separate. The best or only recommendation is never automatically 100/100. A 100/100 trade requires extremely close effective value.
- TE is not a required starter and must not be treated as an artificial positional need.
- Acquire Draft Picks is a manual user intent and takes priority over roster-fit logic for incoming asset construction.
- No deployment is allowed without explicit user approval.
- Approved Fleeced! logo is locked unless the user explicitly requests a logo change.

## V119 recovery scope — prepared 2026-08-16, not yet deployed
1. Restore the previously working recommendation/rendering path instead of replacing it with a custom V118 Finder/Evaluator renderer.
2. Keep the established underlying Trade Finder engine for ordinary recommendations and layer the newer fairness rules over it.
3. Preserve the value-banded package penalty: strongest below 1500, occasional/light from 1500–2500, normally zero above 2500.
4. Preserve premium-side Value Adjustment and prevent the same side from receiving both Value Adjustment and Package Quality Penalty.
5. Keep fairness tier-aware so similar absolute point gaps are judged differently at different package sizes.
6. Fix search-selection persistence independently of the recommendation engine. Finder and Evaluator selections are stored by asset id and re-applied after search/rerender; explicitly unchecking an asset removes it.
7. Finder search persistence uses hidden checked mirror inputs only when a selected outgoing asset is temporarily absent from the rendered checklist, so the stable engine still sees every explicitly selected outgoing asset.
8. Restore 5-at-a-time result presentation for ordinary Finder results without loosening fairness thresholds for later pages.
9. Leave the approved Fleeced! logo untouched.
10. Do not change Player Values, rankings, consensus inputs, draft-pick Values, Sleeper ownership, or team-fit valuation rules.

## V119 verification targets
- Evaluator raw Player Values and raw package totals must never render as zero when the checklist shows nonzero player Values.
- Benson + Brown + Herbert vs Parker Washington should again display real Values, apply a meaningful low-value package penalty, and remain clearly unfavorable.
- Chuba Hubbard + Denzel Boston + Jonathan Brooks vs Ja'Marr Chase should show little/no package penalty on the mid-tier package and remain unfair primarily because of premium concentration / Value Adjustment.
- One-for-one trades must receive no package penalty.
- Finder: Chuba Hubbard / Make a fair trade should use the stable recommendation engine and return multiple qualifying structures when available.
- Finder: Benson + Brown should remain usable in ordinary fair-trade and tier-up searches, subject to their reduced effective buying power.
- Search persistence: select A, search/select B, then C; A/B/C must all remain selected in Finder and Evaluator.
- Explicitly unchecking/removing A must remove A from persistent selection state.
- First 5 qualifying Finder cards display initially; Load More reveals the next 5 under the same scoring standard.
- Fleeced! logo remains unchanged and stable.

## Incomplete tasks — carry forward until explicitly verified/fixed
1. Search/selection persistence in Finder and Evaluator remains incomplete until live V119 verification confirms it.
2. Add outgoing selection controls: Select all assets, Select all players, Select all draft picks.
3. For 2+ selected outgoing assets only, allow optional “I want to trade some of the selected assets” mode. Default remains “trade all selected assets.”
4. “Some selected assets” treats the selected set as an eligible pool and explores varied sensible subsets/package structures. “All selected assets” requires every selected asset.
5. When Add assets if needed is enabled, allow the user to exclude specific assets from ever being auto-added.
6. Preserve broad package diversity and roster-balance logic from Section 2 requirements.
7. Do not consider any item complete merely because code was attempted. Keep it here until live verification confirms behavior.

## Deployment/data preservation requirement
Every approved deployment must record the release identifier, merge/deployment commit, active trade/valuation script versions, and data-source/snapshot state used by that release. Live external-source data cannot be considered permanently reproducible unless a repository snapshot is saved. A deployment-snapshot workflow/manifest remains required before this can be claimed as fully archival/reproducible.
