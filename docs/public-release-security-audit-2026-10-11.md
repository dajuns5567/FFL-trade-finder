# Fleeced! public-release security audit — preliminary, 2026-10-11

Scope: source review of PR #390 on `player-signal-layer-r1`, not a live penetration test. **Not approved for public release.** No production deployment or merge authorized.

## Confirmed high-priority findings

1. **Unauthenticated value-history writes (critical).** `netlify/functions/value-history.mjs` accepts arbitrary external `POST` requests on non-preview hosts, guarded only by matching the league identifier and a minimum count of rows. The route writes new snapshots, index entries, and latest metadata to Netlify Blobs. Anyone who knows the public league ID and produces enough syntactically valid rows may contaminate history. Preview protections do not protect publicly deployed production.

2. **Unauthenticated League Hub award/draft mutations (high).** `netlify/functions/league-hub.mjs` exposes POST paths under `draft_records`, `award_highs`, and `awards` that save client-supplied records in Netlify Blobs without an authorization check. Existing preview guards explicitly disable many of these in deploy previews, but they do not protect a public production deployment.

3. **Unauthenticated consensus source promotion (high).** `netlify/functions/update.mjs` accepts POST player lists; on non-preview it runs refresh and may overwrite `fleeced-consensus-lkg` data. No authentication check is present. This is both state-integrity and resource-exhaustion risk.

4. **Unauthenticated publishing triggers (high).** `netlify/functions/inquirer-publish-on-load.mjs` invokes `weeklyReport(req)` without authenticating the caller on production. `netlify/functions/inquirer-publish-scheduled.mjs` and `netlify/functions/inquirer-projection-capture-scheduled.mjs` likewise check preview-only restrictions but not request origin/authorization. Publishing uses internal completed-week and approval checks, but untrusted web visitors must not be able to invoke privileged publisher paths.

5. **Bulk history export on production (medium, policy-dependent).** `value-history.mjs` serves `GET ?archive_export=1` from live buffers on non-preview hosts. It is blocked in preview, but production access is unrestricted. Confirm whether all team/player value history is intended public data before releasing.

## Existing safeguards confirmed

- `netlify/functions/preview-read-only.mjs` detects Netlify deploy-preview, branch-deploy, and the legacy dedicated browser-CI project; it prevents multiple mutations in those contexts.
- `league-hub.mjs` respects `INQUIRER_APPROVED_THROUGH_WEEK` for the future-publication approval gate.
- Week 3 archival tests, Week 4 live editorial audit, projection integrity, and forward freshness previously passed at commit `bba28ea`.
- The new project `extraordinary-toffee-98c3b7` requires team SSO; this prevents anonymous browsing **today** but is not a substitute for per-route authentication once that requirement is removed for public launch.

## Required release gates

1. Inventory **every** Netlify function with GET/POST side effects, not just these confirmed routes, and classify public-read / authenticated-write / scheduled-only.
2. Use server-side authorization for writes. Do not embed a shared admin secret in browser JS; distinguish authenticated admin actions from anonymous page-load snapshots. Any scheduled-only function must reject untrusted direct HTTP calls. Fail closed if credentials are unavailable.
3. Update browser/client workflows to use protected server-side mutation paths; ensure legitimate value-history capture remains functional without granting visitors arbitrary blob write privileges.
4. Add negative integration tests verifying anonymous POST requests cannot update value history, awards, consensus snapshots, or trigger publication, including on production-context requests. Verify authorized scheduled flows still work.
5. Determine whether bulk history export is meant to be publicly accessible, and gate it accordingly.
6. Scan entire tracked repo **and hosting environment settings** for accidentally published tokens / secrets, and rotate any discovered. This document's sampled files do not establish repository-wide secret safety.
7. Retest on an access-controlled preview, then explicitly approve a controlled public release. Keep PR #390 unmerged and Week 5 unpublished pending authorization.

No production changes were made as part of this audit.
