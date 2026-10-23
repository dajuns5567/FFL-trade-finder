# Fleeced! one-time, non-destructive Netlify Blob archive recovery

**Status:** safe targeted recovery is staged on draft PR #402. **No historical blobs have been copied yet.** The destination currently lacks the exact 2026 Week 3–4 archive keys in `fleeced-league-hub`; original approved Weeks 3–4 remain in the credit-paused `brilliant-faun-c5b649` project.

## Verified Fleeced! projects

| Side | Project | Netlify Site ID |
| --- | --- | --- |
| Canonical historical source (read-only) | `brilliant-faun-c5b649` | `d51af6d7-e5f3-4c51-8c6d-25e31db39a0c` |
| Replacement destination (only missing keys may be created) | `transcendent-manatee-2f0123` | `8776d155-bc7b-4dcd-bafc-3d70d3d51800` |

**Least-privilege scope:** The recovery tool reads, backs up, verifies and (after a separate safety authorization) creates **exactly two** objects in the `fleeced-league-hub` store, region `us-east-2`: `broadcasts/2026/week-03.json` and `broadcasts/2026/week-04.json`. It does **not enumerate or read any other key**, and does not inspect or modify `fleeced-consensus-lkg`, `fll-value-history-v2`, awards, or old Week 5. Each historic source file is approximately 3.1 MB. The Netlify dashboard exposes Download but no direct Import control. Connected Netlify and TinyFish tools do not currently provide a supported way to transfer those raw bytes between authenticated accounts. The original production site is credit-paused; its functions cannot be used as an alternative HTTP exporter.

## Fastest one-time recovery command

If you have Node.js 22 and this PR branch checked out on your computer, run:

```bash
bash scripts/one-time-fleeced-archive-recovery.sh
```

The script privately prompts for the old and new Fleeced! Netlify account tokens (typed invisibly, not stored in Git or chat). It then backs up and SHA-256-verifies **only the two approved objects on both** sites, prints a **dry-run limited to ONLY `broadcasts/2026/week-03.json` and `week-04.json`**, and **STOPS before any restore**, because the replacement project's production Inquirer scheduled function is currently ENABLED. Existing destination objects are never overwritten. The detailed commands below are provided as an alternative for independent review.

## One-time operator procedure (tokens remain local; never share in chat)

On a computer with Node.js 22 and Git, use the existing working copy of the repository on `fix/inquirer-week5-editorial-preview` or download that branch. Two *separate* Netlify personal access tokens with access to the specified original and replacement project are needed to use the supported `@netlify/blobs` SDK outside a Netlify function. Obtain them through your own Netlify account; **do not expose values to assistants, TinyFish, GitHub, screenshots, CI, commit history, or chat**.

In a **local terminal**, use masked input so secrets do not appear in terminal history:

```bash
read -r -s -p "Original Netlify account token: " FLEECED_OLD_NETLIFY_TOKEN; echo
export FLEECED_OLD_NETLIFY_TOKEN
read -r -s -p "Replacement Netlify account token: " FLEECED_NEW_NETLIFY_TOKEN; echo
export FLEECED_NEW_NETLIFY_TOKEN

npm install --no-save --package-lock=false
mkdir -p "$HOME/fleeced-private-archive"  # private, outside the repository
chmod 700 "$HOME/fleeced-private-archive"

# Tool requires a FRESH subfolder for an immutable backup.
node scripts/migrate-fleeced-blobs.mjs backup --dir "$HOME/fleeced-private-archive/backup-2026"
node scripts/migrate-fleeced-blobs.mjs verify --dir "$HOME/fleeced-private-archive/backup-2026"
node scripts/migrate-fleeced-blobs.mjs plan --dir "$HOME/fleeced-private-archive/backup-2026"

# SAFETY HOLD: DO NOT RUN restore while the replacement production scheduled
# publisher is enabled, even though its queue key is currently missing.
# After separate authorized disablement and independent verification ONLY:
# export FLEECED_PRODUCTION_PUBLISHER_DISABLED_CONFIRMED=YES
# node scripts/migrate-fleeced-blobs.mjs restore --dir "$HOME/fleeced-private-archive/backup-2026" --apply

unset FLEECED_OLD_NETLIFY_TOKEN FLEECED_NEW_NETLIFY_TOKEN
```

**Current blocker (browser-verified 2026-10-21):** replacement project production contains an **enabled** `inquirer-publish-scheduled` function. Its scheduled run currently reports a missing `FLEECED_INQUIRER_QUEUE_KEY`, but missing credentials alone do not prove permanent disablement. The recovery tool now **refuses site-wide restoration** unless the publisher has been separately disabled and verified and a local explicit confirmation flag has been set. Do not change `main` or Netlify site settings without the user's specific approval. A backed-up, verified plan can still be prepared safely.

Do NOT run the `restore --apply` command if any key counts, required season or Week 4 baseline, or audit information is unexpectedly missing; report the output first. **Legacy schema compatibility:** The saved October 17 complete Week 4 newsroom reference has 32 unique articles, four reporters, all eight approved desk sections and a six-beat recap, but no `published_locked` field. Original 2026 Weeks 3–4 may predate that flag. The *same canonical validator* is used by migration, the live archive reader and replacement-only publishing preflight: these two historical weeks can qualify with an **absent** lock field only when their exact year, article count/headlines, V31 origin, and Week 4 editorial revision 14/eight-desk/four-reporter/six-beat structure verify. `published_locked:false` is always a rejected draft; Week 5+ always requires `published_locked:true`. The original historical bytes are never rewritten or decorated with synthetic lock values.

Only those **two** original archived objects can ever be restored; Week 5, `broadcasts/index.json`, publication status, reporter archives and all unrelated stores are explicitly excluded. This prevents an old, editorially rejected Week 5 from becoming immutable on the replacement site. The tool fails rather than resetting or replacing any existing key. It also checks destination freshness against the backup snapshot **and stops with zero writes if either Week 3 or Week 4 has a SHA-256 conflict**; it never restores the other week while one is unresolved. Created keys undergo SHA-256 readback verification. No production publishing or Netlify account/project configuration changes are performed.

Keep the private backup folder offline and outside GitHub; it contains sensitive original league files. The tool backs up **the two original source objects plus any existing destination equivalents** to private local files before restore, with per-key SHA-256, metadata and recorded original ETag in manifests. It creates only absent destination keys using `onlyIfNew`; conflict entries are left untouched, not silently reconciled. Because the source and replacement stores may contain different legitimate latest states, conflicts require separate independent review before deciding which side is canonical.

## Acceptance / post-restore

1. Confirm both targeted backup manifests pass SHA-256 verification and contain both original locked Week 3–4 keys; any matching destination keys must also be verified.
2. Confirm old project source data, team/project settings, and production publishing remain unchanged.
3. Confirm only original `broadcasts/2026/week-03.json` and `week-04.json` were created and read-back hashes match. Do NOT transfer an older Week 5 manuscript. After restoring, the canonical publication process will reconcile missing archive/reporter indexes from those locked source editions.
4. On the private PR #402 preview at `/?inquirer_preview=1&preview_week=5`, start **read-only draft** generation and confirm season 2026, **week 5**, 32 team articles, official prior locked Week 4 continuity, and both publication/editorial quality gates passing.
5. Independently read the 32 articles and Weekly Recap for headings, accuracy, repetition, variance and Week 4 voice. Audit Week 5 → Week 6 continuity before considering a production cutover.
6. No merge to `main`, public publication, enabling of `FLEECED_ENABLE_NEW_SITE_PUBLISHER`, project deletion or transfer is authorized by this procedure.

**Important:** a CLI dry run, passing CI simulation, or successfully generated **Week 3** preview is not evidence that Week 5 is restored or independently accepted.
