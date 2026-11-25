# FFL weekly automation — GitHub source-of-truth and release readiness

**Source reference:** immutable Preview #620 snapshot at commit
`b45ec3790c92c690ee74d2632deb47a2fa92cc8c`, branch
`archive/preview-620-frozen-20261124-b45ec379`.

This document and the read-only watchdog introduced in draft PR #623 are **not
authorization to merge or deploy production**. Preserve the one-major-subsystem-
per-release rule; release individual subsystems only after explicit approval.
Never use an accumulating preview branch as a multi-subsystem production release.

## Verified code paths in the frozen snapshot

| Feed | Writer / source | Wake or trigger | Validation and readback |
| --- | --- | --- | --- |
| Completed Sleeper league and weekly awards | `netlify/functions/weekly-awards-refresh.mjs` calls `league-hub.mjs:weeklyAwards({persist:true,strictPersist:true})` | Netlify scheduled function every 2 hours, **published production only** | Complete 32-team finalized matchups; independently verified offensive/defensive and manager awards; reads back `awards/weekly.json`; changes are idempotent |
| Player weekly milestones | `value-history.mjs` and `value-history-v276.js` | On player profile read and verified current weekly archive | All earned awards matched by Sleeper player ID, season, week and group, including Week 18; early awards are merged with complete historical scoring; **never cap the number of badges** |
| Value History / market snapshots | `.github/workflows/value-history-headless-refresh.yml` | GitHub scheduled twice hourly (at :17 and :47); due gate reduces writes | Canonical source/league checks, same durable writer lock and GitHub archive; the existing scheduled model remains explicit, never silently switch V96 to V101 |
| 20-category All-Time Highs | `.github/workflows/league-all-time-highs-independent-capture.yml` | GitHub daily, 05:27 UTC | Require 32 teams, 20 categories, verified source model and timestamps, monotonic best scores; read back independent GitHub data branch |
| Fleeced Inquirer | `.github/workflows/inquirer-github-native-publisher.yml` | GitHub scheduled at :19 and :49, **main branch only** | Editorial/source integrity, complete week, 32 team reports; commit to `inquirer-archive` and read back the published edition. **No dependency on League Hub awards** |
| KTC Dynasty Superflex | `netlify/functions/ktc-adapter.mjs` and `ktc-html-pages.mjs` | Canonical consensus refresh | Public, paginated, published overall Dynasty Superflex player ranks; >=300 unique valid offensive rankings with reduced weight; fail closed and visibly label a failed KTC update |
| Existing site interface | `netlify/functions/site-v29.mjs`, `league-hub-v451.js`, `value-history-v276.js`, other approved assets | Site opening and manual UPDATE where supported | Preserve canonical Player Values across Market, Finder, Evaluator, History, League Hub, Awards; verify actual runtime asset versions on each release |

## Critical activation distinction

GitHub Actions **schedule events execute from the repository default branch**.
Netlify scheduled functions require a **published production deployment**; they
do not run inside Deploy Previews. The frozen Preview #620 branch is preserved
in GitHub, but it is not an automatic deployment/publisher.

As checked on November 24, 2026:
- `main` has the older scheduled Value History and GitHub-native Inquirer
  workflow, but does **not yet contain** the frozen snapshot's
  `netlify/functions/weekly-awards-refresh.mjs` or independent scheduled
  `league-all-time-highs-independent-capture.yml`.
- The current Netlify configuration deliberately blocks normal production
  builds. Do **not** disable this guard automatically.
- The 639 archived All-Time Highs were available via Netlify Blob, but the
  independent GitHub durable readback previously returned zero. Draft PR #615
  preserves the reviewed archive; a future release must verify the exact
  archived data independently before declaring GitHub durability complete.
- Passing unit tests or finding 7/7 sources once does not establish
  unattended weekly publishing. Repeated live source validation and publisher
  readback are acceptance requirements.

## Per-subsystem rollout checks after explicit authorization

1. **Freeze and compare:** compare the proposed change against the pinned
   snapshot and verify no unrelated source or asset version regressions.
2. **Test:** run `node scripts/verify-weekly-automation-contract.mjs` and the
   associated existing source-specific tests. Do not lower source thresholds to
   satisfy a failing CI run.
3. **Week boundary:** use the most recently *completed, source-verified* Sleeper
   league week. Do not infer a result from current NFL date or a partially
   scored matchup.
4. **Independence:** badge/League Hub refresh and Inquirer publication must
   run independently. Failure in one must be reported but never silently block
   other fully verified domains.
5. **Readback:** compare source week, all 32 roster results, winners, team
   standings, original trade/pick context, 20 All-Time Highs categories,
   and edition/award archive indexes to the **actual** persisted record.
6. **Failure:** retain verified history; clearly identify stale or unrefreshed
   sources, preserve prior dates, and produce a failing monitor/CI check.
   Never use mock data as newly refreshed consensus, fabricate award wins,
   overwrite verified previous highs, or silently claim publication.
7. **Only then:** separately approve the release/production actions required
   to activate that subsystem. No batch merge or automatic production deploy
   is permitted by this readiness document.

## Permanent regression protection

`.github/workflows/weekly-automation-regression-guard.yml` is read-only.
On PRs it verifies all source contracts and the immutable frozen branch. After
a separately authorized merge to default `main`, it also runs daily at
08:43 UTC. Any missing schedule, publisher guard, source validation, or
readback step fails the workflow visibly. This is a **source/CI watchdog**,
not a replacement for live completed-week and archival monitoring.

No secrets are logged; no production state or GitHub data archive is modified
by this monitor. Its tests should be expanded as individual weekly subsystems
are released, with each test pinned to the approved behavior.
