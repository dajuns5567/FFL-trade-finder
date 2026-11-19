# Integrated IDP V77 / V85 / V86: live consumer-scale acceptance

**Date:** 2026-11-16 UTC  
**Branch:** `integration/idp-v77-v85-v86-dynasty-acceptance`  
**Pull request:** [#486](https://github.com/dajuns5567/FFL-trade-finder/pull/486) — DRAFT, no merge or production deploy

## Provenance and scope

All comparisons used the same browser session source snapshot with the current Sleeper roster dictionary and the two dynasty-eligible IDP publishers (The IDP Show Combined and DraftSharks IDP). RotoWire's current-season IDP cheat sheet was excluded. Two browser variants used the same consensus payload; the candidate substituted only the actual `valuation-idp-v25-perf.js` (V86) and `valuation-idp-v36.js` (V85) code from this integration branch. Requests that could write to the site were blocked. Netlify production and approved previews remain untouched.

## All-relevant-CI green

- [Full 32-team integration acceptance](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/43797221327): PASS
- [Live roster consumer parity](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/43797730009): PASS
- [Cross-position shared-scale displayed currency audit](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/43798002649): PASS
- Matching commit CI included integrated identity/development, scoring smoke, and 20/45/35 calibration, all successful. V75 preview-only legacy workflow is intentionally skipped.

## Core IDP result

On the source-consistent snapshot: 1,041–1,042 total ranked assets (metadata varies slightly between refreshes), 461 IDP candidates, 544 rostered assets. Corrected-dynasty baseline IDPs top 100: 16; integrated candidate: 15. For 67 two-source market-supported IDPs, mean absolute IDP-rank disagreement 26.612 → 25.254. Dallas Turner overall #126/IDP #21 → #118/IDP #20. These values are *not* from the older, ineligible RotoWire-including composite.

## Live consumers — zero parity errors

On both baseline and candidate, the roster comprised **153 IDPs and 391 offensive players**. All 544 matched master-ranked identities. Their V319 canonical values matched `tradeValueNormalizationV130.canonicalValue`, `modeledPlayerValuesV319.playerValue`, `window.baseValue`, and the trade engine asset-value hook (when available): **0 mismatches**.

Three actual-rostered asset packages were tested for every variant: IDP-only (three players), offense-only (three), and mixed (two of each). `canonicalPackageValue`, the sum of player canonical values, and `window.packageValue` agreed in all six checks. These are real live-consumer calculations, in addition to existing synthetic Finder/Evaluator/history contract tests. They are **not** proof that all trade search filters or all historical trade modes have been exhaustively exercised.

## Important: offensive displayed values do move

Previous release descriptions saying "offense unchanged" refer to the **raw offensive dynasty valuation inputs**, not to the final normalized currency seen by users. V319's common master ranking and blended within-band gap scale depend on the entire offense/IDP ordering. Thus changing IDP modeled values legitimately shifts the ranks and displayed currency of many offensive players.

Measured cross-position currency difference on the same snapshot:

| Rostered category | Checked | Nonzero currency changes | Mean absolute change, all | Maximum absolute change |
| --- | ---: | ---: | ---: | ---: |
| Offense | 391 | 331 | 30.133 | 103 |
| IDP | 153 | 147 | 122.608 | 1154 |

For the rostered WR subset: 156 checked, 133 changed, mean absolute 31.603, maximum 100. The largest offensive changes were approximately 100 scale points near overall ranks 65–75. The biggest IDP currency shifts were associated with large rank corrections; e.g. Zyon McCollum 254→443 and Quentin Lake 139→197, not a standalone post-ranking currency multiplier.

**Release implication:** It is incorrect to promise no visible offensive-value changes, even though their raw offensive projections, dynasty consensus and career-context model were untouched. Large one-time IDP repricings could also create large historical value movements upon a future approved promotion. Avoid casually publishing or backfilling history; monitor version change attribution.

## Release decision

The integrated implementation and live canonical value paths are consistent. One major subsystem (IDP) has changed; all existing offensive model files and other features are untouched. **Keep PR #486 draft**, do not merge or deploy production. The next review should judge whether the measured shared-scale spillover and IDP repricing are acceptable and whether the historical value graph will correctly distinguish intentional model-version movement from actual market changes. No individual rank/valuation overrides, no unsupported source timestamps, and no unverified seasonal rankings are permitted.
