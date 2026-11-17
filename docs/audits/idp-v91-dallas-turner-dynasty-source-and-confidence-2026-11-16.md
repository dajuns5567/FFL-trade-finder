# Dallas Turner V91 causal IDP audit — strict dynasty-only sources

**Date:** November 16, 2026 UTC  
**Repository:** `dajuns5567/FFL-trade-finder`, canonical source files from integrated draft PR #486  
**Audit-only draft:** [PR #490](https://github.com/dajuns5567/FFL-trade-finder/pull/490)  
**Release status:** **NO CHANGE RECOMMENDED FROM THIS AUDIT YET; NO DEPLOY OR MERGE.**

## Verified live source discrepancy

The IDP Show's combined offense/defense dynasty list contains 76 defenders in its published top 250. Filtering that list in publisher order puts **Dallas Turner IDP #15**, combined-publisher overall #118. Current DraftSharks **dedicated dynasty IDP** list contains 250 defenders and places **Dallas Turner #115**. The two equal-weight eligible feeds give the expected positional IDP consensus rank **(15+115)/2 = 65**, which the exact composite code records as `idpRank:65` and transforms to `consensusCompositeValue:275`.

Earlier research extracted DraftSharks #85 (same eligible URL). Its subsequently observed rank of #115 is a **30-place source-list change** between source snapshots. Neither source exposes a validated publisher publication/update timestamp. This audit cannot establish why the source list changed, whether it reflects a legitimate editorial update, or which ranking should be trusted more. RotoWire seasonal IDP is correctly excluded. There is no demonstrated incorrect ID mapping, parser alias error or mysterious stale build at this stage.

## Verified Turner component breakdown

| Element | Source-derived value |
|---|---:|
| Overall rank / defender rank | **#119 / IDP #20** |
| Modeled IDP value | **480** |
| IDP Show rank (among defenders in top-250 combined) | 15 |
| DraftSharks dynasty IDP rank | 115 |
| Effective consensus rank / value | 65 / **275** |
| Offensive/IDP weight vector | **20% dynasty consensus / 45% production / 35% context** |
| Scoring component | **698.89** |
| Dynasty context component | **774** |
| Evidence-weighted PPG | 14.038 |
| Legacy weighted PPG / uncapped new PPG | 12.538 / 14.063 |
| V86 verified opportunity-based current-year share | **55%** |
| Confidence | **0.875** |
| V65 young defender development factor | **1.056**; already applied |
| Age / experience | 23 / 2 years |
| Context subcomponents | development index .9234, trajectory index .65 (capped), continuity index .5583 |
| Verified 2026 defensive snaps | 409 / 505 team snaps (~81%) |
| Qualified observed seasons | 3 |

Current season league IDP production cited from audited Sleeper: 2024 4.96 PPG in 13 games/282 snaps, 2025 11.71 PPG in 17 games/664 snaps, 2026 17.71 PPG in eight games/409 snaps. Source data already supports the mature current-season snap weight; no further blanket season boost is justified by a missing opportunity signal.

The model already assigns a **higher dynasty context score to Turner (774)** than Will Anderson Jr. (762), Aidan Hutchinson (707), and Nakobe Dean (746). Even raising Turner's context to its hard cap would add at most about **19** final IDP value points, short of the current ~27-point value gap to IDP #16 (Nakobe Dean, 507). This is not principally a missing age/development context multiplier. Changing context alone cannot defensibly manufacture rank #16.

## Causal rank comparison: currently #16 Nakobe Dean

| Component | Dallas Turner (#20) | Nakobe Dean (#16) |
|---|---:|---:|
| Consensus | 275 | 439 |
| Production score | 699 | 711 |
| Context | **774** | 746 |
| Modeled IDP value | 480 | **507** |

Nearly the entire rank gap is attributable to legitimately different dynasty publisher consensus input combined with marginally lower evidence-weighted career production. Context already favors Turner. For Turner, the 1.5-PPG volatility guard changes uncapped 14.063 to 14.038, so removing it cannot close the gap. V65 5.6% young-defender bonus is already active; it must not be applied twice.

## Fully computed read-only same-snapshot sensitivity

Tested a uniform hypothetical rule: three consecutive seasons (including current >=8 verified games), total >=35 games, previous >=12 games, oldest >=8, current 250+ defensive snaps / 65%+ team snaps, previous >=200 snaps and oldest >=150 snaps qualify for a conservative scoring confidence floor. No player-specific targeting or changed publisher feeds. Compared exactly the same 32-team Sleeper and seven-source snapshot with two eligible dynasty-only IDP publishers against V86+V85.

| Model | Turner's IDP rank | Turner IDP value | IDPs overall top 100 | Market rank MAE on 67 two-source IDPs |
|---|---:|---:|---:|---:|
| Existing integrated V86 + V85 | **20** | 480 | 15 | **25.500** |
| Research floor .95 | **18** | 495 | 15 | 25.649 |
| Research floor 1.00 | **17** | 504 | 15 | 25.724 |

Both trials affected 26 defender final values (11 increases, 15 decreases through downstream relative ranking/curve adjustments), while offense and no-qualified-scoring defenders remained unchanged. The .95 trial also raised Kamari Lassiter by 18, Tykee Smith by 11 and Devin Bush by 10; the 1.00 trial raised these by 30, 19 and 17 respectively. This demonstrates systematic impact, not a special Turner override, but **market agreement worsened** and restoring #16 was **not** supported by either trial.

**Audit runs:** [development cohort #43985380762](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/43985380762), [source rank / source-score trace #43986153639](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/43986153639), [uniform confidence sensitivity #43986537051](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/43986537051). All succeeded, and all provider refresh POSTs were fulfilled **locally without any Netlify writes**.

## Decision / next evidence needed

**Do not promote a confidence multiplier solely to deliver Turner #16.** The current live data places him #20, and the stringent, fully computed alternative places him #17 at the expense of wider publisher agreement. The main outstanding valuation question is whether DraftSharks's apparently rapid Turner #85→#115 source-list movement is stable and publisher-justified. Provenance and repeatable source content hashes / actual verified publisher timestamps would be required before preferring a particular source or suppressing a valid source update. Keep V86+V85 / V77 strict dynasty consensus and V90 separate history safeguards as drafts. Preserve approved production. No invented source freshness dates or player-rank exceptions.
