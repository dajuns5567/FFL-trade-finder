# FFL release regression policy

This repository's **main branch** is the accepted functional baseline. Do not
release an unrelated subsystem from a stale branch just because its Netlify
Deploy Preview builds successfully.

## Required GitHub merge rule (one-time repository administrator setup)

In **Settings → Rules → Rulesets → New branch ruleset**, target the default
`main` branch, enable **Require a pull request before merging** and
**Require status checks to pass**, and select the precise check:

`Site version and refresh anti-regression gate / site-contract`

Also require the dedicated tests for the subsystem being changed. Disallow
bypass except for a deliberately documented emergency. Do **not** set an
automerge or production-deployment action. These repository settings cannot be
created by a code-only PR; repository admin must activate them.

## Before each Deploy Preview is accepted

1. Rebase/refresh the candidate on the **current main** before testing; do not
   overwrite newer code with an older branch snapshot. One major subsystem
   should change per PR.
2. Confirm the site-wide gate is green on the **latest commit**, not an earlier
   successful run. Ensure all relevant subsystem CI is also green.
3. Read the `RELEASE_FEATURE_COVERAGE` CI output. Pending features are
   explicitly **not included**; a preview must never be described as containing
   those changes. Once accepted on main, their removal makes CI fail.
4. Inspect the Netlify **Deploy Preview** commit SHA and navigate the affected
   page in an actual browser. Check Inquirer selector count, current-week
   awards, Player Milestones, All-Time Highs, Market Intelligence, Trade History
   and canonical Player Values as applicable.
5. Confirm dynamic reads reflect the most recently finalized Sleeper week.
   GitHub unit tests cannot establish live data correctness by themselves.
6. Keep production deployment blocked without explicit authorization.

## Why the gate exists

The guard renders the actual `site-v29` HTML, confirms critical runtime
scripts and their loading order, and rejects lower JavaScript cache versions.
It now also **compares the byte contents** of critical scripts with the PR
base: a changed asset must increment its `?v=` key so users cannot silently
keep an older script.

The independent **targeted Trade Finder runtime scripts** are also critical:
blank acquisition router, max-tier, tier-up, add-assets, max-value and specific-player
engines. They must remain present, retain their dependency order, and advance
`?v=` when their bytes change. Once the complementary-assets helper is
present, it must load after the router and before the targeted engines.
This guards the exact partial rollback that had left the compiled Finder in
place while restoring older targeted-filter logic. The test does not imply
PR #585 is included in an unrelated preview.

`audit-shared-release-features.mjs` checks the currently accepted baseline
for previously landed Inquirer, milestone, award, market and archive fixes.
Features still in isolated draft PRs are listed as pending, **not** silently
treated as present.

These protections reduce release regressions, but are not an end-to-end live
Sleeper/Netlify health guarantee. Production visibility and scheduled
publishing need independent readback checks and post-deployment acceptance.

## Section-by-section source readiness and version matrix

The CI-only `scripts/audit-section-readiness.mjs` checks 10 grouped section and
subsection contracts (navigation and trades; League Hub views; Awards and
All-Time Highs; Managers; Inquirer and Fleeced Daily; Market Intelligence;
Trade History; player/team Value History; League Hub APIs; market/history APIs).
Missing controls or reader routes now fail CI, with mutation tests proving the
checks reject each removed contract. These are *source-presence* checks, not
live API completeness or UI interaction certification.

The rendered-site cache comparison also checks **every loaded local JS asset**,
not just 20 critical paths: if any loaded script bytes change relative to the
pull request base, its browser `?v=` must increase. This protects subsections
like Home, Managers, Awards, and the header from stale compiled scripts.

As audited on 2026-11-22, changes still live in separate, **unmerged** PRs:
- #585 restores targeted Finder (compiled Finder v449 vs main v448).
- #583 fixes Market Intelligence / explanatory copy (Value History v544 vs main v541).
- #579 restores Player-of-the-Week milestone updates (Value History v542 vs main v541).
- #580 updates independent weekly League Hub awards (League Hub v544 vs main v543).
- #584 restores verified Hot Seat and durable All-Time Highs (League Hub v546 vs main v543).
- #578 improves Inquirer UI/editorial (League Hub v547 vs main v543).
- #581 verifies GitHub-published Inquirer readback.
A version in one preview does not imply that another PR's feature exists there.
Never simply adopt the highest script number or cherry-pick a stale entire
site loader. Reconcile only the specific subsystem change on the latest
accepted baseline, preserving already landed features and incrementing the
resulting script key, then run the full gate and live smoke.

**Preview limitations:** the existing Managers endpoint intentionally returns
HTTP 503 if no stored manager-history cache exists in read-only Deploy Preview;
that is a data-availability limitation, not proof the Managers page is healthy.
Likewise, award archives and scheduled publication require successful live
readbacks, and historical highs cannot be invented for missing observations.
Until tests and live protected-preview navigation pass, do not claim every
section is functioning or up to date.
