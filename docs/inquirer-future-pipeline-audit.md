# Fleeced! Inquirer — end-to-end future-week pipeline audit
Audit scope: `player-signal-layer-r1`, PR #390. Baseline: served 2026 Week 4 v19 at `editorial-baselines/2026-week4-v19-served-copy.json`.

## Pipeline map and audited boundaries

1. **Completed-week upstream facts**: Scores, starters, league context, opponent, legal bench swaps, sentiment and projections originate in upstream edition data. The prose layer does not authenticate that data. Published weeks 1–3 remain frozen.
2. **Initial story rebuild**: `rebuildForwardInquirerEditorial` in `inquirer-week4-editorial-rebuild.mjs` clones an edition, runs generic story creation, and calls `restoreReporterNarratives`, which attempts prior-edition deduplication. This improves mechanical freshness but is **not a source of unique, sharp sports journalism**. It can preserve or regenerate generic backup prose.
3. **Fact-based analysis + recap legacy transforms**: `upgradeInquirerAnalysis` in `inquirer-evidence-analysis.mjs` computes evidence; the older character, polish and column passes run on a separate `recapWorkspace`. Only that workspace's league overview returns. This is the critical **single-authoritative-team-writer** guard.
4. **Final article writer**: `finalizeInquirerNarrative` in `inquirer-narrative-final.mjs` is the final team assembly stage. Week 4 maintains individually authored verified notes. For future weeks it can accept `future_editorial_briefs` containing new, score-matched section prose from an upstream author. Missing/mismatched briefs remain structurally incomplete, with a visible unapproved status.
5. **Final recap**: The same finalizer accepts fresh future recap prose per existing recap block, preserving structural identity. A missing complete recap brief is marked incomplete.
6. **Edition readiness**: Future editions carry `editorial_quality.status=HOLD_EDITORIAL_APPROVAL`, along with per-team and recap status; this is **informational** and not yet a live publication-blocking gate.
7. **QA**: `scripts/inquirer-future-quality-gate.mjs` checks required sections, reporter opinion signals, repeated sentences, fan theater, score composition, bench arithmetic and cross-week reuse. `check-inquirer-future-brief-assembly.mjs`, `check-inquirer-future-quality-gate.mjs` and `check-inquirer-pipeline-architecture.mjs` test the checker, actual assembly and single-writer invariants in PR CI. A separate manual acceptance workflow can check a committed future-edition JSON against an accepted earlier JSON.
8. **Publication**: The existing publication path was **not modified**. The new HOLD metadata does **not** prevent that independent path from releasing generic prose. Browser automation remains subject to private Netlify preview access.

## Verified strengths and limits

- Week 4 v19 passes the independent editorial checks, and its served prose is stored as a frozen comparison benchmark. Preserve this baseline; never recycle it as next week's article material.
- The final writer isolates team articles from competing legacy recap writers. The architecture test now fails on removal of that ownership guard.
- Deliberately copied future-week prose and absent editorial elements are tested as failures, not merely counted as informational warnings.
- **Automated humor quality is not proven.** Keywords and length detect missing commentary but not whether a joke is funny, a voice is convincing, or a hot take is earned. An editorial read-through remains mandatory.
- **Source-grounded authoring is still an input contract, not a completed service.** No current step automatically takes verified future matchup facts and creates 32 fresh, original, well-researched sections plus a novel full recap that can be trusted without review.
- **A real upcoming-week payload has not yet passed the new cross-week acceptance check.** CI validates synthetic examples and the Week 4 reference. Do not represent this as a real Week 5 prose pass.
- **Edition acceptance is not release enforcement.** Future operation must explicitly connect quality results, approvals and snapshot retention to the actual release trigger; this requires separate approval to change existing publication behavior.
- **The archived baseline is the prior comparison for Week 5 only.** After each accepted future edition, capture the *actual served text*, all 32 team stories, recap and source revision, and retain older editions for cross-issue joke/argument review.
- **Security and infrastructure**: Private Netlify preview SSO can fail anonymous browser CI with 401. Never disable authentication solely to obtain a green browser job. CI completion must be checked at the latest commit.

## Concrete release acceptance process

1. Produce current completed-week fact snapshot (never assume a pregame projection from retrospective data).
2. Draft 32 unique verified briefs and recap blocks using reporter identity, real matchup stakes, bench legality and new story beats; no copied Week 4 notes.
3. Assemble via the final writer; inspect `editorial_quality`, reject every missing/mismatched article and incomplete recap.
4. Execute cross-week gate with previous *accepted* full-edition JSON. Compare more than one prior week when available for repeated comedy, voice and argument arcs.
5. Inspect **all** served prose (32 team articles and recap) manually for: specific judgment, grounded sarcasm, earned praise, different angles per section, plausible mood calibration, fresh imagined fan theater, reporter distinctions, complete Week 5 opponent outlooks and honest use of numerical facts.
6. Check all applicable GitHub Actions, plus authorized browser acceptance. Resolve failures instead of overriding statuses.
7. Explicit editorial approval and only then an independently authorized publish action. Capture the actual served result as the next immutable benchmark.

## Do not claim as completed

- Automatic high-quality editorial drafting for arbitrary future editions;
- publication gating / approval UI connected to the live release route;
- continuous autonomous human-equivalent humor judgment;
- verification of all future weeks in advance.

This file documents remaining engineering work; adding it does not authorize new production access, merges, scheduled changes or standalone Week 5 publication.

## Production publishing path — critical discovery and feature-branch fix

**Audited routes:** `inquirer-publish-native-scheduled.mjs` (hourly production schedule), `inquirer-publish-scheduled.mjs`, `inquirer-publish-on-load.mjs`, and `inquirer-publish-on-load-background.mjs` all ultimately use `weeklyReport` in `league-hub.mjs`. Previously that function ran the v31 forward editorial composer and its own quality gate, **but bypassed the new `future_editorial_briefs`, `finalizeInquirerNarrative`, and `editorial_quality` release status**. Thus the earlier standalone quality tests were not sufficient to prevent future regression in actual publication.

The PR now adds a `week>4` gate **inside `weeklyReport`, after the existing v31 generation and sentiment fix but before final quality checks and `s.setJSON(key,...)`**:

1. Load a week-scoped, server-side authored manifest from Netlify Blobs, key `editorial-briefs/{season}/week-{WW}.json`.
2. Feed the manifest into the single authoritative `finalizeInquirerNarrative` writer. The writer checks score, next opponent, reporter and all prose sections; the recap requires every desk.
3. Run `evaluateFutureEditorialRelease` against the assembled 32 articles, recap and previously locked edition, including source-score anchoring, fan mood/theater, substantive hot-take sections, opinionated reporter profile, duplicate-stat checks and cross-week recycled sentences. A failure throws an explicit editorial HOLD and **does not write the new broadcast**.
4. Remove the private authored manifest from the public broadcast payload, retaining only diagnostic `editorial_release_audit`.
5. Continue the existing v31 structural QA, Sleeper fact reconciliation, published integrity and awards/persistence checks.

The **existing `INQUIRER_APPROVED_THROUGH_WEEK` permission gate is not changed**, and the new guard only applies to weeks greater than 4. Weeks 1–3 remain untouched; Week 4 uses the accepted, frozen source. Production cannot receive the PR changes until an authorized merge/deploy.

**Important operational dependency:** There is not yet a complete trusted authoring/staging service that produces and deposits 32 individually researched prose briefs plus league recap at this Blob key. The new production guard intentionally **holds** future publication if they are absent. Before advancing the approved-through week, arrange a secure editorial staging process that captures completed-week facts, drafts and checks original journalism, stores the reviewed manifest, and runs the real candidate acceptance job. Never bypass the gate by populating boilerplate arrays or weaken it to a warning.

**Trust limit:** The manifest is loaded from server-side storage, not from a browser; however, the guard establishes only structural/source and anti-repetition checks, not perfect fact checking or objective humor quality. The existing publication approval must still represent a genuine, human-reviewed release decision.

The architecture CI now checks the actual `weeklyReport` publisher path (not only the standalone Week 4 fast preview). Synthetic release-guard tests are read-only. A live authorized full future-week dry run and Netlify-authenticated browser check remain outstanding, and must be completed before extending public approval.

### Explicit editorial sign-off in trusted brief manifest

In addition to the existing `INQUIRER_APPROVED_THROUGH_WEEK` environment control, a future-week Blob manifest must contain `editorial_approval: {approved:true, season:2026, week:5, reviewed_by:'<named reviewer>', reviewed_at:'<valid ISO timestamp>'}` with the actual corresponding season/week. The production publication guard refuses unsigned or incorrectly scoped manifests; it does not expose the reviewer identity in the persisted public broadcast. Sign-off is documentary evidence of a human editorial review, not an automated guarantee that the joke quality is good. A manifest cannot override source facts, publication approval or security permissions.

## Fact packet generator for future newsroom assignments

When a completed future-week *candidate* JSON and the last accepted edition JSON are securely available, run:

`node scripts/inquirer-prep-future-editorial.mjs candidate.json editorial-baselines/2026-week4-v19-served-copy.json > briefing-packet.json`

The packet contains reporter identities and voice guidance, verified completed scores, relevant starter scores, legal bench-decision evidence, mood, next matchup, and last issue's prose for comparison. It also contains a draft `draft_manifest` with all 32 team entries, every recap desk, and **intentionally blank prose arrays and `editorial_approval.approved=false`**. Do not deposit that placeholder as an approved manuscript. A source-grounded author/editor must write original copy and review the whole edition before depositing the completed manifest securely at `editorial-briefs/{season}/week-{WW}.json` in the existing strong-consistency Netlify Blob store.

**Operational implementation (PR only):** `inquirer-draft-candidate.mjs` now provides a POST-only, server-write-token-authorized fact-first draft export. It calls `weeklyReport(req,{draftOnly:true})` to bypass the public approved-week limit for a *completed* week only. This suppresses the old-awards self-heal, disables manager-history cache writes, and returns before any broadcast, awards, reporter-archive or index write. Requests are denied in read-only deploy previews. It returns `editorial_quality.status='UNREVIEWED_DRAFT'`, and it never creates/approves a manuscript or publishes an edition. Obtain the candidate through a controlled offline or trusted admin workflow. Do not bypass `INQUIRER_APPROVED_THROUGH_WEEK`, open preview authentication, or run `weeklyReport` with live publishing authorization merely to produce a draft. A secure draft-only path needs separate threat-modeling, testing and approval before use.

## Second full-path audit — systematic concern register (2026-10-14)

This register follows the actual source→editorial→storage→reading path, not only the Week 4 preview. **A code change being committed is not proof of deployment or passing end-to-end verification.**

| Priority | Component / threat | Finding | State / action |
| --- | --- | --- | --- |
| Critical | Actual publish path | Scheduled and authorized on-load functions share `weeklyReport`, previously bypassing future single-writer / new QA | **PR fixed:** enforced before `s.setJSON`; confirm CI and live authorized dry run |
| Critical | Unreviewed generic stories | v31 can produce generic prose if no fresh editorial input exists | **PR fixed:** missing trusted fresh manifest blocks future persistence, rather than approving the fallback |
| Critical | Manuscript source | No secure system yet produces 32 original authored briefs and league recap | **OPEN:** controlled draft-only data/manifest staging + human editing process required |
| Critical | Publication approval | Existing `INQUIRER_APPROVED_THROUGH_WEEK` is separate from manuscript approval | **PR fixed:** additional trusted human review attestation; both conditions required; do not advance approval prematurely |
| High | Approval drift | A reviewer timestamp/name could survive edits to reviewed manuscripts | **PR fixed:** `content_sha256` must match exact stored prose manifest; recalculate and reapprove after changes |
| High | Missing prior edition | No previous complete edition meant originality checks could silently do nothing | **PR fixed:** require immediately prior accepted full 32-team edition, same season and week-1 |
| High | Malformed manifest | Broad object check accepted non-object team dictionaries | **PR fixed:** strictly reject absent/array/malformed manifests before final writer |
| High | Missing team articles | Final writer skips teams with incomplete structured facts or missing article | **Mitigated:** all 32 verified briefs and editor statuses mandatory; any skipped team triggers HOLD; underlying data feed still needs a targeted full-coverage test |
| High | Reporter personality | A high word count could hide all teams using one reporter or purely statistical narration | **PR fixed in QA:** require four distinct reporter voices and block extreme opinion collapse; **OPEN:** natural variety and humor still need human assessment |
| High | Weekly Recap | Correct six-section structure could still hold recycled commentary | **PR fixed:** all recap desks present, distinct repeated commentary fails, prior-week recap reuse fails; manual league-wide editorial pass remains |
| High | Factual direction | Bench decision direction and score label can be reversed even with plausible numbers | **Partially mitigated:** arithmetical source checks + score anchors; **OPEN:** contextual direction and eligibility require stronger source-driven semantic review |
| High | Prior edition preservation | Week 4 prose is frozen as served v19 evidence, not reusable prose source | **Existing baseline saved:** protect archived release from prose mutations, capture next accepted served edition |
| High | Authenticated preview tests | Netlify SSO 401 can block anonymous browser acceptance | **OPEN:** do not weaken authentication; configure authorized CI session or report limitation |
| High | Actual release simulation | Synthetic QA tests are not complete scheduled-reader-storage integration | **OPEN:** perform authenticated dry-run of a complete future edition without persisted publication |
| Medium | Outlook quality | Merely naming next opponent does not make a compelling forward story | **Partial:** minimum detail and opponent checks; human read-through mandatory |
| Medium | Fan scenes | Fiction indicator and prop presence do not prove funny/specific/confidence-calibrated scene | **Partial:** mood number / scene / opinion checks; editorial human sign-off mandatory |
| Medium | Cross-week joke semantics | Lexical similarity catches exact/near-copy but not paraphrased generic arguments | **OPEN:** human comparison against Week 4 and several previous editions; optional future semantic reviewer with conservative flags |
| Medium | Manifest staging integrity | Data and reviewed text must stay provenance-bound throughout edit and release | **Partial:** trusted Blob manifest and digest; **OPEN:** secure submission permissions and audit trail for reviewer are not implemented |
| Medium | Future-year continuity | A hardcoded 2026 Week 4 baseline must not be used as immediate prior for 2027 | **Gate requires immediate previous week:** create year-specific accepted baselines with properly-scoped seasons |
| Medium | Performance and retries | Failure after editorial manifest loading must never produce a partial broadcast; races / retries may re-enter | **Current guard pre-persistence;** existing persistence uses lock/key and fact reconciliation; **OPEN:** concurrent publisher idempotence audit with real Blob locks |
| Medium | Awards/ancillaries | Weekly awards generated after editorial acceptance; may fail independently | **Existing integrity checks:** verify awards and reporter archives in staging; do not collapse their errors into editorial passes |

### Sign-off digest contract

Approved manuscripts at `editorial-briefs/{season}/week-{WW}.json` require:

`editorial_approval: {approved:true, season, week, reviewed_by, reviewed_at, content_sha256}`

The SHA-256 is computed from `JSON.stringify({season,week,teams,recap})` of the **same actual manifest object**. Use exactly the same object key order defined by the staging producer; the hash is sensitive to serialized key order. Prefer invoking `editorialManifestDigest` from `inquirer-future-release-guard.mjs` in the trusted editor workflow, not reimplementing serialization or copying another week's digest. This checksum protects against accidental drift, not a cryptographic signature or guarantee of independent editorial judgment.

### Priority order before declaring future production ready

1. Pass newest newsroom, live Week 4, forward freshness, player score, facts, and security CI checks. Resolve preview-auth browser coverage.
2. Build and security-review a **draft-only** server-side fact packet and manuscript staging path (no publishing side effects); test how it obtains actual completed matchup data.
3. Draft one full *unpublished* candidate edition from verified facts, review all 32 team stories and six recap desks for grounded sarcasm, distinct columnist voices, unique arguments and new jokes, and compare to the accepted prior issue.
4. Submit a trusted source-bound manuscript and human review attestation, confirm digest, run end-to-end release guard **without persisting a broadcast**.
5. Audit concurrent publish attempts, retry behavior and post-acceptance archived text consistency.
6. Only after all green and explicit authorization, consider advancing the approved week and merge/deploy.

No editor, script or assistant may claim these OPEN items complete because structural CI passed.

### Reviewed-manuscript checksum procedure

After finishing and independently reviewing all 32 articles and six Weekly Recap desks, invoke `node scripts/inquirer-manifest-digest.mjs reviewed-manifest.json`. It reports the exact content SHA-256 required in `editorial_approval.content_sha256`, without editing the manuscript or granting approval. A person authorized to stage the reviewed manifest must explicitly set and verify the approval fields and securely deliver the exact reviewed content to the server-side Blob key. Re-run the digest and editorial review if the manuscript changes. Do not confuse a checksum with a cryptographic signature, authorization, or proof of humor quality.

**Draft API security**: The production-restricted route requires the existing `isAuthorizedWrite` server-only bearer authorization, POST, and a non-preview deployment. Keep tokens out of browser JS, public responses and logs. It must be checked through an authorized test to ensure helper calls remain read-only; the static architecture CI verifies known write sites but cannot prove all future helper modifications are side-effect free. Do not expose this route anonymously. Use its returned JSON as the candidate input to `scripts/inquirer-prep-future-editorial.mjs`, alongside the last accepted complete edition. The secure *approved manuscript upload* step remains an administrative Blob operation, not a public browser action.

## Mandatory Netlify account migration and rollback

A Netlify account switch is a **data migration**, not just a redeployment. Netlify Blobs namespaces, site IDs, team associations, environment variables, custom domains, passwords, schedules and SSO may change. GitHub source and the frozen Week 4 benchmark remain in Git; **private site Blob contents do not automatically move**.

1. Keep the old site available and halt future release approval during the change. Record the source/destination site IDs securely. Export an inventory of all Blob keys (not just the current-week edition) and retain source-to-backup object hashes. Inventory broadcasts, indexes, reporter archives, league overview, awards, manager caches and any future trusted editorial-brief blobs. Preserve approval metadata and manuscript digests. Do not put server secrets or privileged unapproved manuscripts in a public repository.
2. Create a verified independent backup of the actual Netlify Blob data, preferably encrypted off-site or in an access-controlled private GitHub repository. The Week 4 accepted prose baseline is a comparison reference, **not** a substitute for the full Blob backup.
3. Provision a destination site with regenerated account-specific credentials, private deployment rules, production site identity and correct scheduled functions. Rotate the server-write token. Do not copy credentials into Git source or public CI logs.
4. Keep the destination writer disabled during import. Restore the exported Blob objects, independently verify their SHA-256 content hashes and counts, then compare reporter archives, release approvals and accepted articles. Confirm the destination's complete immediately prior edition is available for the new writer.
5. Update any **explicit old-site identity assumptions** after validating the destination. The existing browser-CI site ID and name in preview-read-only.mjs are security-sensitive and must remain isolated from the destination production site.
6. Test the fully restored destination using the published historical integrity and editorial gates, authorized browser tests, source-data reconciliation and a dry-run of draft-only candidate generation. The old and new sites must not simultaneously act as production publisher.
7. Only after approval and complete data verification, switch the production domain/schedules; keep the source site read-only for a rollback interval and verify again after cutover. Document a rollback path before enabling writes.

Migration MUST fail closed on missing data, hash mismatch, or lost approvals. No account switching, live export/import, credential access or production deployment is authorized by this runbook. The current Netlify connector is unavailable, so this is a procedural control until actual migration testing can be performed.

### Account-switch audit: separate fantasy Value History data

Fleeced! uses a second Netlify Blob store, fll-value-history-v2, distinct from the Inquirer store fleeced-league-hub. The GitHub value-history-data branch archives historical snapshots, but the live unarchived Netlify data must also be exported and validated. Do not assume a complete Inquirer migration preserves team/player Value History.

The value-history archival GitHub workflow now supports an optional repository variable NETLIFY_PRODUCTION_SITE_ID to override its pinned source-site identity after an authorized migration. Its existing fallback remains unchanged until an operator deliberately configures the new destination. Rotate secrets, validate the destination site and branch and confirm snapshots continue updating on the GitHub archival branch. Other value-history scripts can also contain old Netlify site ID or URL defaults; audit all before decommissioning the old account.

The offline compare-inquirer-netlify-migrations.mjs tool verifies exported source and restored destination Blob inventories match by key, byte length and SHA-256. It does not perform online exports/imports or switch accounts. Preserve drafts and their approval state; do not automatically approve them during migration.

### Reproducible offline migration inventories

Once an operator has securely exported all JSON Blob objects into a local bundle directory under `objects/<exact-blob-key>`, run `node scripts/build-inquirer-netlify-migration-manifest.mjs <bundle-dir> <source-site-id> <destination-site-id>`. This creates a non-overwriting inventory containing Blob keys, original bytes, and SHA-256 hashes. Then run `node scripts/check-inquirer-netlify-migration-bundle.mjs <bundle-dir>` to validate it. Repeat independently for the destination and compare both with `node scripts/compare-inquirer-netlify-migrations.mjs <source-bundle-dir> <destination-bundle-dir>`. It must be a complete export, including indexes, previous reports, award/manager caches and the separate Value History store in its own export/inventory process. The builder only inventories files an operator has already exported. **It does not contact Netlify and cannot guarantee completeness**, and the `source_frozen` flag is an operator attestation that must be independently established. Never upload private backup objects or authorization tokens into a public GitHub repo.
