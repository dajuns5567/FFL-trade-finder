# Fleeced League Hub — Netlify account migration runbook

Status: PREPARATION ONLY. **Do not delete, unlink, rename, transfer, or recreate the source project until data protection is verified. Do not merge PR #402 or publish production to test a migration.**

## Source inventory (verified 2026-10-20 UTC)

- GitHub source: `dajuns5567/FFL-trade-finder`
- Editorial work: draft PR #402, branch `fix/inquirer-week5-editorial-preview`; retain branch and checks.
- Current Netlify team: `jbayless55` (team ID `6ad4d3b61ec9315e8cf5c125`).
- Project: `brilliant-faun-c5b649`, site ID `d51af6d7-e5f3-4c51-8c6d-25e31db39a0c`.
- Netlify dashboard reports team credit limit exceeded, project/deploys paused. Project configuration also labels project currently disabled; do not assume enabling will overcome credit pause.
- GitHub repository is linked; production is public, Deploy Previews are private (team sign-in).
- Scheduled publisher: `[functions."inquirer-publish-scheduled"] schedule = "0 */2 * * *"` in `netlify.toml`.
- Site-level environment variable: `FLEECED_INQUIRER_QUEUE_KEY`, context `all`, scopes `builds/functions/post_processing/runtime`. **Never commit the value.** Inventory team variables and any platform-managed credentials as well.
- Three confirmed site-wide Netlify Blob stores in `us-east-2`:
  1. `fleeced-league-hub` — directories `awards/`, `broadcasts/`, `inquirer/`, `managers/`. The `inquirer/` directory contains `editorial-staging/`, `league-overview/`, `reporters/`, and `publication-status.json`. This includes publishing state, archived editions, approval and draft data. **Critical to preserve.**
  2. `fleeced-consensus-lkg` — `validated-sources-v1` observed.
  3. `fll-value-history-v2` — enumerate and preserve.
- 43 deploy-specific `fleeced-inquirer-editorial-diagnostics` stores were listed. Archive those only if historical diagnostics must be retained; they are separate from production state.
- Netlify Forms reported not enabled, no custom domain displayed on the project overview (reconfirm in Domain management).
- **Migration-breaking build gate:** current `netlify.toml` contains `ignore = "node -e \\"process.exit(process.env.SITE_NAME === 'brilliant-faun-c5b649' ? 1 : 0)\\""`. All newly created sites with different names skip builds unless this is deliberately updated on the appropriate branch before the cutover.
- **Hard-coded preview origin:** `netlify/functions/league-hub.mjs` uses `https://brilliant-faun-c5b649.netlify.app` in its read-only editorial preview path. Update/configure only if project hostname changes.

## Preferred cutover: Transfer the existing project

Netlify documents project transfer between teams at https://docs.netlify.com/manage/projects/transfer-project/ . This is safer than recreating a site because it moves the **existing project** instead of making a new Site ID. Verify with Netlify support/UI whether site-wide Blobs, environment variables, Git connection, scheduled functions, hostname and deploy history remain attached during the specific transfer. Do not assume until verified.

1. Choose the destination Netlify team and ensure the transferring owner has Owner/Developer access there. Netlify support may be needed for teams with no shared members.
2. Confirm destination plan/features support *private Deploy Previews*. Record preview protection settings.
3. Before executing transfer, export an independent, complete backup of **all three site-wide Blob stores** (recursive keys, raw bytes, custom metadata, ETags/checksums) and export environment-key/context/scope inventory. Keep data private; do not commit backups or secrets to GitHub.
4. Audit relevant team-shared env variables, DNS/custom domains, forms, webhooks, notifications and Git deploy integration.
5. Transfer via the official Netlify transfer workflow, not by deleting the project. Treat Netlify's on-screen warnings as a stop condition if data, plan features, or project identity may be lost.
6. Confirm project ID, Blob key counts and hashes, environment contexts, GitHub link, preview privacy, and function schedule after transfer. Confirm one and only one active scheduled publisher.
7. Generate a **private PR Deploy Preview** for #402; run editorial/readability, data-completeness, publication-safety and runtime smoke checks. No production merge/publish without explicit authorization.
8. Keep the source team/account accessible until all checks pass; do not delete old resources.

## Fallback: Create a new Netlify project (if transfer is unavailable)

- Before any final cutover, export and verify Blob backup while the source project is still accessible. Git source alone cannot restore the data.
- Create/link a new project with the correct Git repo and branch, update the build ignore allowlist for the **new** `SITE_NAME`, and change preview origin assumptions.
- Recreate environment variables with exact contexts/scopes securely; never print credential values in CI output or chat.
- Restore all site-wide Blob stores and metadata on the destination in `us-east-2`. Compare recursive key lists, byte lengths, and SHA-256 hashes before enabling publishing.
- Do not have old and new scheduled publishers simultaneously active. Stage the destination while publication is disabled; activate only after full verification.
- Verify app routes, redirect rules, Sleeper data feed, Inquirer locked Week 4 reference, Week 5 draft/approval state, awards/badges, manager/history data, privacy and deployment.
- Leave original site/account unchanged until independent acceptance.

## Stop conditions

Stop if source Blob export or restore verification is incomplete; any required credential is unavailable; destination preview protections cannot be applied; project transfer warning indicates loss of data/features; or CI is skipped due to `SITE_NAME` guard. Never use a production deployment as a migration smoke test.

## Confirmed destination and operational handoff (2026-10-20)

- New connected Netlify team: `lebrunski55`, team ID `6ad822c9e7da4bd779714ebf`, Free plan.
- Existing destination placeholder project: `transcendent-manatee-2f0123`, site ID `8776d155-bc7b-4dcd-bafc-3d70d3d51800`. It has an unrelated ready deployment, site-wide SSO visibility, and no configured site environment variables. **Do not overwrite this placeholder to simulate transfer.**
- Source and destination Netlify connections are distinct account owners; connecting both to ChatGPT does not grant Netlify cross-team transfer authority.
- Available Netlify connector currently has read/list/project-create/env-var operations, **no** site-transfer or Blob-export/import operation. Source-to-destination migration has NOT occurred; no Blob bytes were backed up.
- To perform a genuine team transfer, the Netlify account holder should follow Netlify's Transfer project workflow and resolve any account/team access requirements. Verify Netlify's warning about data retention before final submission. If the destination team cannot be selected, request the proper team-member/ownership setup from Netlify rather than recreating the project.
- After transfer, first recheck the original Site ID `d51af6d7-e5f3-4c51-8c6d-25e31db39a0c`, original project name, all three site-level Blob stores, publication-status, env settings, private Deploy Preview rules, GitHub linked repository and two-hour schedule. Recheck that the source project is no longer under the old team.
- CI diagnostic at migration checkpoint: run `39367395304` marked failed **only** because job `seed-private-preview` failed; the `inquirer-r6` job's forward-season smoke, source contracts, and prose audits succeeded. Finder runtime and publication guard also passed at commit `63a93086efe71001ba2f04bd47b3a4d022e2a45a`.
- Do not merge PR #402, change production, weaken preview access, or enable a second scheduled publisher during transfer.

## Publishing and editorial pipeline audit (2026-10-21)

Inspected active call path: `inquirer-publish-scheduled.mjs` → `inquirer-publish-background.mjs` → `league-hub.mjs` → `inquirer-reporters.mjs` raw edition → `inquirer-editorial-v31.mjs` forward candidate generation → final deep-quality evaluation plus `inquirer-publication-guard.mjs` admission → Netlify Blobs → reader. Separate preview path: `inquirer-preview-background.mjs` invokes the same `weeklyReport` generator with read-only flags, checks exact completed draft, and stores the result only in a deploy-scoped diagnostic Blob store; the diagnostic endpoint uses the normal reader entry.

Verified structure: forward generator is one primary V31 engine, not a set of simultaneously published historical generators. The current manuscript selection checks both quality and independent publication audit on candidate copy before writing. Candidate salts currently `[5,0,1]`; a failed candidate is staged for review and must not be published. Existing forward smoke covers consecutive Week 5 → 6 comparisons and additional season weeks. That automated contract is not a substitute for reading all 32 actual Week 5 pieces.

**New safety fixes on PR #402:** (1) site build ignore now recognizes `transcendent-manatee-2f0123` for PR previews; (2) read-only history URLs use the current deploy origin rather than the old host; (3) scheduled publishing on the replacement site is disabled unless `FLEECED_ENABLE_NEW_SITE_PUBLISHER=true` is set explicitly; preview contexts always skip scheduled publishing; an unavailable publication-status archive or unavailable Sleeper NFL clock now fails closed instead of queuing a background publish; (4) a regression test verifies these guards. The guards are in the PR branch **only** until merged; do not treat them as live protection on `main`.

**Identified cross-layer risks intentionally left unchanged:** (a) final article storage and reporter/league-overview archive writes are nontransactional—failure between keys can leave partially updated derived collections; a future change should adopt a versioned manifest or retryable consistency checks, not remove existing archives; (b) background status has one shared JSON document and can overwrite another generation status if invoked concurrently; an atomic lease is preferable before enabling a second publisher; (c) new site has a different site ID and empty historical Blob state, so rendering a draft there does not by itself prove Week 4 history is available; (d) current CI preview seeding can be rejected by SSO/Netlify authorization even if the deploy itself succeeds; do not conflate those conditions; (e) only three deterministic candidate salts are tried in the live forward path, so additional distinct candidates may be needed if all fail without degrading the editorial guard. No historical generator files or archive keys have been deleted, because their downstream use and Blob dependencies have not been proven disposable.

**Pre-cutover verification:** keep both projects, old archives, and draft PR #402; independently verify private reader/recap/all 32 articles on the new deploy and Week 4 comparison; back up and restore the three site-wide Blob stores and compare keys/checksums; only then set the new publisher enable flag and retire old scheduled jobs. Never publish to production merely to smoke-test migration.
