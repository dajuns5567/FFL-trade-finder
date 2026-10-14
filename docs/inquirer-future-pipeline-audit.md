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
