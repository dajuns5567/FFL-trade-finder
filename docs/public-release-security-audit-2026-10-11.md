# Fleeced! public-release security audit — findings and PR remediation, 2026-10-11/12

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

## PR #390 remediation implemented on the draft branch (October 12)

**Not deployed to production. This section describes source-code fixes only.**

- **Privileged mutations:** `privileged-write.mjs` now requires a valid `Authorization: Bearer <token>` header matching a 32+-character `FLEECED_SERVER_WRITE_TOKEN` available solely in server-side Netlify environment variables. Comparison uses `timingSafeEqual`; missing or weak tokens fail closed. Do not send this token to browser JavaScript.
- **Value History:** public POST snapshots and raw GET `archive_export=1` are blocked; unauthenticated GETs cannot trigger history maintenance deletion or mutation. The public UI stops retrying after a 401/403, avoiding repeated writes and unexpected Netlify cost. Durable GitHub Actions headless snapshots remain independent of the anonymous browser endpoint.
- **Consensus update:** public and preview POST `update` requests can perform **calculation only**, with a bounded player list and short in-process provider-fetch coalescing. Only authenticated server calls can promote a last-known-good consensus into Netlify Blobs.
- **League Hub:** POST draft, awards, and high-score changes require server authorization. Public GET `weekly=1` returns an archived, previously published edition rather than running the mutating newsroom publisher. The manager-history and weekly-awards read paths no longer write Netlify Blobs for anonymous visitors.
- **Inquirer:** on-load and background publication triggers are authenticated; Netlify-native scheduled functions remain the trusted periodic publishers and keep the existing approval gate. Public read routes for broadcasts, reporter archives, weekly awards, and latest edition recheck approval (`INQUIRER_APPROVAL_SEASON` default 2026 and `INQUIRER_APPROVED_THROUGH_WEEK` default 4), so a stored unapproved Week 5 cannot be disclosed by those endpoints.
- **Debug probes:** 15 diagnostic source-scraping and provider-audit endpoints reject unauthenticated users before making external requests, reducing resource abuse and inadvertent exposure.
- **Headers:** added `nosniff`, clickjacking, referrer, and browser permission protections in Netlify asset configuration and the dynamic homepage response.
- **CI:** added real handler-negative tests, a history write authorization unit test, Week 5 release-gate assertions, debug-probe checks, and a tracked-file credential-pattern scanner. CI evidence is commit-specific; do not infer passing status for the latest branch from an older successful run.
- **Archival:** optional authenticated HTTP export support was added for a GitHub Actions server-side archival job. Do not publish a token to the site or this repository.

## Remaining release blockers (must be resolved before turning off SSO)

1. **Public page-load history capture:** anonymous client-supplied values cannot safely mutate the authoritative history store. The current security patch rejects these writes. The scheduled GitHub-native history collector and historical charts remain independent, but the preexisting **new snapshot on every browser load** contract is **not preserved**. Either implement an independently calculated, trusted server-side capture service, or obtain the owner's explicit approval to use scheduled-only history updates. Do not treat the latter as an implicit product change.
2. **Authenticated server storage integration:** `FLEECED_SERVER_WRITE_TOKEN` is not configured through the current tools; unless provisioned, all normally privileged HTTP writes correctly return 403. Authorized archive and administrator workflows also need the secret when using those routes. The current GitHub/Netlify connectors cannot set repository Actions secrets or site-level Netlify environment variables.
3. **Automatic awards/draft writes:** legacy browser POSTs for draft records, awards, and high scores are now denied. Existing stored records remain readable. A trusted server-side job or an explicitly authenticated operator workflow must replace browser-driven persistence before asserting full feature parity.
4. **Production and deployment verification:** Netlify currently requires team SSO. Authenticated browser acceptance on a current deploy preview and a security review of actual production environment variable scopes, identity/access controls, rate limits, log redaction, and read/write role separation have not completed. No public production deployment or penetration testing was performed.
5. **Source-level audit scope:** broad function entrypoints and debug probes were reviewed and guarded; a high-confidence tracked-file credential scanner was added. This does **not** prove the absence of all secrets, especially in untracked hosting settings or prior commit history. Check GitHub secret-scanning alerts and rotate any discovered secrets.
6. **CI completeness:** the large PR's checks must all complete successfully on the exact final commit. Earlier security smoke tests passed after dependency installation, but do not claim latest head verified while runs remain queued.

**Release disposition: BLOCKED.** Do not merge PR #390, remove Netlify SSO, unlock Week 5, or publish production until the above release gates have been resolved and the owner explicitly authorizes release.
