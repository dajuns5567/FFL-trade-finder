# Fleeced! — next Netlify account cutover preflight

Status: PREPARATION ONLY. No production deploy, merge, Blob write, credential rotation or publisher activation is authorized by this document.

## Current canonical state (2026-11-17)
- GitHub source: `dajuns5567/FFL-trade-finder`; current Netlify site `precious-dango-fb4633`, ID `fa33dfe4-8293-441e-8da0-25cc66fc984c`.
- Draft pick V98 is a separate draft PR #499, based on V97; its review/merge status must remain unchanged during migration.
- Current `netlify.toml` only allows explicitly listed PR preview numbers on the exact old site and skips production/branch builds. A new site gets skipped until **its ID is explicitly approved**.
- The existing `scripts/migrate-fleeced-new-account.mjs` is for an **older** source/destination pair (`8776...` to `3b9...`), not the current site to the upcoming site. NEVER execute unchanged on a new account.
- Historical store names in the verified migration: `fleeced-league-hub`, `fleeced-consensus-lkg`, `fll-value-history-v2`; source region historically `us-east-2` but verify both current site and successor before use.
- GitHub-native scheduled Value History refresh uses a local headless browser and GitHub durable archive; the separate live Netlify archive workflow is hardwired to the current production site ID and its existing secrets.
- Current scheduled Inquirer publisher in Netlify fires every five minutes; old publisher should not be left running concurrently with new publisher.

## Phase A — Before creating/linking successor
1. Record current site ID, exact GitHub branch/release SHA, current Netlify deploy ID/URL, latest completed Inquirer published week, all published locked weeks, awards archive, archive index, latest completed Sleeper week, live historical trade count, Value History latest snapshot/fingerprint, IDP/offense player-value counts, and successful GitHub Actions runs. Do not infer that a private draft is published.
2. Take a verified **read-only backup** of all three Blob stores on the current site, including object metadata, ETags, SHA-256 hashes, key counts and an independently verified archive manifest. Keep backup bytes and API tokens PRIVATE and outside Git.
3. Confirm current source site has locked historical editions and complete awards through its actual latest published week. Old migration preflight only requires Weeks 3–6 and **is insufficient for a current Week 10+ migration**; update the validation to compare the entire published index, all weekly editions and awards before cutover.
4. Keep the prior site online until the successor passes acceptance. Avoid concurrent writes during the final transfer; take a fresh final backup after stopping publication.

## Phase B — Set up new Netlify account safely
1. Create a NEW site attached to the SAME `dajuns5567/FFL-trade-finder` repository. Do not import/recreate source files. Record **new site ID, site name and region**; keep the old site's record for rollback.
2. Configure Netlify to **pause/disable automatic builds and production publishing before connecting GitHub or initiating a deploy**. Do not rely on a code-only `netlify.toml` ignore guard to protect the first import deployment.
3. Keep `FLEECED_ENABLE_NEW_SITE_PUBLISHER` unset or `false`. Keep the Inquirer scheduled function, the direct background worker, and one-time cutover worker blocked until the new site is explicitly recognized and its data has been restored.
4. Set necessary environment variables and scopes from the prior verified setup; never paste keys into chat, logs or Git. Rotate or reissue tokens for the new account. Validate separate Netlify API access, Blob access, GitHub Actions secrets and site-specific runtime secrets without displaying secret values.
5. Treat `main`/production and feature/PR Deploy Previews separately. Add the new site ID to an explicit preview-only allowlist only after identifying its Netlify environment. Do not automatically enable every PR or every site to conserve credits.

## Phase C — Restore without destructive writes
1. Adapt `scripts/migrate-fleeced-new-account.mjs` using verified OLD=current-site and NEW=successor IDs and their region(s); change the previous hardcoded IDs and tests, preferably without changing its strict create-only/manifest/hash checks.
2. Re-run `backup`, `verify` and `plan` with private local `FLEECED_SOURCE_NETLIFY_TOKEN` and `FLEECED_DEST_NETLIFY_TOKEN`. Verify **all** Blob keys, full historical broadcast index, locked editions, awards, manager and trade history, and the consensus/value-history stores. Do not import unpublished editorial staging or stale publication status.
3. Refuse restore on missing original locked weeks, hash drift, destination conflicts or any same-key unequal bytes. Only after independently verifying both publishers cannot run, allow explicitly authorized `restore --apply` (destination `onlyIfNew:true`).
4. Re-read restored keys and SHA-256 hashes from the destination. Verify the published archive's newest week, index continuity, awards, manager data, current market history, and historical trade pages. Reconstruct publication status only from verified locked historical records, never by copying a stale cursor.

## Phase D — Preview acceptance and limited cutover
1. Update the *new* Netlify site's explicit ID/name in deployment guards, the Inquirer scheduler and direct worker identity checks, the Blob migration's expected destination, and the GitHub Value History archive's `VALUE_HISTORY_PRODUCTION_SITE_ID` only at the appropriate activation stage. Keep a reversible record of old values.
2. Confirm the correct deploy SHA and preview URL rather than assuming a PR number URL exists. Run the complete current-value parity audit: Player Values, Trade Finder, Evaluator, Market Dashboard, Value History, team totals, and 2027–2029 picks including V98. Check both offensive PPR and IDP data refreshes.
3. Verify Sleeper regular-season completed-week freshness; 32-team record/PF pick ordering; Trade History *original* historical values and *hindsight* current values; Value History timeline and scheduled archive consistency.
4. Verify all 32 Inquirer team articles, Weekly Recap, publication index and awards for the latest published week are visible. Confirm no unexpected recreation of locked Weeks 1–8 or missed Week 9+ releases.
5. Only after all checks pass and with explicit owner authorization: stop the old publisher, perform final delta backup/transfer, activate exactly one new-site publisher, reconfigure live Netlify archive automation/credentials, and verify the next scheduled run. Do not assume GitHub scheduled workflows or monitoring automations follow the site automatically.
6. Leave the old site and its Blob stores intact until several successful new-site weekly runs. Roll back by disabling the new publisher and pointing access back to the old verified site; never delete source data as part of cutover.

## Known hardcoded references to revisit
- `netlify.toml` — currently old site ID/name and allowed Deploy Preview REVIEW_IDs.
- `netlify/functions/inquirer-publish-scheduled.mjs` — recognized historical sites; scheduled publisher gate.
- `netlify/functions/inquirer-publish-background.mjs` — direct worker gate and cutover archive verification.
- `netlify/functions/inquirer-cutover-background.mjs` — one-time historical promotion tied to current site; do not reuse against new site.
- `scripts/migrate-fleeced-new-account.mjs` and `tests/inquirer-new-account-migration.test.mjs` — old source/destination and Week 3–6 verification baseline.
- `.github/workflows/value-history-archive.yml` / `scripts/resolve-active-netlify-site.mjs` — current production site ID, deploy branch and API tokens.
- `scripts/value-history-headless-refresh.mjs`, `.github/workflows/value-history-headless-refresh.yml`, `.github/workflows/import-sleeper-history.yml` — preserve GitHub-native schedules and Sleeper importer; check published data without mutating these.
- External monitoring/automations referring to old Netlify site ID and URL require updates after the new site is validated.

## Required user-provided details at handoff
Only the **new Netlify site name and site ID** (non-secret) and explicit authorization for a cutover are needed in chat. Connect the new account through its own Netlify UI; keep all API tokens and Blob backups out of the conversation.
