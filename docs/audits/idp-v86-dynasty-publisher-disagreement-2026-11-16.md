# IDP Dynasty Publisher Divergence and V86 Release Gate

**Evidence date:** 2026-11-16 UTC. **Status:** Research and release hold; no production deployment or merge.

## Scope and provenance

- Canonical repository: `dajuns5567/FFL-trade-finder`.
- Same-snapshot full-league source audit: [GitHub Actions #43796442547](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/43796442547), passed, 32-team league; network writes blocked.
- Verified source eligibility: The IDP Show Combined (published combined dynasty offense/IDP list) and DraftSharks (`https://www.draftsharks.com/dynasty-rankings/idp`).
- The IDP Show's extracted Datawrapper chart `gNM2r/1` **was linked directly from the publisher article** at audit time (`publisherArticleRevisionMatched=true`, `pinnedRevision=false`). `publisherLatestRevisionVerified=false` remains in source diagnostics; no independent claim that revision 1 is publisher's most recently updated chart.
- DraftSharks dynasty page extraction yields exactly 250 contiguous IDP ranks and verified dynasty URL.
- RotoWire `https://www.rotowire.com/football/cheatsheet-idp.php` is a current-season cheat sheet (`dynastyVerified=false`), excluded from dynasty valuation.
- All three feeds have network/extraction timestamps. **None provided a verified publisher-last-updated timestamp.** Never equate fetch time with publisher freshness; do not label a source stale based on this record alone.

## Source disagreement is systematic

The IDP Show's top-250 *combined offense and defense* ranking contains **76 IDPs**; DraftSharks contains **250 dedicated IDPs**. Positional ranks were calculated by filtering IDP Show's combined entries in their original publisher order and retaining DraftSharks' IDP ranks. Only unambiguous exact normalized name matches were paired.

| Measure | Result |
| --- | ---: |
| Exact, unambiguous common IDP names | 69 |
| Mean absolute disagreement | 33 ranks |
| Disagreement at least 35 ranks | 23/69 |
| Agreement within 10 ranks | 23/69 |
| IDP Show top-25 matched to DraftSharks | 24 |
| Mean absolute disagreement among those top-25 | 26.96 ranks |

| Player | IDP Show IDP rank | IDP Show combined overall rank | DraftSharks IDP rank |
| --- | ---: | ---: | ---: |
| Dallas Turner | 15 | 118 | 85 |
| Myles Garrett | 6 | 95 | 97 |
| Maxx Crosby | 16 | 120 | 51 |
| Aidan Hutchinson | 1 | 69 | 30 |
| Cedric Gray | 57 | 214 | 2 |

No matched source rank has been overridden. IDP Show's `originalRank` is combined overall rank and **must not** be treated as a defender-only rank. DraftSharks #85 for Dallas Turner is a publisher-reported IDP position, not a parsing artifact in the checked records.

## Verified Sleeper breakout context

Dallas Turner (Sleeper player ID `11667`): 2024: 282 defensive snaps/13 games, 4.96 league IDP PPG; 2025: 664/17, 11.71; 2026: 409/8, 17.71. Verified 2026 defensive snap participation 409/505 (~81%). The growth supports more opportunity in the current role, not a guessed talent grade. No forced player rank is justified.

## Full league comparisons (never mix source sets)

| Source population | Baseline | Tested candidate | Top 100 IDP count | Two-source positional rank MAE |
| --- | --- | --- | --- | --- |
| Legacy 7-source, includes seasonal IDP feed | V75 + original development cliff | V86 scoring + V85 monotonic | 17→16 | 31.298→29.347 (118) |
| Corrected dynasty eligibility: 2 IDP publishers | V75 + original development cliff | V86 scoring + V85 monotonic | 16→15 | 26.612→25.254 (67) |

The approved legacy composite placed Turner at overall #98 / IDP #17; V86+V85 in that **legacy source set** placed him #88 / #12. Corrected dynasty-only baseline placed him overall #126 / IDP #21; V86+V85 placed him #118 / #20. Do **not** report #12 as the accepted rank under corrected dynasty-only source eligibility.

V87 role-context-only counterfactual: four defenders gained context; Turner #20→#19, market MAE 25.254→25.224 (insufficient aggregate benefit to justify release). V87 is research-only.

## Conclusions and release guard

1. The top-100 IDP inflation came principally from V75 allowing up to 55% season weight based on games without independent playing-time evidence (historical 12→17 IDPs), not from V85's monotonic fix (+1 IDP).
2. V86 evidence-gates that mature share using actual defensive snaps and sustained performance. The model preserves original 20/45/35 IDP component weights, the 1.5-PPG history guard, full downturn consideration, and no player-specific boosts. V85 smooths the abrupt development-bonus cutoff at 550; downstream values are monotonic.
3. V86+V85 passes technical validation and improves ranking disagreement with both tested source mixes. **It has not been approved or promoted.**
4. The publisher disagreement makes exact consensus rank uncertain, particularly at DL/EDGE and for Turner. Do not invent source recency, subjective rank corrections, or substitute generic redraft/seasonal IDP rankings.
5. Decisions: keep V86+V85 in [draft PR #485](https://github.com/dajuns5567/FFL-trade-finder/pull/485), pending explicit acceptance of verified-dynasty IDP source eligibility and final multi-page checks. Keep source-provenance branch V77 and V87 experiments separate; one major subsystem per release. Never merge or deploy production without explicit authorization.

## Source artifacts

- [V86+V85 same-snapshot full-league acceptance](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/43793899126)
- [V86+V85 strict dynasty-source acceptance](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/43794229910)
- [Publisher-specific dynasty rank provenance](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/43794508886)
- [V87 context-only comparison](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/43794830379)
- [V89 cross-publisher gap and source-revision evidence](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/43796442547)
