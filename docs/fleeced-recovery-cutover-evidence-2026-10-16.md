# FLEECED! — verified recovery state and safe account-cutover contract

## Verified recovery baseline (2026-10-16; historical snapshots preserved at rehearsal time)

- Isolated destination Netlify site: `05a8ec65-a0a3-46f1-9f73-3da47dac662e`.
- Original 24 Blob objects independently restored/read back: [run 38841107577](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/38841107577).
- Historical 156 baseline snapshots plus 4 index/month records (160 objects): [run 38841954576](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/38841954576).
- Four Inquirer preloads plus accepted Week 4 v19 reference (5 objects): [run 38842388381](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/38842388381).
- Independent source-to-isolated-site readback of all 189 objects: [run 38842876217](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/38842876217).
- A standalone *read-only recovery viewer* was deployed on the isolated site (deployment `6ad192e396e1aa6eb03e22b1`), but HTTP API response validity under team SSO still needs independent confirmation. This is not a full FLEECED! deployment.

## Material limitations

1. The verified Netlify source ZIP has 3 Inquirer objects and 21 Value History objects; the original live stores were not a complete archive of Inquirer broadcasts.
2. Archived preloads recover Weeks 1–4, but only the explicitly accepted Week 4 v19 served-copy benchmark is separately preserved. Do not claim complete per-week served-copy equality solely from preloads.
3. Historic valuation coverage begins September 19; earlier points and missing September 21 points are not guaranteed recoverable.
4. The 160 historical archive objects and 5 editorial objects are in **rehearsal-named stores**, not the application's normal production keyspace. Rehearsal PASS is not a live full-app cutover.
5. The isolated site belongs to the same connected Netlify team. This verifies **cross-site** migration, not a different-account cutover with different permissions and credentials.

## Migration runtime blockers

- `.github/workflows/value-history-archive.yml` now pins production Netlify site ID `b1a7f3c4-7c1c-4a5b-8d5f-01fa768b9323`, requires matching GitHub repository linkage, a ready production deployment on `main`, and an HTTPS site URL; exact Git SHA parity is diagnostic only. An account move requires deliberate updates of the pinned site ID and credentials after separate authorization.
- Verify Netlify team's access to source and destination, runtime variables, production deployment's repo/branch/commit, scheduled jobs, and server-write permissions before switching.
- Distinguish **GitHub-native scheduled snapshots** from live Netlify Blob-buffer ingestion. Five additional snapshots after the 156-snapshot restoration baseline were verified in the durable archive (161 total, latest `2026-10-16T23:02:58.303Z`); these do not expand the already verified 189-object isolated recovery baseline. Treat stale durable archive alerts as an operational alarm; stale live buffer alone does not establish scheduled-history failure.
- Verify updated history is appended to GitHub and a fresh scheduled archive after the cutover; avoid test writes to production Blob keys.
- The recovery viewer is intentionally not wired to the normal publication path, does not publish issues, and does not validate full end-user UI or trade finder functionality.

## Safe cutover checklist

1. Retain the original private backup and pin both GitHub branches to the exact audited commit SHA.
2. Freeze source writes only during an approved, scheduled migration window.
3. Export both source Blob stores after the freeze, with complete pagination and SHA-256 verification.
4. Confirm expected published broadcasts, manuscript approvals, and other private keys; do not silently invent or regenerate missing records.
5. Restore to a new site with correct application store names; compare every source/destination object readback.
6. Configure site-specific tokens, runtime environment, repository linkage, functions, domain settings and schedules. Never copy secret values into GitHub content or logs.
7. Deploy an application candidate, test authenticated end-user/API flows, protected editor access and Week 1–4 served content before enabling writes.
8. Validate the exact account/site/commit resolver and both scheduled and on-load publishers using read-only/dry-run checks.
9. Authorize cutover separately. Start writes only after verification; verify a real fresh archive and preserve rollback.
10. Keep the source backup, recovery snapshots and rollback until the user approves retirement.

**No automatic production migration, workflow schedule alteration, or approval to republish Inquirer issues is implied by this document.**

## Post-rehearsal operational evidence (not a replacement for cross-account acceptance)

- [Live original Netlify Blob inventory](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/38851906363) passed eight unit regressions and returned one valid source-site Blob snapshot.
- [Pinned production source identity](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/38856657438) passed ten guard regressions and verified the real production site while `matched_target_sha` was false.
- The GitHub durable archive later reached 161 entries with latest snapshot at `2026-10-16T23:02:58.303Z`. This does **not** certify full application recovery or a migration to another account.
- The full-recovery preflight script was updated for the pinned-site guard and remains a cutover **HOLD** until authenticated full application behavior and a genuine second-account migration are tested.

## Consolidated certification checkpoint — 2026-10-16, no cutover authorization

### Directly observed passing evidence

- [Frozen full-app Chromium browser run #11](https://github.com/dajuns5567/FFL-trade-finder/actions/workflows/fleeced-original-app-browser-acceptance.yml): user-provided GitHub Actions screenshot shows a successful run at commit `ee766654`. It exercises actual Trade Finder `generateAsync` with deterministic fairness, original normalized player values, asset ownership, and UI/asset safety. **Not proof of live Sleeper recommendations or authenticated Netlify operation.**
- [Full isolated recovered history and editorial content read acceptance](https://github.com/dajuns5567/FFL-trade-finder/actions/workflows/fleeced-recovered-content-acceptance.yml): user-provided green workflow screenshot for commit `5a2d7f67`, testing all 156 baseline recovered snapshot objects and four 32-team editorial editions. This remains the fixed rehearsal baseline, not the advancing live GitHub archive.
- [Original Inquirer recovered read path](https://github.com/dajuns5567/FFL-trade-finder/actions/workflows/fleeced-original-inquirer-recovery-integration.yml): user-provided green workflow screenshot for commit `bf68301e`; original frozen `league-hub` GET preload bootstrap evaluated against Weeks 1–4 in isolated restored editorial store. No issue publication performed.
- Verified live production-site resolver [run #38856657438](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/38856657438) and live Blob inventory [run #38851906363](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/38851906363).

### Newly developed, NOT YET CERTIFIED

- Original Value History handler read-path acceptance: `scripts/accept-original-value-history-recovery-integration.mjs` intercepts original GET handler's archive requests and supplies **only** data copied from the existing isolated Netlify rehearsal store. It validates a real historical player valuation in the returned points. The default handler's live Blob initialization remains separate; there are no external archive requests while its test fixture is active.
- The integrated workflow `.github/workflows/fleeced-integrated-recovery-readiness.yml` now runs archive/identity tests, frozen renderer and Week 4 paragraph presence, and original Inquirer/Value History read-path tests against isolated data in a single run. **Do not claim this new consolidated run passed until its GitHub Actions results are independently examined.**
- Any production Blob freshness or GitHub snapshot freshness must be checked against the current clock. Last observed index contained 161 durable snapshots through `2026-10-16T23:02:58.303Z`; snapshot count and age may change after this checkpoint.

### Hard HOLD before real cutover

1. The rehearsal site `05a8ec65-a0a3-46f1-9f73-3da47dac662e` is SSO restricted and on the same Netlify team as original production. This is not independent-account migration proof.
2. The full original FLEECED application has not been deployed as an authenticated, write-disabled runtime using normal recovered application keyspaces. Current original-app Chromium acceptance is offline, and original-handler tests use controlled data routing. These are valuable but not full service cutover acceptance.
3. Original Inquirer Week 4 v19 approved served copy remains frozen. Paragraph-level presence checks are not byte-parity proof of a complete rendered published document; do not reinterpret them as such.
4. Production deployment, scheduled publishers, PR #390 and original Netlify Blob keys must not change without user authorization. Rehearsal archives are independently preserved.
5. A **different** authorized Netlify account and site, with distinct credentials, is required to certify portability. Do not repoint the pinned archival source site ID automatically.

### Efficient re-entry procedure (do not memorize past chats)

- Begin with the latest GitHub `main` and `value-history-data` branch index. Follow the evidence URLs in this document and inspect relevant workflows in `.github/workflows/`. Do not equate a committed workflow with a verified successful run.
- Run the consolidated recovery readiness gate. Collect job conclusions and key log messages; triage and fix actual failures rather than creating a new single-purpose workflow for each case.
- Preserve the immutable editorial application source `af9067c751118cf33f688648cb78619d229f2214` and accepted Week 4 revision `438da0c9354c79e320a9cd5a163a5c5786acdb63`.
- Use `scripts/audit-full-recovery-cutover.mjs` for current blockers. Its expected output is `HOLD_FULL_APPLICATION_CUTOVER` even when safety checks pass; HOLD is not an error unless required guards fail.
- For a different Netlify account, obtain user authorization and perform read-only identity/access preflight before any data migration. Never promote rehearsal data or enable scheduled writes automatically.

### Week 4 served-copy comparator investigation (2026-10-16)

- Integrated Actions [run #38997515940](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/38997515940) passed both `archive-and-safety` and `actual-app-isolated-data`. The final rendering job successfully rendered 54,585 HTML bytes and verified 98 assets, but the Week 4 comparator reported **0 of 457** exact accepted paragraphs in the **raw** compressed preload. This did not establish that the accepted served copy was absent: the test compared the wrong stage.
- Inspection of frozen `netlify/functions/league-hub.mjs` shows Week 4 is transformed by `rebuildWeek4Editorial`, `applyInquirerEditorialClarity`, and `upgradeInquirerAnalysis` in `servedPreload` before serving. The original comparator skipped those transforms.
- Commit `f01f3c8f5736693275c095a7b5146d90cbd45f6f` now invokes the **actual** original `league-hub?preload_bootstrap=1` GET handler and compares accepted paragraphs against its transformed Week 4 response. It blocks external fetches and does not write data. **Until the new integrated run passes, do not claim Week 4 fidelity parity or full recovery certified.**

## Verified consolidated acceptance — 2026-10-17 UTC

[GitHub Actions run #38998591688](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/38998591688) **passed all three independent jobs**. Job logs, not merely the overall status, establish:

- `archive-and-safety`: safety audit and durable archive freshness passed. Full application cutover remains deliberately `HOLD_FULL_APPLICATION_CUTOVER`.
- `actual-app-prose-and-render`: original frozen app rendered 54,585 HTML bytes with 98 linked assets (91 JavaScript files), zero missing assets and zero external requests. The original `league-hub` *served* Week 4 copy included **457/457 exact accepted paragraphs** across 32 teams. Paragraph coverage **100%**; full rendered document **byte parity not proven**.
- `actual-app-isolated-data`: all **156** restored baseline snapshots were read (121,990 total player rows); all 4 editions comprised 32 team articles each (128 total). Original frozen Inquirer handler produced the 4 editions with no network calls; original frozen Value History handler returned 156 observations for the sample player through isolated-data request interception. Production writes **zero**.

**What this certifies:** integrated *read-only source, application-handler and restored-data* acceptance for the preserved Week 4 baseline. **What this does NOT certify:** authenticated deployment of the full FLEECED app against normal live Netlify recovered keyspaces; end-to-end real-world fairness or future-week publishing output; complete byte parity of the published Week 4 HTML; relocation to a different Netlify account. The production/publisher/PR #390 holds remain in force.

## Full-app isolated deployment safety assessment (next certification gate)

- [Integrated read-only success run #38998591688](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/38998591688) established all three jobs passed, 457/457 Week 4 accepted paragraphs present, 156 restored snapshot read paths and 128 archived Inquirer team articles. Full rendered-document byte parity remains unproven.
- Netlify project API confirms original rehearsal destination `05a8ec65-a0a3-46f1-9f73-3da47dac662e` is **SSO-only**, its existing deployment is ready, and the site environment-variable list is empty. The existing viewer, not the complete production app, is deployed there. No deploy settings or access controls were changed during this assessment.
- Existing production `netlify.toml` contains scheduled publisher functions and production write-capable endpoints. It **must not** be reused as-is in isolated recovery: even an SSO-locked site may run scheduled/background functions or write to live stores.
- New `scripts/inspect-recovery-deploy-candidate.mjs`, `tests/inspect-recovery-deploy-candidate.test.mjs`, and `.github/workflows/fleeced-isolated-deploy-preflight.yml` reject unexpected destination ID, production-site collision, scheduled/publisher/write functions, unrecognized function bundles, Blob mutation calls, and accidental production static assets. The preflight is **not** a full-app deployment or certification; its own CI result must be checked before relying on it.
- **Required before a true full-app deployment:** independently provision a *new* authenticated isolated site or obtain specific permission to replace the SSO-protected recovery viewer; construct an allowlisted full-app function bundle with all writes and scheduled functions absent; verify read-only environment credential boundaries; complete authenticated browser/API smoke testing against the recovered data, then rollback. Never repoint production or start publishers as part of rehearsal.
- **Cross-account HOLD:** the existing recovery site remains on the same Netlify team as production. A genuinely separate authorized Netlify account is still required before cross-account migration can be certified.


## Dedicated full-application recovery destination — provisioned 2026-10-17 (NOT deployed)

- **New empty Netlify project:** `fleeced-fullapp-recovery-sandbox-20261017`, immutable site ID `d3ac147d-5e0e-4c1e-9163-237da3ee4341`. [View project](https://app.netlify.com/projects/fleeced-fullapp-recovery-sandbox-20261017).
- Independently queried Netlify project metadata after creation: team ID `6acbaea6213767a9b6baca3a`, **SSO team login required**, no current deploy. Independently queried site-level environment variables: **empty list**.
- This dedicated site is **separate from** the verified recovery viewer site `05a8ec65-a0a3-46f1-9f73-3da47dac662e` and original production site `b1a7f3c4-7c1c-4a5b-8d5f-01fa768b9323`. It is nevertheless in the **same team**; not a cross-account rehearsal.
- **NO app deployed, no credentials copied, no publishers enabled, no Blob data written, and no original Netlify site changed** as part of site provisioning.
- Next gate: assemble a strict allowlist of application static assets and read-only handlers and explicitly deny all write-capable endpoints, scheduled/background functions, remote production-data requests, and editor/publisher credentials. Run offline browser and restored-data handlers against that *exact* candidate package before deploying to this site.
- Site creation does not certify full-app runtime or cross-account migration. Any change to this site's authentication requirements must be reverified before deploy.


## Credential-free static full-app package, pre-deployment stage

- Frozen source: `af9067c751118cf33f688648cb78619d229f2214`. Dedicated empty destination site: `d3ac147d-5e0e-4c1e-9163-237da3ee4341`. Existing recovery viewer and production destinations are untouched.
- Builder `scripts/build-fleeced-fullapp-static-recovery.mjs` renders the real original entry point offline and copies **only referenced JavaScript/CSS assets** and the generated index page. It deliberately includes **zero Netlify functions, publisher schedules, credentials, or write endpoints**.
- Netlify static headers include a restrictive CSP with `connect-src 'none'` and `form-action 'none'`; browser outbound requests are intentionally blocked. This is **NOT** a full functional application service; any API-mediated behavior and recovered-data loading remain unavailable by design until explicitly allowlisted in a later package.
- Verifier `scripts/verify-fleeced-fullapp-static-recovery.mjs` rejects unexpected files, missing referenced assets, missing network restrictions, unrecognized target identifiers, and any Netlify function/schedule configuration. The [candidate workflow](https://github.com/dajuns5567/FFL-trade-finder/actions/workflows/fleeced-fullapp-static-candidate.yml) builds, verifies, and uploads the candidate as a short-lived CI artifact; it **never deploys to Netlify**.
- **Unverified until CI run logs are examined:** actual package generation and verifier success. **HOLD** on deploying the candidate until its contents pass, its use is approved, and its lack of recovered-data functionality is acknowledged. Full authenticated restored-data recovery remains uncertified.

## Static candidate success and sandbox gateway preparation — 2026-10-17

- The user-provided GitHub Actions screen showed the first [dedicated static package acceptance](https://github.com/dajuns5567/FFL-trade-finder/actions/workflows/fleeced-fullapp-static-candidate.yml) green at commit `6a4a2f7`. This proves the CI static builder and static safety verifier completed, not that a site was deployed or recovered data was connected.
- Prepared `scripts/fullapp-sandbox-recovery-gateway.mjs`: an independently testable, metadata-only HTTP GET endpoint backed by the existing isolated restore store. It is hard-pinned to the restore source site ID, demands a separate runtime read token, validates 156 baseline snapshots and all four 32-team editions, returns no private manuscripts and denies non-GET/HEAD requests.
- `tests/fullapp-sandbox-recovery-gateway.test.mjs` contains eight guard tests. [Gateway test workflow](https://github.com/dajuns5567/FFL-trade-finder/actions/workflows/fleeced-fullapp-gateway-acceptance.yml) runs them automatically; its execution result remains unverified until inspected.
- **Critical deployment hold:** The gateway is **NOT** part of the static candidate package. That candidate intentionally uses `connect-src 'none'` and deploys no server functions. Do not change CSP or include this gateway in a Netlify deployment until a separate full-app package safety audit and authenticated, minimal-permission credentials have been verified. Metadata status alone does not prove functional Value History or Inquirer UI loading.
- No new Netlify deployment, production Blob change, token copying or publisher activation occurred in this checkpoint.
