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

## Combined full-app + metadata gateway candidate (2026-10-17, never deployed)

- Validated independently in previous workflows: frozen static full-app candidate and 8/8 gateway regressions ([run #39001598460](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/39001598460)).
- Combined packaging scripts: `scripts/build-fleeced-fullapp-gateway-candidate.mjs` and `scripts/verify-fleeced-fullapp-gateway-candidate.mjs`. The bundle includes original HTML + linked JS/CSS and **only** the metadata-only `/api/recovery-status` function; no production publisher, scheduled functions or full Inquirer/Value History private endpoints. CSP limits connections to same-origin only and forbids form submissions.
- [Combined acceptance workflow](https://github.com/dajuns5567/FFL-trade-finder/actions/workflows/fleeced-fullapp-combined-candidate.yml) rebuilds from pinned frozen revision, runs eight gateway tests, checks the bundle, and saves a short-lived artifact. **No deployment step, and successful CI has not yet been independently verified.**
- **Deployment HOLD:** the bundle lacks runtime provisioning of a proven read-only token for the isolated restoration store. The Netlify Blobs token used for GitHub Actions restoration must **not** simply be copied into a site runtime. The function's SDK dependency and actual authentication/authorization boundary also require deployment-specific verification. Even a successful package build will **not** prove the complete app's recovered-data views function: the gateway currently exposes *metadata only*. Preserve both existing Netlify recovery sites and production.

## First bounded functional recovery gateway read (2026-10-17)

- Extended `scripts/fullapp-sandbox-recovery-gateway.mjs` to support exactly one additional query mode, `GET /api/recovery-status?player_id=<validated-id>`. It reads the existing isolated 156-snapshot baseline, selects only the requested player's time-series points, and returns the original Value History point field names. The endpoint disallows all other query arguments, invalid IDs, write methods and untrusted snapshot paths; any missing or malformed restored snapshot makes the request fail closed.
- Added regression coverage in `tests/fullapp-sandbox-recovery-gateway.test.mjs` for the 156-point fixture, query rejection, and missing snapshots. The [gateway acceptance workflow](https://github.com/dajuns5567/FFL-trade-finder/actions/workflows/fleeced-fullapp-gateway-acceptance.yml) must pass on these new commits before the new functionality is trusted.
- This does **not** yet make the original UI consume the gateway. Original UI Value History uses its own `/api/value-history` route; mapping to this restricted endpoint requires a separately reviewed adapter rather than reusing production write-capable functions. The gateway currently returns no full Inquirer articles, and the site's runtime Blob token/permissions remain unverified. **Deployment HOLD stays in place.**

## Original Value History URL compatibility — 2026-10-17

- Implemented a **read-only alias** for `GET /api/value-history?player_id=<validated ID>` in the existing sandbox gateway. The handler now advertises Netlify function paths `/api/recovery-status` and `/api/value-history`. It reads exactly the 156 isolated historical baseline snapshots and returns the original expected player-history response shape.
- The alias refuses POST/PUT/PATCH/DELETE, missing or malformed IDs, and all non-player-history modes (including archive export, market, team-net) before opening the store. Snapshot paths/timestamps are checked and missing objects fail closed.
- Added positive and negative alias contract regressions to `tests/fullapp-sandbox-recovery-gateway.test.mjs` and hardened the combined package verifier to require this route. The gateway and combined-candidate workflows automatically rerun from these commits; **no new passing execution claim until logs verified**.
- This is a *route contract* integration, not proof that the original browser requests this URL under all situations, or that the Netlify deployment has function-bundling and read-only token permissions configured. Inquirer full article UI access is still excluded. Deployment and cross-account cutover remain on HOLD.

## Original Inquirer URL recovery adapter (metadata-only, 2026-10-17)

- The existing read-only sandbox gateway now recognizes `GET /api/league-hub?broadcast_archive=1` and `GET /api/league-hub?broadcast_season=2026&broadcast_week=N`, for **N=1–4 only**. It loads and validates the restored four editions but returns **only archive references, availability and article counts**; all manuscript sections, article text, roster facts and reporter details remain redacted.
- Unsupported modes (weekly refresh, preload bootstrap, award calculation), unknown years/weeks, additional query arguments, HEAD on Inquirer and all mutations are blocked before private-store access. Missing editions fail closed.
- Added four gateway regressions and packaging guards for the Inquirer route. The workflow will re-run automatically; no pass claim until execution verified.
- **Important:** original FLEECED Inquirer UI expects full published article structures. **These redacted metadata responses cannot populate that UI.** Do not advertise this as full original-app Inquirer functionality or deploy it as a substitute for the accepted full edition. The accepted Week 4 v19 served copy remains untouched and stays within the existing independent paragraph-level acceptance evidence. Authentication and strictly read-only Netlify credential boundaries still block runtime deployment.

## Real isolated restored-data API contract milestone (2026-10-17)

- [Gateway unit workflow](https://github.com/dajuns5567/FFL-trade-finder/actions/workflows/fleeced-fullapp-gateway-acceptance.yml): previously had two failing Inquirer fixture assertions in run #39003018093 (15 pass, 2 fail). The failures were caused by undefined team entries in mocks. Commits `0928fae4`, `af7a3ef7`, `c95b6e44` repaired the fixtures and made malformed team records explicitly fail closed. Do not claim the repaired run passed without observing its logs.
- Added `scripts/accept-fullapp-gateway-isolated-live.mjs` and [live gateway read-path workflow](https://github.com/dajuns5567/FFL-trade-finder/actions/workflows/fleeced-fullapp-gateway-live-acceptance.yml). It **calls the actual sandbox gateway** against the real isolated Netlify restored-history and editorial Blob stores via an injected read-only SDK access object, selects a real player's historical points, verifies four 32-article Inquirer editions, checks that article text is redacted, and rejects write/unsupported requests.
- GitHub Actions uses its existing secret only for the test job, not as a Netlify sandbox runtime variable. The new workflow has **no deploy commands, no publisher commands, and no Blob writes**.
- The new workflow's execution result is not independently verified yet. If it fails, inspect the job ID and resolve an actual source-object shape or contract mismatch before proceeding.
- Even a passing live read path does **not** mean the full original UI renders Inquirer articles: the protected sandbox gateway intentionally returns *metadata only*. No secure minimum-privilege site runtime token has been provisioned and the dedicated full-app Netlify site remains undeployed. Full cutover/cross-account HOLD remains in force.

## Verified live sandbox gateway read-contract pass — 2026-10-17 UTC

- [Actions run #39006012277](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/39006012277) was independently verified from the job log. The `restored-read-paths` job concluded **success**.
- Exact CI evidence: `LIVE ISOLATED FULLAPP GATEWAY READ CONTRACT PASS`, source site `05a8ec65-a0a3-46f1-9f73-3da47dac662e`, **156 snapshots**, **156 history points** for a sampled recovered player, **4 Inquirer editions**, **32 articles per week**, article text exposed **false**, production writes **0**, deployments **0**.
- This proves the read-only gateway's original-app URL contracts can consume the isolated restored Blob stores within GitHub Actions using an injected credential. It does not test deployed Netlify routing or authorize copying the GitHub Actions restoration token into the destination Netlify runtime.
- The Inquirer route intentionally returns *only coverage metadata*; original full-article UI still cannot be certified. Dedicated full-app site `d3ac147d-5e0e-4c1e-9163-237da3ee4341` remains undeployed, and the separate-account/production cutover hold remains in force.

## Accelerated recovery strategy — credential-free frozen full Inquirer (2026-10-17)

The original frozen `league-hub` GET handler already has full approved 2026 Weeks 1–4 preloads compiled into the immutable source checkout. It can generate full *served* edition data, including the editorial Week 4 rebuilding transforms, **without** fetching production, using a Netlify token or invoking publishers. This is a better starting point for an offline recovery rehearsal than attempting to grant a potentially write-capable Netlify Blobs token to a deployed site.

Added `scripts/verify-frozen-inquirer-offline-serving.mjs` and [the credential-free acceptance workflow](https://github.com/dajuns5567/FFL-trade-finder/actions/workflows/fleeced-frozen-inquirer-offline-acceptance.yml). The test calls the original serving function offline, checks Weeks 1–4, all 32 Week 4 teams, and exactly 457 locked paragraphs against accepted revision `438da0c9354c79e320a9cd5a163a5c5786acdb63`. It logs only content digest/metadata, writes **no manuscript artifact**, and performs no deploy or publisher operation. **CI execution has not yet been verified.**

Next steps before a single full-app sandbox deployment: generate an **allowlisted read-only offline API** for original Inquirer routes backed by the frozen served edition and a separately frozen copy of the recovered Value History baseline (not a runtime token); verify byte/content fingerprints and route/write denials; assemble and test the exact candidate; only then request any approval required for deploy. This avoids granting production-capable credentials to the sandbox. The dedicated site `d3ac147d-5e0e-4c1e-9163-237da3ee4341` is still undeployed. Full recovered-data UI fidelity and cross-account migration remain uncertified.

## Original Inquirer four-week URL acceptance (2026-10-17)

- The user-provided GitHub Actions screenshot showed the credential-free Week 4 serving acceptance green at commit `97a0d3e9`. This confirms original frozen preload bootstrap and accepted paragraph checks at the source layer.
- Added `scripts/accept-original-inquirer-four-week-offline-routes.mjs` and [its workflow](https://github.com/dajuns5567/FFL-trade-finder/actions/workflows/fleeced-inquirer-four-week-offline-routes.yml), exercising the actual frozen `GET /.netlify/functions/league-hub?broadcast_season=2026&broadcast_week=N` for all four preserved weeks, with outbound fetches blocked. The test requires 32 complete articles each week, compares the served Week 4 article paragraphs exactly to the 457 approved paragraphs, and logs only hashes/record counts. It does not export any manuscript data or deploy to Netlify.
- The new four-week route integration **is not yet independently verified passing**; a failure must be investigated before declaring the route certified. The original browser UI and history gateway still require an exact packaged-contract test, not a public runtime claim.
- Dedicated recovery site remains empty/undeployed. Do not copy full-power `NETLIFY_BLOBS_TOKEN` into a Netlify runtime, enable publishers or loosen existing SSO restrictions.

## Consolidated credential-free recovery candidate (2026-10-17)

The recovery implementation now uses ONE ephemeral [combined offline full-app workflow](https://github.com/dajuns5567/FFL-trade-finder/actions/workflows/fleeced-offline-full-inquirer-candidate.yml), rather than continued isolated test workflows. It assembles the immutable original application's **98 referenced assets** and rendered HTML, original frozen **2026 Inquirer Weeks 1–4** including all **457 exact approved Week 4 paragraphs**, and a compressed read-only player time-series map populated from all **156** restored snapshots. The latter source is read from the isolated rehearsal Netlify site using only an Actions-time credential; NO runtime credentials are packaged. The two allowlisted Netlify handlers are `/api/league-hub` (only archive list and approved edition GETs) and `/api/value-history` (only player-id history GET). Outbound browser connections are CSP-restricted to self; forms disabled.

Implementation: `scripts/stage-fleeced-frozen-inquirer-dataset.mjs`, `scripts/package-fleeced-inquirer-read-only.mjs`, `scripts/stage-fleeced-full-history-offline.mjs`, `scripts/package-fleeced-history-read-only.mjs`, `scripts/accept-fleeced-offline-complete-candidate.mjs`, `scripts/finalize-fleeced-offline-fullapp-candidate.mjs`. Temporary manuscripts and historical value JSON are deleted after compilation, and the entire temporary bundle is deleted at end of the Actions job. **No artifact containing protected editorial material or historical player records is uploaded.** The workflow contains no deployment step, cannot change the production site, and never enables a publisher.

**Important remaining acceptance questions:**
- The newly consolidated workflow's actual green completion and package size have NOT YET BEEN OBSERVED. A failed build indicates an unresolved issue and is not authorization to relax safeguards.
- This is a frozen historical rehearsal. It does NOT implement advancing weekly updates, player acquisition or trade live APIs; the original UI may request additional endpoints, which remain unavailable and must be evaluated in authenticated browser testing.
- The compiled read-only data bundle would still contain full approved content and historical values. Even without tokens, it must be deployed ONLY behind a confirmed team-SSO gate; verify the SSO destination with Netlify before a deploy. Confirm archived editorial rights and whether full content may be exposed to all authenticated members.
- The dedicated full-app site `d3ac147d-5e0e-4c1e-9163-237da3ee4341` has never been deployed. Production and cross-account cutover remain on HOLD. Preserve original production and recovery viewer sites, accepted Week 4 text and PR #390.

## Future-week Inquirer editorial quality scope (2026-10-17)

Recovery and frozen-issue acceptances validate the existing Week 1–4 archives; they do **not** improve the quality of future weekly generated writing by themselves. A first read-only standalone candidate check, `scripts/check-future-inquirer-quality.mjs`, is now present to reject missing team articles, duplicate/unnamed teams, placeholders, repeated substantive paragraphs, and severely short articles in a 32-team future-week candidate. It takes the candidate JSON and the frozen Week 4 accepted baseline as explicit inputs and does not call publishers. **It has not yet been connected to the future-week publishing entrypoint or verified on the next real edition, so no automatic future-week protection is claimed.** These structural thresholds are not a semantic prose-quality or factual correctness guarantee, and approved Week 4 paragraphs are not copied into future editions. Any publisher-blocking hook requires validation against a real generated issue to avoid accidental disruption.

## Consolidated recovery + future editorial calibration checkpoint (2026-10-17)

- The single ephemeral full-app candidate workflow now also executes `scripts/check-future-inquirer-quality.mjs` in **calibration mode** against the *real* frozen Week 4 served edition. This checks team identity, minimum structural depth, placeholders and repeated paragraphs using exactly the same checker intended for future weeks.
- Calibration is deliberately **nonblocking**: pre-existing accepted Week 4 may not meet every provisional threshold, and that is evidence to refine thresholds, not grounds to rewrite approved paragraphs. Actual future candidate mode remains fail-closed on structural issues but **is not wired into publishers**.
- The workflow stages complete historical and editorial data transiently, compiles offline GET-only handlers, enforces same-origin CSP and removes both intermediate data and bundle after tests. No external content artifact is uploaded. **Passing outcome of the latest consolidated build has not yet been verified; no sandbox deploy performed.**
- Before enforcing on future publishers, collect the calibration counts, perform an independent real future-week draft check and require human review of semantic accuracy, narrative depth and prose. Do not claim future weekly quality improved automatically solely from recovery code.

## Consolidated CI calibration failures, regression hardening (2026-10-17)

- User-provided GitHub Actions workflow screenshot shows the consolidated credential-free candidate passed at commits `4353f98`, `c2dc3d2`, and `0b4ad85`, then failed after introducing the new future-week quality calibration at `293307d` and `a943aa6`. This strongly localizes a regression to the newly inserted calibration stage, but **the exact error output is not in the screenshot** and must not be invented.
- The checker previously asserted that every Week 4 team name exactly matched reference team names *before* entering the nonblocking calibration path. This is inconsistent with using the reference as a qualitative/structural comparator and could abort even when full preserved source and 457 locked paragraphs had already passed. Commit `8188281c` changes duplicate/name-coverage problems to **reported calibration findings**, while future-week candidate mode remains strict.
- The new `tests/future-inquirer-quality-gate.test.mjs` explicitly tests both cases with deliberately different team names: calibration returns success while reporting concerns, actual future-week enforcement returns failure. This regression suite runs before original-app checkout and protected content staging in the consolidated workflow.
- Await a **new verified green Actions run** before declaring the final combined candidate certified. Do not merge, deploy, upload private manuscript artifacts, repoint the original site, or activate publishers.

## Exact-package Chromium acceptance expansion — 2026-10-17 (await CI)

- Added `scripts/accept-fleeced-offline-candidate-browser.mjs` and integrated it into the **existing** `fleeced-offline-full-inquirer-candidate.yml` job, rather than starting more disconnected workflows. This starts a local HTTP server serving the **assembled ephemeral static output and its two packaged handlers**, runs Chromium with external requests and writes blocked, loads original app JS/CSS, requests all four complete Inquirer editions, validates route denials, and verifies a genuine recovered 156-point player history through the browser. It checks an unknown Trade Finder API fails closed.
- The same consolidated job now also invokes the previously developed controlled original Trade Finder Chromium generator test (`rehearse-full-original-app-browser.mjs`), which exercises offline player values, ownership, candidate construction and `generateAsync` under deterministic fixtures. This is **not** evidence of live Sleeper connectivity.
- The candidate remains ephemeral and removed by the workflow's `if: always()` cleanup, even after failure. No deploy step, no manuscript/history artifact upload, no production mutation, and no publisher activation were added.
- **Not yet certified:** these newly committed tests and the combined workflow must actually finish green; browser routes in an ephemeral local server do not substitute for authenticated Netlify deployment. Do not confuse this with live Trade Finder recovery or approval to publish. The separate SSO-locked full-app sandbox remains undeployed, and production/PR #390 remain protected.

## Future-week rename robustness and package-size preflight — 2026-10-17 (await CI)

- The optional read-only future-draft structural checker no longer treats **unchanged Week 4 team display names** as a publication requirement. Team names can legitimately change; it still requires 32 distinct nonblank names and complete, substantive article content. Baseline name differences remain informational in Week 4 calibration. Regression coverage now includes a well-formed renamed 32-team future draft that must pass, as well as incomplete drafts that must fail.
- Exact full-app package finalization now emits both bundled function source byte counts and rejects oversized individual/combined handlers before any Netlify deploy. The build still has only the two GET-only handlers, no runtime credentials, and no schedules.
- Both changed JavaScript files and the new browser acceptance script passed local **syntax-only** checks. No claim of successful package execution, full CI pass, real draft quality, or authenticated sandbox deployment is implied.

## Verified consolidated browser + full data acceptance — 2026-10-17 16:43 UTC

**PASS:** [combined credential-free run #39050565717](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/39050565717), code SHA `344e86d9edde39aef89e78f2140c93a5e890142f` (latest workflow-triggering commit). All job steps, including new Chromium integrations, concluded success. The failure of preceding runs was definitively traced in the job log to `TypeError: Cannot read properties of undefined (reading 'push')` in `check-future-inquirer-quality.mjs`'s recursive paragraph collector. Commit `344e86d9` correctly forwards the accumulator through recursive object traversal; the 3 editorial regressions then passed.

Observed from PASS job logs:
- Frozen Week 1–4: 128 articles, **457/457** locked Week 4 paragraphs, 6 **blocked enrichment attempts**, zero completed external fetches.
- Structural Week 4 calibration: 32 teams, 774 collected meaningful paragraph occurrences, **32 reported duplicate-paragraph findings**, deliberately nonblocking. These findings are **not** a future-draft approval or prose-quality certification; investigate repeated accepted structures before adapting quality thresholds. Protected Week 4 was not edited.
- Historical staging: 156 snapshots, 121,990 original source rows, 984 player IDs, no runtime credential embedded.
- Exactly two allowlisted read-only handlers; sizes **1,160,464** and **19,235,191** source bytes (combined **20,395,655**); no publisher/schedule, no runtime credentials, no production writes.
- **Exact assembled package Chromium PASS:** 98 assets actually served, all four 32-team editions, a real complete 156-point player timeline, no broken JS/CSS, unknown live API 404.
- **Original frozen Trade Finder Chromium PASS:** controlled full `generateAsync` fixture, valuation invariants and roster/ownership checks. This does **not** establish live Sleeper connectivity or an authenticated Netlify deployment.
- Cleanup ran; no private full-content artifact was published by Actions.

**Remaining HOLD:** the sandbox is not deployed; recovered content exists inside executable read-only handler source and requires SSO/permissions/content-rights review before any upload. Two-handler offline snapshot lacks live Trade Finder and Sleeper data APIs. Future-week Inquirer substantive semantics and actual fresh-draft quality still need a distinct dry-run and review before publisher enforcement. No cross-account portability or production cutover certification. Do not overwrite production, recovery viewer, PR #390, or accepted Week 4 text.

## Final normalized editorial calibration + browser regression — 2026-10-17 16:45 UTC

**PASS:** [consolidated workflow run #39050750012](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/39050750012) at source `4fa4a0529bf547e029adaec9d7e98ac09b1a8cf6`. All steps completed successfully, including four future-gate regression tests, original frozen app and Week 4 validation, restored histories, exact-package Chromium, and deterministic Trade Finder browser generation.

- The initial calibration had counted nested section paragraphs and their mirrored top-level article paragraphs twice. That produced 32 false duplicate findings and 774 paragraph occurrences. The checker now uses the top-level article paragraphs as canonical when present, falling back to sections otherwise. The verified Week 4 calibration now reports **32 teams, 387 meaningful canonical paragraphs, 0 structural problems**. This normalization does not alter the approved paragraphs or claim semantic prose superiority.
- Four tests now demonstrate: historical calibration is nonblocking, malformed future drafts fail closed, legitimate team display-name changes do not fail a valid future draft, and mirroring between article and section presentation is not mistaken for duplicate prose while a genuine duplicate is still rejected.
- Exact assembled package Chromium again served **98 original static assets**, all **128** preserved articles and a real **156-point** player history, with zero broken assets; package size and no-credential/no-writer preflight passed. Cleanup completed.
- This is the strongest **offline recovery candidate** certification achieved so far. It still does **not** establish an authenticated Netlify deployment, live Sleeper-backed trade workflows, a fresh generated Inquirer edition, publication readiness, or a different-Netlify-account migration. Separate sandbox content exposure approval and real-week semantic editorial review remain required; production/publishers/PR #390 stay unchanged.

## Authorized dedicated sandbox deploy attempt — 2026-10-17 16:52 UTC: permission HOLD

After explicit user approval, a one-time push-triggered, exact-destination-only deployment workflow was created: `.github/workflows/fleeced-sandbox-deploy-once.yml`. [Run #39051187284](https://github.com/dajuns5567/FFL-trade-finder/actions/runs/39051187284) successfully passed its complete offline recovery, all four editorial regressions, packaged-data checks, exact-package Chromium and original Trade Finder fixtures. Its **final Netlify CLI deployment step failed with `JSONHTTPError: Forbidden`** using the existing GitHub Actions-only `NETLIFY_BLOBS_TOKEN` as the CLI auth token.

Do **not** retry with another credential without permission, copy any broad GitHub Actions token into Netlify runtime, weaken SSO, or switch destination. Post-failure Netlify project read confirms the dedicated site is still SSO-required and has **no published current deployment**; production/recovery viewer remain untouched. No successful sandbox upload/deployment is claimed.

Unblock requires a separately authorized Netlify deploy-capable credential for the *specific team/site*, configured as a GitHub Actions secret (recommended separate `NETLIFY_SANDBOX_DEPLOY_TOKEN`), then updating the one-shot workflow to use that secret and rerunning after verifying destination/SSO. Never include the token in source, logs or chat. The existing workflow is not a publisher and only self-triggers on edits to its own file.
