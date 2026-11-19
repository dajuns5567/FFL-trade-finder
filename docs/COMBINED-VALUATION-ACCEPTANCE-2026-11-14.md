# PR #466 final read-only valuation acceptance audit — 2026-11-14

Source: user-generated `ffl-final-full-player-audit-2026-11-14T22-04-00-302Z.json` from the exact canonical Deploy Preview #466 at commit `646a2e66500881ae48df2ceaa351ec65e7dbddb3`, compared against previously uploaded `ffl-full-valuation-audit-2026-11-14T20-58-44-127Z.json` from the pre-IDP-V73 Preview #466. Both exports are **observation snapshots**, not external ranking authorities. Do not treat unobserved source facts as verified.

## Result

- Previous audit 1,041 players, five false-positive offense precision flags and no actual order inversions.
- **Final audit 1,036 ranked: 74 QB / 248 WR / 155 RB / 102 TE / 457 IDP**. **0 actual errors, 4 review flags**, zero ID/rank/precision/final-value inversions. `historyComplete=true`.
- 1,035 Sleeper IDs in common across two snapshots; **1,005/1,035 (97.1%) preserve the same integer modeled TV**. No top-100 player changed overall rank.
- All five source-free / scoring-free defensive players are *still present* but now have conservative scoring input 180 and significantly lower model TV:
  - Justin Jefferson (defender ID `13524`): overall #724→#959, TV 206→124
  - Bud Clark (`13452`): #730→#961, 204→122
  - Isaiah Foskey (`10909`): #732→#963, 203→121
  - Tycen Anderson (`8377`): #743→#970, 198→118
  - Johnathan Edwards (`13107`): #744→#971, 198→118
- Six **consensus-only IDPs with no qualified regular-season scoring** disappear from the unrostered player candidate universe after publisher near-name identity protection: Josh Allen ID `2212`, Cam Thomas `573`, Carl Davis `2395`, Marcel Jones `1187`, Chris Gonzalez `5404`, Jonathan Cooper `1574`. This matches `valuation-idp-v21.js` `universe24()`'s existing eligibility rule (rostered players OR verified publisher consensus OR qualified current scoring), rather than a model-pricing failure. They lost the only provisional source evidence; **verify roster status before ever changing this eligibility rule**. Do not restore a guessed source ranking or delete these Sleeper identities from the underlying roster database.
- One newly included fallback TE Gavin Bartholomew (Sleeper ID `12700`, overall #1035, TV 1, displayed Value 120) has no publisher consensus or scoring; V384 conservative fallback is active. The audit does not establish why the player candidate universe changed between the two page-load snapshots.
- Quinnen Williams (`6118`) TV 264→253, overall #485→#546 after the identity guard. No manual targeting.

## Priority checks

| Player | Overall / position | Model TV | 2026 games and actual PPG |
|---|---|---:|---|
| Denzel Boston | #91 / WR31 | 523 | 9; 11.411 |
| KC Concepcion Jr. | #82 / WR29 | 550 | 8; 10.863 |
| Jaylen Waddle | #98 / WR32 | 512 | 9; 9.111 |
| Dallas Turner | #129 / IDP18 | 446 | 8; 17.713 |
| Fred Warner | #139 / IDP21 | 436 | 8; 17.431 |
| David Bailey | #125 / IDP16 | 454 | 8; 21.369 |
| Myles Garrett | #37 / IDP2 | 719 | **2**; 20.55 |
| Micah McFadden | #226 / IDP41 | 365 | **2**; 22.5 |

These values are **not** per-player price targets; they are immutable audit observations. The IDP final weights remain 20% consensus / 45% Sleeper production / 35% age, league, role and other context. Offense V50 final weights are 60% consensus / 23% production / 12% context / 5% development; the 63/25/7/5 `offenseScoringAudit` trace is an earlier stage, *not* the terminal V50 mix.

## Four review flags, no failing invariants

1. Myles Garrett: 2026 PPG 20.55 is **2-game sample** but historical seasons include 17 games in 2025 and 17 in 2024. Production confidence 1 accounts for broader history, not current-year sample completeness.
2. Micah McFadden: 2026 PPG 22.5 is a **2-game sample**. Earlier qualifying historical seasons exist; do not project 22.5 across a full season.
3. Marlon Humphrey: no dynasty publisher consensus, but four qualified Sleeper seasons (overall #337 / IDP72); conservative scoring-backed fallback appropriately retained, no invented consensus.
4. The name **Byron Murphy** applies to distinct IDP Sleeper IDs `5864` (CB Byron Murphy Jr.) and `11668` (DL Byron Murphy II). Different positions and IDs; this is a **name collision**, not a duplicate ID. Explicit source-ownership tests guard against sharing.

`window.idpSourceIntegrityAuditV73()` examines **427 explicitly eligible individual defensive players**, not all **457** entries bucketed as IDP by `index.html`'s generic `groupPos`. The other **30 are offensive-line (OL/T/G/C) players** classified under the generic non-QB/RB/WR/TE catch-all. They are deliberately excluded by `isIndividualIdp25` from the defensive production/scoring algorithm. Do **not** mistake the 427/457 diagnostic denominator difference for 30 missing scorers. Whether OL deserves its own classification is a separate subsystem decision and should not be mixed into an IDP source release without reviewing the league's OL roster/scoring settings.

## History/preview distinction

The 2026-11-14T21:29:10.124Z archived observation remains:
- Boston historical #104 / 4,707 versus preview #91 / 5,008.
- Turner historical #114 / 4,477 versus preview #129 / 4,125.
- Warner historical #109 / 4,591 versus preview #139 / 3,921.

These are intentionally different datasets. PR #465 prevents preview writes contaminating the history archive. **Do not rewrite the production archive to match an unmerged draft preview.**

## Acceptance boundaries

The full Finder runtime smoke, IDP scoring smoke, IDP 20/45/35 calibration, integrated IDP identity/development, Original Market Intelligence Recovery, and combined valuation/history CI passed on `646a2e6`. The unrelated Inquirer editorial workflow failed; do not disable its guard. No production deployment or merge authorized. This **does not** certify every cross-page browser UI pathway or real-time external publisher freshness: those require separate evidence. Keep PR #466 a DRAFT and retain subsystem PRs #463, #464, #465, #467 as independent release units.
