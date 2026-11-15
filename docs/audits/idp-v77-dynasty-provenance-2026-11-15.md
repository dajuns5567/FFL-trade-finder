# IDP dynasty-source provenance audit — 2026-11-15

**Status: draft, not accepted for production.** Isolated PR #478 targets combined draft PR #466; no merge, publication, production deploy, V311/V319 rank-to-value change, offense model change, or player-specific adjustment.

## Repository-confirmed source mismatch

| Source | Prior active input | Configured/candidate |
|---|---|---|
| DraftSharks IDP | `https://www.draftsharks.com/rankings/idp/superflex` (does not establish dynasty scope) | `https://www.draftsharks.com/dynasty-rankings/idp` |
| RotoWire IDP | `https://www.rotowire.com/football/cheatsheet-idp.php` (general-season cheat sheet, no verified dynasty scope) | Extraction remains observable, **not eligible** for dynasty consensus |
| The IDP Show Combined | Dynasty-specific combined rankings | Remains eligible |

The published DraftSharks dynasty path returned **250 valid rank-ordered rows** in a dedicated integration test. Its top five in that test were Carson Schwesinger, Cedric Gray, Sonny Styles, CJ Allen and Dillon Thieneman. The old general-season DraftSharks URL also returned 250 rows, demonstrating two distinct ranking universes; only the dynasty-specific source is eligible.

The rule now separates **successful data extraction** from **verified dynasty consensus eligibility**. A contiguous, valid list does not by itself prove the publisher uses dynasty horizons. No guessed ranking replacement is allowed.

## Controlled read-only impact (PR #478 CI, 7-source adapter run)

Both baseline and candidate used **exact same Sleeper data, six unaffected publisher feeds, 20/45/35 IDP scorer, career development logic, V72/V74, and 120–9,999 rank-based trade currency**. Only dynasty source eligibility/data changed; all Netlify consensus POST responses were fulfilled inside the browser test instead of writing to production.

| Metric | Previous PR #466 | Candidate V77 |
|---|---:|---:|
| Rankable players | 1,037 | 1,041 |
| Rankable IDPs | Not separately captured in that run | 461 |
| Offensive modeled value changes | — | **0** |
| IDP scoring-history changes | — | **0** |
| IDP career-context changes | — | **0** |
| Player IDs added / lost to ranking universe | — | 26 / 22 |
| IDPs whose positional rank moved | — | **404** |
| Moves greater than 10 IDP ranks | — | **204** |
| Moves greater than 20 IDP ranks | — | **172** |
| Moves greater than 50 IDP ranks | — | **102** |
| IDPs with two real market sources | 117 (prior separate audit) | **67** |
| Unverified RotoWire ranks admitted | Previously yes | **0** |

IDP representation inside overall top 25 / 50 / 100 / 150 / 250: prior **0 / 5 / 17 / 30 / 55**, candidate **0 / 2 / 16 / 29 / 48**.

Illustrative rank movements (all from single same-snapshot browser comparison):

| Player | Prior overall / IDP | Candidate overall / IDP | Candidate market IDP rank |
|---|---|---|---|
| Will Anderson Jr. | 29 / 1 | 34 / 1 | 14.5 |
| Myles Garrett | 33 / 2 | 38 / 2 | 51.5 |
| Dallas Turner | 98 / 17 | 126 / 21 | 50 |
| Aidan Hutchinson | 55 / 6 | 98 / 16 | 15.5 |
| T.J. Watt | 37 / 3 | 61 / 5 | 180 (one verified source, conservative floor) |
| Carson Schwesinger | 112 / 20 | 83 / 11 | 3 |
| Cedric Gray | 769 / 205 | 311 / 68 | 29.5 |
| Jack Campbell | 336 / 82 | 153 / 32 | 6.5 |
| David Bailey | 218 / 46 | 146 / 28 | 26.5 |

## Acceptance decision

**DO NOT promote yet.** The provenance problem is real and the dynasty-specific source is technically valid, but the corrected feed redistributes the player universe and dramatically changes rankings for 404 IDPs. It also reduces double-source coverage to 67 players; many unsupported players must fall back conservatively. This is *not* a small equivalent source substitution and should not be included silently in a routine model refresh.

A safe release requires:
1. Audit missing/added IDP identities against roster eligibility and zero-scoring fallbacks.
2. Review dynasty-market coverage for players excluded from the two remaining verified dynasty feeds (do not reintroduce general cheat sheets as substitute).
3. Verify source-manifest eligibility labels and exact candidate values in Finder, Evaluator, Player Values and Trade History on a deploy preview.
4. Retain fully green PR #466 HEAD `4804e2002f61956707893ed5a07138ab66e5e0d1` as the untouched rollback baseline.

Full numerical details and exact observed ranks are also in the read-only CI workflow named **IDP V77 seven-source dynasty provenance impact** on PR #478.

## Alternate dynasty-IDP source viability (read-only integration)

The repository already lists two additional purportedly dynasty-specific IDP endpoints, but the current generic parser could not verify usable rank lists:

| Configured source | Read-only adapter result | Decision |
|---|---|---|
| PFF IDP, `/news/fantasy-football-dynasty-idp-rankings` | Invalid; one extracted row was a 404 warning rather than a player | Not eligible |
| Dynasty Dealer IDP, `/rankings/idp` | Invalid; zero rows parsed | Not eligible |

These providers cannot be silently counted as substitutes. Do not invent, infer, or import dynasty rankings from their source names alone. The available verified IDP-dynasty population remains The IDP Show Combined plus the 250-row DraftSharks dynasty feed, with only **67 IDPs supported by two actually matched sources** in the controlled candidate snapshot.

A larger consensus-covered IDP universe requires additional **verified current dynasty-specific data** or a safely maintained publisher-specific parser, not a reversion to a redraft/general-season cheat sheet. Until then, the V77 draft remains blocked from release despite clean parser and model regression tests.

## November 15 follow-up: active league roster preservation and zero-consensus risk

The source-matched browser audit now explicitly reads `state.rosters[*].players` from the same 32-team Sleeper snapshot. Results:

- **544 of 544** current rostered players were ranked before and after the source change. Zero rostered players disappeared or appeared solely due to dynasty source correction.
- **153 rostered IDPs** were evaluated for actual publisher matches: **59** with at least two verified dynasty-source matches, **68** with one, and **26** with zero. Of the 26 source-unsupported rostered defenders, **5** also had zero qualifying Sleeper production history.
- **No top-30 IDP** lacked a verified listed dynasty source in the observed candidate snapshot.
- Examples of ranked, rostered players with zero verified source matches despite historical production include Marlon Humphrey, Byron Murphy Jr., Denzel Ward, Alex Anzalone, Demario Davis and Sauce Gardner. Their presence is retained by the existing production-history or conservative fallback; it is **not** evidence of an invented consensus ranking.

**New guardrails:** unverified season-format IDP rows are quarantined from reusable published dynasty-source snapshots, not merely omitted from the composite; legacy last-known-good data without explicit dynasty-provenance markers is rejected as a fallback when source refresh fails. Tests enforce that validated extraction and dynasty eligibility are different facts, and that old general-season cheat sheets can never re-enter the consensus via the cache.

Release decision remains **not accepted** despite current technical test passes. The 67 two-source players overall and the 59 two-source rostered defenders are insufficient independent coverage for a high-confidence wholesale replacement of the approved preview. All 544 rostered assets remain identifiable, but lack of actual market data for the 26 unsupported IDPs remains a material uncertainty, not a license to guess.
