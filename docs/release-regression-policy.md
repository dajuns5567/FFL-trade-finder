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

`audit-shared-release-features.mjs` checks the currently accepted baseline
for previously landed Inquirer, milestone, award, market and archive fixes.
Features still in isolated draft PRs are listed as pending, **not** silently
treated as present.

These protections reduce release regressions, but are not an end-to-end live
Sleeper/Netlify health guarantee. Production visibility and scheduled
publishing need independent readback checks and post-deployment acceptance.
