# FFL Trade Finder — release decision record (2026-11-14)

**Status: RELEASE HELD.** This document is a validation record in draft integration PR #466. It is **not permission** to merge, deploy production, publish Inquirer editions, or enable a scheduled publication worker.

## What has actually passed

- Full 1,036-player post-V73 read-only consensus/production/ranking audit: no confirmed value/rank inversions, duplicate Sleeper IDs, missing zero-evidence safeguards, or canonical-value mismatches.
- 2026-11-14 final offline Chromium run for PR #466 at `6b1a328cff012dfd99cd95c468a184d9c1c44205` → **PASS** (`Final offline Chromium trade acceptance (draft only)`, Actions #43649097390): 93 scripts load; zero missing JS/CSS; 30 unique ownership-correct trade candidate packages; 42 complete simulated recommendations with valid owners and finite fairness; 12/12 cross-page value/History tests. External/writable requests were blocked. **This is an offline, synthetic league-data browser acceptance, not a signed-in live-Preview transaction.**
- Combined valuation/history contract, original Market Intelligence recovery, IDP audited 20/45/35 calibration, integrated IDP identity and development, IDP scoring smoke, Finder runtime smoke on same commit → PASS.
- Isolated PR #469 deployment safety: Inquirer editorial revision 6 and Finder runtime smoke both PASS at `1188c5e0dc8dad0bd6363f27116a6ef2c272f040`. The Inquirer smoke on PR #466 has now **PASSED**. At code commit `6b1a328cff012dfd99cd95c468a184d9c1c44205` all **eight of eight** required GitHub Actions workflows completed successfully, including both long-running Inquirer editorial revision 6 and Finder runtime smoke. This subsequent documentation-only commit does not change executable code.
- Canonical Netlify **Deploy Preview**, never production: `https://deploy-preview-466--precious-dango-fb4633.netlify.app` is ready for build `6b1a328c` (Netlify deploy `6af8e2be88e18661a8e4c42a`).

## Dependency and overlap map — do not merge PR #466 as one release

| Subsystem / independent release unit | Draft PR | Key source | Required sequencing |
|---|---|---|---|
| Deployment safety & Inquirer CI guard only | #469 | `netlify.toml` (must **not** allow production), trigger for Inquirer CI | **First** if any deployment policy is eventually authorized; do not replace with an older branch's `netlify.toml` |
| Offense dynasty-PPR valuation, consensus / production / context / development | #463 | `valuation-offense-v40.js` (final 60/23/12/5) | Independent; must preserve future merge target's production block and approved preview allowlist |
| IDP valuation and source identity | #467 (supersedes #464's earlier draft work) | `valuation-idp-*.js`, `netlify/functions/consensus-composite-v3.mjs`, `ui-player-values-v139.js` | Release **one IDP subsystem**. #467 contains #464's IDP branch plus V73 correction; do not merge both or duplicate/conflict. Keep offense source matching intact |
| Value History preview snapshot isolation | #465 | `value-history-v276.js`, `netlify/functions/value-history.mjs` | Separate History subsystem release or combine with other **History-only** patch after rebase |
| Trade History Hindsight current-value consistency | #468 | `value-history-v276.js` | **Overlaps #465**; rebase onto the merged/current history branch and verify both guards survive, without rewriting archived at-trade records |

All source-changing PRs remain **drafts**. #463, #464 and #467 also modify `netlify.toml` or wider renderer files; accepting their raw outdated config could re-enable production. **Never blindly merge or cherry-pick the entire PR without verifying build-ignore policy against the latest approved baseline.** Treat production deploy gating as a release-blocking invariant.

## Browser and release gates not yet satisfied

1. **Complete at validated code commit `6b1a328c`:** all eight required workflows green, including full Inquirer season smoke. Confirm again after any future executable code change, without skipping or relaxing editorial guards.
2. Record evidence from an authenticated **read-only** visit to exact Deploy Preview #466 for real Sleeper league scoring and trades, covering Boston, Turner, Warner, IDP-source collisions, nearest/future draft picks, Finder, Evaluator, Hindsight, and Value History UI. The offline controlled-fixture Chromium tests are not a substitute for the real league.
3. Review weekly Inquirer publication lifecycle **separately** from valuation: do not enable production publishing or change publication policy in a valuation release.
4. Obtain explicit owner authorization **for each release/production deploy**; the earlier instruction to proceed with audits was not authorization to merge. Do not trigger production automatically through GitHub merges.

## Evidence references

- `docs/COMBINED-VALUATION-ACCEPTANCE-2026-11-14.md`
- `docs/IDP-SOURCE-INTEGRITY-AUDIT-2026-11-14.md` (IDP-only PR #467)
- `tests/combined-cross-page-canonical-currency.test.mjs`
- `tests/trade-history-ranked-unrostered-hindsight.test.mjs`
- `.github/workflows/final-offline-trade-browser-acceptance.yml`

**Freeze canonical player formula edits unless new independently verified evidence demonstrates a regression.** Avoid manual player boosts or invented dynasty consensus.

## Final real-league acceptance reported two additional issues (2026-11-14)

The owner uploaded screenshots from the exact live-data Deploy Preview #466. Original Trade Analysis omitted a 2027 R1 historical projected slot, and Select All + Maximum Value Received + exact Jonathan Taylor target + Tier Up left Finder searching until the browser crashed. This integration-only branch now includes two **separately drafted subsystems** for acceptance: PR #468 (Trade History: verified 50/50 at-trade slot then archived dated snapshot projection with explicit provenance or an explicit unavailable message, never a guessed rank) and PR #470 (Finder: preindexed outgoing package structures and periodic event-loop yields instead of repeated full rescans). Historical pick *values*, ranking policy, and offensive/IDP valuation weights remain unchanged. Verify each independently before authorizing a separate release. Previous eight-green gate describes prior code commit, not this new integration commit; all checks must be rerun.
